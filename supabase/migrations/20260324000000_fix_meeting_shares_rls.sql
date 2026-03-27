-- ============================================================
-- Fix overly permissive RLS policy on meeting_shares.
--
-- The original "Anyone can view meeting share by token" policy
-- used USING (token IS NOT NULL) which is always true, allowing
-- any anonymous user to read every row in meeting_shares via
-- the Supabase REST API.
--
-- External token-based access now uses the service-role admin
-- client exclusively (src/lib/supabase/admin.ts), so this open
-- policy is both unnecessary and a security risk.
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view meeting share by token"
  ON public.meeting_shares;
