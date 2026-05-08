"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resend } from "@/lib/email/resend";
import {
    getResetPasswordEmailHtml,
    getFailedLoginNoticeHtml,
} from "@/lib/email/templates";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getClientIp } from "@/lib/security/request-ip";
import { checkRateLimit } from "@/lib/rate-limiter";
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
 * Fire-and-forget security notice when failed sign-ins are accumulating against
 * an email. Uses Upstash as a 1-per-hour debounce so a sustained attack doesn't
 * spam the legitimate user. Errors are swallowed — this must never block login.
 */
async function notifyFailedLoginBurst(email: string, ip: string): Promise<void> {
    try {
        const debounce = await checkRateLimit(
            `auth:notice:email:${email}`,
            1,
            60 * 60_000 // 1 notice per hour per address
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
    await supabase.auth.signOut();
    redirect("/login");
}

// ── Sign in ────────────────────────────────────────────────────────────────

interface LoginInput {
    email: string;
    password: string;
    turnstileToken: string;
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
    const ip = await getClientIp();
    const normalizedEmail = normalizeEmail(email);

    // 1. Turnstile
    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
        return { ok: false, error: GENERIC_CHALLENGE_ERROR };
    }

    // 2. Rate limit per IP (volumetric) AND per email (targeted credential stuffing)
    const ipLimit = await checkRateLimit(`auth:login:ip:${ip}`, 10, 60_000);
    if (!ipLimit.allowed) {
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR };
    }
    const emailLimit = await checkRateLimit(
        `auth:login:email:${normalizedEmail}`,
        5,
        15 * 60_000 // 5 attempts per 15 minutes per email (any IP)
    );
    if (!emailLimit.allowed) {
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
            return {
                ok: false,
                error: "Please confirm your email address before signing in.",
                code: "email_not_confirmed",
            };
        }
        // Heads-up to the legitimate owner that someone is trying. Debounced
        // to one email per hour and run async so it never blocks the response.
        void notifyFailedLoginBurst(normalizedEmail, ip);
        return { ok: false, error: GENERIC_AUTH_ERROR };
    }
    if (!data.user) {
        void notifyFailedLoginBurst(normalizedEmail, ip);
        return { ok: false, error: GENERIC_AUTH_ERROR };
    }

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

    // 5. MFA AAL check
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === "aal2" && aalData?.currentLevel !== "aal2") {
        return { ok: true, redirectTo: "/mfa/verify" };
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
    turnstileToken: string;
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
