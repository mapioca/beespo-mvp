"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getClientIp } from "@/lib/security/request-ip";
import { checkRateLimit } from "@/lib/rate-limiter";
import {
    readPendingSignupCookie,
    setPendingSignupCookie,
} from "@/lib/auth/pending-signup-cookie";

export type ChangePendingSignupEmailResult =
    | { ok: true; newEmail: string }
    | { ok: false; error: string };

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

export async function changePendingSignupEmailAction({
    newEmail,
}: {
    newEmail: string;
}): Promise<ChangePendingSignupEmailResult> {
    const ip = await getClientIp();
    const normalized = normalizeEmail(newEmail);

    if (!normalized.includes("@") || normalized.length > 254) {
        return { ok: false, error: "Please enter a valid email address." };
    }

    const ipLimit = await checkRateLimit(
        `auth:change-pending-email:ip:${ip}`,
        3,
        10 * 60_000
    );
    if (!ipLimit.allowed) {
        return {
            ok: false,
            error: "Too many email changes. Please wait a few minutes and try again.",
        };
    }

    const userId = await readPendingSignupCookie();
    if (!userId) {
        return {
            ok: false,
            error: "Your signup session has expired. Please start over.",
        };
    }

    const admin = createAdminClient();
    const { data: getData, error: getErr } = await admin.auth.admin.getUserById(userId);
    if (getErr || !getData?.user) {
        return {
            ok: false,
            error: "We couldn't find your pending signup. Please start over.",
        };
    }
    const user = getData.user;

    if (user.email_confirmed_at) {
        return {
            ok: false,
            error: "This account is already confirmed. You can sign in instead.",
        };
    }
    if (user.email?.toLowerCase() === normalized) {
        return {
            ok: false,
            error: "That's the same email you're already using.",
        };
    }

    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
        email: normalized,
    });
    if (updateErr) {
        const msg = updateErr.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            return {
                ok: false,
                error: "That email is already in use. Try another address.",
            };
        }
        return { ok: false, error: "Couldn't update your email. Please try again." };
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const supabase = await createClient();
    await supabase.auth.resend({
        type: "signup",
        email: normalized,
        options: { emailRedirectTo: `${baseUrl}/auth/confirm` },
    });

    await setPendingSignupCookie(userId);

    return { ok: true, newEmail: normalized };
}
