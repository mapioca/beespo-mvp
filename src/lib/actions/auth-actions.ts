"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/email/resend";
import {
    getResetPasswordEmailHtml,
    getFailedLoginNoticeHtml,
} from "@/lib/email/templates";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getClientIp, getUserAgent } from "@/lib/security/request-ip";
import { logSecurityEvent } from "@/lib/security/audit-log";
import { checkRateLimit } from "@/lib/rate-limiter";
import { checkTrustedDevice } from "@/lib/mfa";
import { redirect } from "next/navigation";

const GENERIC_AUTH_ERROR =
    "Invalid email or password. Please try again.";
const GENERIC_RATE_LIMIT_ERROR =
    "Too many attempts. Please wait a minute and try again.";
const GENERIC_CHALLENGE_ERROR =
    "Could not verify the security challenge. Please refresh and try again.";

function safeInternalPath(pathname: string | null | undefined, fallback: string) {
    if (!pathname) return fallback;
    if (!pathname.startsWith("/")) return fallback;
    if (pathname.startsWith("//")) return fallback;
    if (pathname.startsWith("/\\")) return fallback;
    return pathname;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

/**
 * Threshold of failed sign-ins within `FAILURE_WINDOW_MS` that triggers the
 * "suspicious sign-in attempts" email. Set high enough that a frustrated
 * user typing the wrong password once or twice does NOT receive an alert.
 */
const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 60 * 60_000; // 1 hour
const NOTICE_DEBOUNCE_MS = 60 * 60_000; // at most 1 email per hour per address

/**
 * Record a failed sign-in attempt and, if a burst threshold is crossed, send
 * the address-of-record a security notice. Both the burst counter and the
 * email send are debounced via Upstash so we never spam the legitimate user.
 *
 * Counters are bucketed per-email (not per-IP) — a slow attacker rotating IPs
 * still trips the burst threshold; a single user fat-fingering once does not.
 *
 * Successful logins do NOT consume from this counter, so a power user logging
 * in many times in a short window will never trigger the notice.
 *
 * Errors are swallowed; this must never block login.
 */
async function maybeNotifyFailedLoginBurst(email: string, ip: string): Promise<void> {
    try {
        // Burst counter: every failure consumes one slot. The 4th failure in
        // FAILURE_WINDOW_MS returns allowed=false, our cue that the threshold
        // has been crossed.
        const burst = await checkRateLimit(
            `auth:fail-burst:${email}`,
            FAILURE_THRESHOLD,
            FAILURE_WINDOW_MS
        );
        if (burst.allowed) return; // still under threshold — do nothing

        // Debounce email sends: even if many failures come in after the
        // threshold trips, send at most one notice per hour per address.
        const debounce = await checkRateLimit(
            `auth:notice:email:${email}`,
            1,
            NOTICE_DEBOUNCE_MS
        );
        if (!debounce.allowed) return;

        if (!resend) {
            console.warn(
                "[auth] failed-login notice skipped — Resend not initialized"
            );
            return;
        }

        await resend.emails.send({
            from: "Beespo Security <noreply@beespo.com>",
            to: email,
            subject: "Suspicious sign-in attempts on your Beespo account",
            html: getFailedLoginNoticeHtml(email, ip),
        });
    } catch (err) {
        console.error("[auth] failed to send failed-login notice", err);
    }
}

// ── Sign out ───────────────────────────────────────────────────────────────

export async function signOutAction() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);
    void logSecurityEvent({
        eventType: "auth.signout",
        outcome: "success",
        actorUserId: user?.id ?? null,
        ipAddress: ip,
        userAgent: ua,
    });
    await supabase.auth.signOut();
    redirect("/login");
}

// ── Sign in ────────────────────────────────────────────────────────────────

interface LoginInput {
    email: string;
    password: string;
    turnstileToken: string | null;
    redirectTo?: string | null;
    useTemplateId?: string | null;
}

export type LoginResult =
    | { ok: true; redirectTo: string }
    | { ok: false; error: string; code?: "email_not_confirmed" };

/**
 * Server-side sign-in. Wraps Supabase auth with:
 *   - Turnstile token verification
 *   - Two-axis rate limiting (per IP and per email)
 *   - Profile / soft-delete / MFA routing
 *   - Generic error messages to defeat email enumeration
 */
