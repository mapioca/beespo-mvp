import { createAdminClient } from "@/lib/supabase/admin";

export type SecurityAuditEventType =
  | "auth.signin.success"
  | "auth.signin.failure"
  | "auth.signin.email_not_confirmed"
  | "auth.signin.rate_limited"
  | "auth.signin.turnstile_failed"
  | "auth.signout"
  | "mfa.enroll.success"
  | "mfa.enroll.failure"
  | "mfa.unenroll"
  | "mfa.verify.success"
  | "mfa.verify.failure"
  | "mfa.trusted_device.revoke"
  | "workspace.role.change"
  | "workspace.member.remove"
  | "workspace.invitation.accept"
  | "workspace.invitation.revoke"
  | "platform_invitation.validate.failure"
  | "platform_invitation.consume.success"
  | "platform_invitation.consume.failure";

export type SecurityAuditOutcome = "success" | "failure" | "denied";

interface LogSecurityEventParams {
  eventType: SecurityAuditEventType;
  outcome: SecurityAuditOutcome;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetEmail?: string | null;
  workspaceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown>;
}

// Fire-and-forget; never throws. Modeled on maybeNotifyFailedLoginBurst in auth-actions.ts.
export async function logSecurityEvent(params: LogSecurityEventParams): Promise<void> {
  try {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("security_audit_log").insert({
      event_type: params.eventType,
      outcome: params.outcome,
      actor_user_id: params.actorUserId ?? null,
      target_user_id: params.targetUserId ?? null,
      target_email: params.targetEmail ?? null,
      workspace_id: params.workspaceId ?? null,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      details: params.details ?? {},
    });
  } catch (err) {
    console.error("[security-audit] failed to write audit event", err);
  }
}
