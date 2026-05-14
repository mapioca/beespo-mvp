import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "beespo_pending_signup";
const TTL_MS = 60 * 60 * 1000;

function getSecret(): string {
    const s = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!s) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    return s;
}

function sign(payload: string): string {
    return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a, "utf8");
    const bb = Buffer.from(b, "utf8");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
}

export async function setPendingSignupCookie(userId: string): Promise<void> {
    const expiresAt = Date.now() + TTL_MS;
    const payload = `${userId}|${expiresAt}`;
    const value = `${payload}|${sign(payload)}`;
    const jar = await cookies();
    jar.set(COOKIE_NAME, value, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: TTL_MS / 1000,
    });
}

export async function readPendingSignupCookie(): Promise<string | null> {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (!raw) return null;
    const parts = raw.split("|");
    if (parts.length !== 3) return null;
    const [userId, expiresAtStr, sig] = parts;
    if (!timingSafeEqual(sig, sign(`${userId}|${expiresAtStr}`))) return null;
    const expiresAt = Number.parseInt(expiresAtStr, 10);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;
    return userId;
}

export async function clearPendingSignupCookie(): Promise<void> {
    const jar = await cookies();
    jar.delete(COOKIE_NAME);
}
