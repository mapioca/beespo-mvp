"use server";

import { createClient } from "@/lib/supabase/server";
import { getClientIp, getUserAgent } from "@/lib/security/request-ip";
import { logSecurityEvent, type SecurityAuditEventType, type SecurityAuditOutcome } from "@/lib/security/audit-log";

export async function recordMfaAuditEvent(params: {
  eventType: SecurityAuditEventType;
  outcome: SecurityAuditOutcome;
  details?: Record<string, unknown>;
}): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [ip, ua] = await Promise.all([getClientIp(), getUserAgent()]);

  void logSecurityEvent({
    eventType: params.eventType,
    outcome: params.outcome,
    actorUserId: user?.id ?? null,
    ipAddress: ip,
    userAgent: ua,
    details: params.details ?? {},
  });
}
