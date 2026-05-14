-- Remove the overly-permissive OR branch that let any authenticated user
-- without a profile row read all workspaces.
--
-- Old policy (from baseline):
--   USING (
--     id IN (SELECT workspace_id FROM profiles WHERE profiles.id = auth.uid())
--     OR
--     (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()))
--   )
--
-- The second branch was intended for the brief window during onboarding where
-- a profile row doesn't exist yet. Instead, onboarding uses the service-role
-- admin client, so the policy branch is never needed and is a security hole.

DROP POLICY IF EXISTS "Users can view organizations" ON public.workspaces;

CREATE POLICY "Users can view their workspace"
  ON public.workspaces FOR SELECT
  USING (
    id = public.get_auth_workspace_id()
  );
