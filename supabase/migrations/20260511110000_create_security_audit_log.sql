CREATE TABLE public.security_audit_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type      text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('success','failure','denied')),
  actor_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email    text,
  workspace_id    uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ip_address      text,
  user_agent      text,
  details         jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX security_audit_log_created_at_idx
  ON public.security_audit_log (created_at DESC);
CREATE INDEX security_audit_log_actor_idx
  ON public.security_audit_log (actor_user_id, created_at DESC);
CREATE INDEX security_audit_log_target_email_idx
  ON public.security_audit_log (target_email, created_at DESC)
  WHERE target_email IS NOT NULL;
CREATE INDEX security_audit_log_workspace_idx
  ON public.security_audit_log (workspace_id, created_at DESC)
  WHERE workspace_id IS NOT NULL;
CREATE INDEX security_audit_log_event_type_idx
  ON public.security_audit_log (event_type, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- No INSERT/UPDATE/DELETE policies → only service-role can write/modify.
-- Writes go through src/lib/supabase/admin.ts (createAdminClient).

CREATE POLICY "Sys admins can read security audit log"
  ON public.security_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_sys_admin = true
    )
  );

COMMENT ON TABLE public.security_audit_log IS
  'Append-only record of security-relevant events. Writes via service role only.';
