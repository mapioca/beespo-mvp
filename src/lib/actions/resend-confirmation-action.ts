"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/request-ip";
import { checkRateLimit } from "@/lib/rate-limiter";

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export type ResendResult =
    | { ok: true }
    | { ok: false; error: string; retryAfterSec?: number };

/**
 * Resends the signup confirmation email. Always returns { ok: true } on the
 * happy path or when the email doesn't exist (enumeration defense). Returns
 * an error only on rate-limit hits, since the UI uses a 60s cooldown anyway
 * and the user explicitly clicked.
 */
export async function resendConfirmationAction({
    email,
}: {
    email: string;
}): Promise<ResendResult> {
    const ip = await getClientIp();
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail.includes("@") || normalizedEmail.length > 254) {
        return { ok: false, error: "Invalid email address." };
    }

    // Per-IP: 5 resends per minute (covers users with many tabs or bad networks)
    const ipLimit = await checkRateLimit(`auth:resend:ip:${ip}`, 5, 60_000);
    if (!ipLimit.allowed) {
        return {
            ok: false,
            error: "Too many requests. Please wait a minute and try again.",
        };
    }

    // Per-email: 1 resend per 60s, max 5 per hour. Aligns with the UI cooldown.
    const cooldown = await checkRateLimit(
        `auth:resend:email:cooldown:${normalizedEmail}`,
        1,
        60_000
    );
    if (!cooldown.allowed) {
        return {
            ok: false,
            error: "Please wait a moment before requesting another email.",
            retryAfterSec: 60,
        };
    }
    const hourly = await checkRateLimit(
        `auth:resend:email:hourly:${normalizedEmail}`,
        5,
        60 * 60_000
    );
    if (!hourly.allowed) {
        return {
            ok: false,
            error: "Too many resend attempts. Please try again later.",
        };
    }

    const supabase = await createClient();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
            emailRedirectTo: `${baseUrl}/auth/confirm`,
        },
    });

    // Swallow errors that would reveal whether the address exists or is
    // already confirmed. The UI shows the same "sent" state either way.
    if (error && process.env.NODE_ENV !== "production") {
        console.warn(
            "[resendConfirmationAction] resend error (suppressed):",
            error.message
        );
    }

    return { ok: true };
}
