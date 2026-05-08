/**
 * Cloudflare Turnstile server-side verification.
 *
 * Flow:
 *   1. Browser renders the Turnstile widget with NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 *   2. User passes the (often invisible) challenge; widget hands the form a one-time token.
 *   3. Form submits the token to our server (action / API route).
 *   4. Server posts the token + TURNSTILE_SECRET_KEY here, gets back a yes/no.
 *
 * Tokens are single-use and short-lived (5 minutes); replay-resistant by design.
 *
 * Reference: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileVerifyResult {
    success: boolean;
    /** Cloudflare error codes when success is false; useful for logs. */
    errorCodes?: string[];
}

/**
 * Verify a Turnstile token server-side.
 *
 * @param token  The token returned by the widget on the client.
 * @param remoteIp Optional client IP (recommended; tightens validation).
 * @returns      `{ success: true }` if the token is valid, `{ success: false, errorCodes }` otherwise.
 *
 * In dev environments without `TURNSTILE_SECRET_KEY` set, verification is bypassed
 * (logs a warning). In production without the key set, verification fails closed.
 */
export async function verifyTurnstile(
    token: string | null | undefined,
    remoteIp?: string | null
): Promise<TurnstileVerifyResult> {
    const secret = process.env.TURNSTILE_SECRET_KEY;

    if (!secret) {
        if (process.env.NODE_ENV === "production") {
            console.error(
                "[turnstile] TURNSTILE_SECRET_KEY is not set in production — failing closed"
            );
            return { success: false, errorCodes: ["missing-secret"] };
        }
        console.warn(
            "[turnstile] TURNSTILE_SECRET_KEY not set; bypassing verification in dev"
        );
        return { success: true };
    }

    if (!token || typeof token !== "string") {
        return { success: false, errorCodes: ["missing-input-response"] };
    }

    const body = new URLSearchParams({
        secret,
        response: token,
    });
    if (remoteIp) {
        body.append("remoteip", remoteIp);
    }

    try {
        const res = await fetch(VERIFY_URL, {
            method: "POST",
            body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            // Cloudflare typically responds in <200ms; cap at 5s to bound failure modes.
            signal: AbortSignal.timeout(5000),
        });
        const data = (await res.json()) as {
            success: boolean;
            "error-codes"?: string[];
        };

        if (!data.success) {
            return {
                success: false,
                errorCodes: data["error-codes"] ?? ["unknown"],
            };
        }
        return { success: true };
    } catch (err) {
        console.error("[turnstile] verification request failed", err);
        // Network failure to Cloudflare → fail closed. The user gets a generic
        // "please try again" message; legit traffic retries succeed.
        return { success: false, errorCodes: ["network-error"] };
    }
}
