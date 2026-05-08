import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateInviteCode } from "@/lib/services/access-control";
import { checkRateLimit } from "@/lib/rate-limiter";
import type { ValidateInviteCodeResponse } from "@/lib/services/access-control";

/**
 * POST /api/platform-invitations/validate
 * 
 * Pre-validates an invite code WITHOUT consuming it.
 * Used for real-time validation in the signup form.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ValidateInviteCodeResponse>> {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code || typeof code !== "string") {
            return NextResponse.json(
                { valid: false, error: "Invite code is required" },
                { status: 400 }
            );
        }

        // Get IP for rate limiting
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";

        // Check rate limit (max 10 requests per minute)
        const rateLimit = await checkRateLimit(ip, 10, 60 * 1000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { valid: false, error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
            );
        }

        const supabase = await createClient();

        const result = await validateInviteCode(supabase, code, ip);

        if (result.isValid) {
            return NextResponse.json({
                valid: true,
                invitationId: result.invitationId || undefined,
            });
        }

        return NextResponse.json({
            valid: false,
            error: result.errorMessage || "Invalid invite code",
        });
    } catch (error) {
        console.error("[API] Platform invitation validation error:", error);
        return NextResponse.json(
            { valid: false, error: "Unable to validate code" },
            { status: 500 }
        );
    }
}
