import type { NextRequest } from "next/server";

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, "");
}

export function getAppUrlFromRequest(request: NextRequest): string {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const host = forwardedHost ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto");

    if (host) {
        const proto = forwardedProto ?? (host.includes("localhost") ? "http" : "https");
        return normalizeBaseUrl(`${proto}://${host}`);
    }

    return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}

export function getAppUrlFallback(): string {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
}