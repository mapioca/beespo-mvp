"use server";

import { createClient } from "@/lib/supabase/server";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { getClientIp } from "@/lib/security/request-ip";
import { checkRateLimit } from "@/lib/rate-limiter";
import { setPendingSignupCookie } from "@/lib/auth/pending-signup-cookie";

const GENERIC_RATE_LIMIT_ERROR =
    "Too many attempts. Please wait a minute and try again.";
const GENERIC_CHALLENGE_ERROR =
    "Could not verify the security challenge. Please refresh and try again.";

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

interface SignupInput {
    email: string;
    password: string;
    fullName: string;
    turnstileToken: string | null;
    /** When the user came in through a workspace invitation link. */
    workspaceInvitationToken?: string | null;
    /** When the user was already validated against the platform invite code. */
    platformInvitationId?: string | null;
}

export type SignupResult =
    | {
        ok: true;
        /** True when Supabase requires the user to click the email link. */
        needsEmailConfirmation: boolean;
        /** Empty string when the signup was a no-op for an existing address. */
        userId: string;
    }
    | {
        ok: false;
        error: string;
        code?: "challenge_failed" | "rate_limited";
    };

/**
 * Server-side signup. Mirrors loginAction's protections plus the invite-flow
 * specifics (workspace invitation token vs. consumed platform invite ID).
 *
 * Account-enumeration defense: when the email is already registered, we return
 * the same `{ ok: true, needsEmailConfirmation: true }` shape as a fresh
 * signup. The legitimate owner of an existing address sees the same UI a
 * fresh signup would. They learn nothing about whether the address exists
 * until they try to actually sign in (which has its own protections).
 */
export async function signupAction({
    email,
    password,
    fullName,
    turnstileToken,
    workspaceInvitationToken,
    platformInvitationId,
}: SignupInput): Promise<SignupResult> {
    const ip = await getClientIp();
    const normalizedEmail = normalizeEmail(email);

    // 1. Turnstile
    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
        return { ok: false, error: GENERIC_CHALLENGE_ERROR, code: "challenge_failed" };
    }

    // 2. Rate limits (per IP and per email)
    const ipLimit = await checkRateLimit(`auth:signup:ip:${ip}`, 5, 60_000);
    if (!ipLimit.allowed) {
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR, code: "rate_limited" };
    }
    const emailLimit = await checkRateLimit(
        `auth:signup:email:${normalizedEmail}`,
        3,
        60 * 60_000 // 3 signup attempts per hour per email
    );
    if (!emailLimit.allowed) {
        return { ok: false, error: GENERIC_RATE_LIMIT_ERROR, code: "rate_limited" };
    }

    // 3. Cheap input validation (defense in depth — UI also validates)
    if (!normalizedEmail.includes("@") || normalizedEmail.length > 254) {
        return { ok: false, error: "Invalid email address." };
    }
    if (password.length < 8) {
        return { ok: false, error: "Password must be at least 8 characters." };
    }
    if (!fullName || fullName.trim().length < 1 || fullName.length > 200) {
        return { ok: false, error: "Please provide your full name." };
    }

    // 4. Build user metadata for the invite flow
    const userMetadata: Record<string, string> = {
        full_name: fullName.trim(),
    };
    if (workspaceInvitationToken) {
        userMetadata.workspace_invitation_token = workspaceInvitationToken;
    } else if (platformInvitationId) {
        userMetadata.platform_invitation_id = platformInvitationId;
    }

    // 5. Sign up
    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            data: userMetadata,
            emailRedirectTo: `${baseUrl}/auth/confirm`,
        },
    });

    if (error) {
        if (
            error.message.toLowerCase().includes("already registered") ||
            error.message.toLowerCase().includes("already been registered")
        ) {
            // Enumeration defense: pretend the signup succeeded and ask the
            // user to check their email. The legitimate owner of the address
            // can use forgot-password if they've forgotten they have an
            // account. An attacker probing for valid emails learns nothing.
            return { ok: true, needsEmailConfirmation: true, userId: "" };
        }
        return { ok: false, error: error.message };
    }

    if (!data.user) {
        return { ok: false, error: "Signup failed. Please try again." };
    }

    // Email confirmation required when identities is empty (Supabase's own
    // existing-user defense — same response shape regardless of whether the
    // address exists)
    const needsEmailConfirmation =
        data.user.identities?.length === 0 || !data.user.email_confirmed_at;

    // Short-lived signed cookie that authorizes the same browser to edit the
    // pending signup (used by the /check-email "Change email" affordance).
    if (needsEmailConfirmation) {
        await setPendingSignupCookie(data.user.id);
    }

    return { ok: true, needsEmailConfirmation, userId: data.user.id };
}