export async function loginAction({
    email,
    password,
    turnstileToken,
    redirectTo,
    useTemplateId,
}: LoginInput): Promise<LoginResult> {
    const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);
    const normalizedEmail = normalizeEmail(email);

    // 1. Turnstile
    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
        void logSecurityEvent({
            eventType: "auth.signin.turnstile_failed",
            outcome: "failure",
            targetEmail: normalizedEmail,
            ipAddress: ip,
            userAgent: ua,
        });
        return { ok: false, error: GENERIC_CHALLENGE_ERROR };
    }

    // 2. Rate limit per IP (volumetric) AND per email (targeted credential stuffing)
    const ipLimit = await checkRateLimit(`auth:login:ip:${ip}`, 10, 60_000);
    if (!ipLimit.allowed) {
        void logSecurityEvent({
            eventType: "auth.signin.rate_limited",
            outcome: "denied",
            targetEmail: normalizedEmail,
            ipAddress: ip,
            userAgent: ua,
            details: { axis: "ip" },
        });
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR };
    }
    const emailLimit = await checkRateLimit(
        `auth:login:email:${normalizedEmail}`,
        5,
        15 * 60_000 // 5 attempts per 15 minutes per email (any IP)
    );
    if (!emailLimit.allowed) {
        void logSecurityEvent({
            eventType: "auth.signin.rate_limited",
            outcome: "denied",
            targetEmail: normalizedEmail,
            ipAddress: ip,
            userAgent: ua,
            details: { axis: "email" },
        });
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR };
    }

    // 3. Authenticate
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
    });

    if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
            void logSecurityEvent({
                eventType: "auth.signin.email_not_confirmed",
                outcome: "failure",
                targetEmail: normalizedEmail,
                ipAddress: ip,
                userAgent: ua,
            });
            return {
                ok: false,
                error: "Please confirm your email address before signing in.",
                code: "email_not_confirmed",
            };
        }
        // Track this failure. If it pushes the address past FAILURE_THRESHOLD
        // within FAILURE_WINDOW_MS, the helper sends a one-per-hour notice
        // to the address. A single typo will not trigger anything.
        void maybeNotifyFailedLoginBurst(normalizedEmail, ip);
        void logSecurityEvent({
            eventType: "auth.signin.failure",
            outcome: "failure",
            targetEmail: normalizedEmail,
            ipAddress: ip,
            userAgent: ua,
        });
        return { ok: false, error: GENERIC_AUTH_ERROR };
    }
    if (!data.user) {
        void maybeNotifyFailedLoginBurst(normalizedEmail, ip);
        void logSecurityEvent({
            eventType: "auth.signin.failure",
            outcome: "failure",
            targetEmail: normalizedEmail,
            ipAddress: ip,
            userAgent: ua,
        });
        return { ok: false, error: GENERIC_AUTH_ERROR };
    }

    void logSecurityEvent({
        eventType: "auth.signin.success",
        outcome: "success",
        actorUserId: data.user.id,
        targetEmail: normalizedEmail,
        ipAddress: ip,
        userAgent: ua,
    });

    // 4. Profile / soft-delete / onboarding gates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("id, workspace_id, is_deleted")
        .eq("id", data.user.id)
        .single();

    if (profile?.is_deleted) {
        await supabase.auth.signOut({ scope: "local" });
        return { ok: false, error: GENERIC_AUTH_ERROR };
    }

    if (!profile) {
        return { ok: true, redirectTo: "/onboarding" };
    }

    if (!profile.workspace_id) {
        return { ok: true, redirectTo: "/onboarding" };
    }

    // 5. MFA AAL check — honor "remember this device" cookie if it's still
    // valid for this user. Without this, a trusted browser would still be
    // forced through /mfa/verify on every fresh login.
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2") {
        const isTrusted = await checkTrustedDevice(data.user.id);
        if (!isTrusted) {
            return { ok: true, redirectTo: "/mfa/verify" };
        }
    }

    // 6. Pick destination
    const safeRedirect = safeInternalPath(redirectTo, "/library");
    if (useTemplateId && useTemplateId.length > 0) {
        const importUrl = `/library/import?use=${encodeURIComponent(
            useTemplateId
        )}&redirect=${encodeURIComponent(safeRedirect)}`;
        return { ok: true, redirectTo: importUrl };
    }
    if (redirectTo) {
        return { ok: true, redirectTo: safeRedirect };
    }
    return { ok: true, redirectTo: "/dashboard" };
}

// ── Forgot password ────────────────────────────────────────────────────────

interface ForgotPasswordInput {
    email: string;
    turnstileToken: string | null;
}

/**
 * Generates a recovery link and emails it. Always returns success regardless of
 * whether the email exists in our system (defeats account enumeration).
 */
export async function forgotPasswordAction({
    email,
    turnstileToken,
}: ForgotPasswordInput): Promise<{ ok: true } | { ok: false; error: string }> {
    const ip = await getClientIp();
    const normalizedEmail = normalizeEmail(email);

    // Turnstile
    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
        return { ok: false, error: GENERIC_CHALLENGE_ERROR };
    }

    // Rate limit (forgot-password is a free email-send; tight limits)
    const ipLimit = await checkRateLimit(`auth:forgot:ip:${ip}`, 5, 60_000);
    if (!ipLimit.allowed) {
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR };
    }
    const emailLimit = await checkRateLimit(
        `auth:forgot:email:${normalizedEmail}`,
        3,
        60 * 60_000 // 3 password-reset emails per hour per address
    );
    if (!emailLimit.allowed) {
        // Still return success to avoid enumeration via timing.
        return { ok: true };
    }

    const supabaseAdmin = createAdminClient();
    const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: {
            redirectTo: `${origin}/reset-password`,
        },
    });

    // If the address isn't registered, generateLink returns an error. We
    // intentionally swallow it and return success — the user sees the same
    // "check your email" UX whether or not the address exists.
    if (error) {
        if (process.env.NODE_ENV !== "production") {
            console.warn(
                "[forgotPasswordAction] generateLink error (suppressed for enumeration defense):",
                error.message
            );
        }
        return { ok: true };
    }
    if (!data.properties?.action_link) {
        return { ok: true };
    }

    if (resend) {
        try {
            await resend.emails.send({
                from: "Beespo <noreply@beespo.com>",
                to: normalizedEmail,
                subject: "Reset your password",
                html: getResetPasswordEmailHtml(
                    data.properties.action_link,
                    normalizedEmail
                ),
            });
        } catch (emailError) {
            console.error("[forgotPasswordAction] resend send error", emailError);
            // Even on send failure, return success — we don't want to leak that
            // the address exists via a different error path.
            return { ok: true };
        }
    } else {
        console.warn(
            "[forgotPasswordAction] Resend not initialized; recovery email not sent"
        );
    }

    return { ok: true };
}
