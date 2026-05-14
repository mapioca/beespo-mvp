import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeInviteCode, isValidCodeFormat } from "@/lib/services/access-control";
import { checkRateLimit } from "@/lib/rate-limiter";
import { logSecurityEvent } from "@/lib/security/audit-log";

interface ConsumeInviteCodeResponse {
    success: boolean;
    invitationId?: string;
    error?: string;
}

/**
 * POST /api/platform-invitations/consume
 * 
 * Validates AND consumes an invite code atomically.
 * This should be called immediately before user creation.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ConsumeInviteCodeResponse>> {
    try {
        const body = await request.json();
        const { code } = body;

        if (!code || typeof code !== "string") {
            return NextResponse.json(
                { success: false, error: "Invite code is required" },
                { status: 400 }
            );
        }

        const normalizedCode = normalizeInviteCode(code);

        if (!isValidCodeFormat(normalizedCode)) {
            return NextResponse.json(
                { success: false, error: "Invalid invite code format" },
                { status: 400 }
            );
        }

        // Get IP for rate limiting
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ||
            request.headers.get("x-real-ip") ||
            "unknown";

        // Check rate limit (max 5 requests per minute for consume - stricter than validate)
        const rateLimit = await checkRateLimit(ip, 5, 60 * 1000);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { success: false, error: "Too many requests. Please try again later." },
                { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
            );
        }

        // Use admin client to call the RPC function (bypasses RLS for atomic operation)
        const supabaseAdmin = createAdminClient();

        const { data, error } = await supabaseAdmin.rpc('validate_and_consume_invite_code', {
            p_code: normalizedCode,
            p_ip_address: ip,
        });

        if (error) {
            console.error("[API] Platform invitation consume error:", error);
            return NextResponse.json(
                { success: false, error: "Unable to validate code" },
                { status: 500 }
            );
        }

        // The RPC returns an array with one row
        const result = Array.isArray(data) ? data[0] : data;

        if (!result) {
            return NextResponse.json(
                { success: false, error: "Unable to validate code" },
                { status: 500 }
            );
        }

        if (result.is_valid) {
            void logSecurityEvent({
                eventType: "platform_invitation.consume.success",
                outcome: "success",
                ipAddress: ip,
                userAgent: request.headers.get("user-agent"),
                details: { invitation_id: result.invitation_id },
            });
            return NextResponse.json({
                success: true,
                invitationId: result.invitation_id,
            });
        }

        void logSecurityEvent({
            eventType: "platform_invitation.consume.failure",
            outcome: "failure",
            ipAddress: ip,
            userAgent: request.headers.get("user-agent"),
            details: { error: result.error_message },
        });

        return NextResponse.json({
            success: false,
            error: result.error_message || "Invalid invite code",
        });
    } catch (error) {
        console.error("[API] Platform invitation consume error:", error);
        return NextResponse.json(
            { success: false, error: "Unable to validate code" },
            { status: 500 }
        );
    }
}
