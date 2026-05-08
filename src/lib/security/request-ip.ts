import { headers } from "next/headers";

/**
 * Best-effort client IP extraction inside a server action / route handler.
 *
 * Cloudflare sets `cf-connecting-ip` to the true client IP. We prefer that
 * when present, then fall back to the standard proxy chain headers, then to
 * "unknown" (rate limiting bucket).
 */
export async function getClientIp(): Promise<string> {
    const h = await headers();
    return (
        h.get("cf-connecting-ip") ||
        h.get("x-real-ip") ||
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    );
}
