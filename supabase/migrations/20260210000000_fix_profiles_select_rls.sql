-- Fix: Restore profiles SELECT RLS policy with self-read access
--
-- The 20260209000000_account_deletion_support migration replaced the profiles
-- SELECT policy and removed the `OR id = auth.uid()` clause. This caused
-- the auth callback profile check to return NULL (blocked by RLS), which
-- incorrectly redirected existing users to /onboarding.
--
-- This migration restores the correct policy using get_auth_workspace_id()
-- (a SECURITY DEFINER function that avoids infinite recursion) and re-adds
-- the self-read clause so users can always read their own profile row.

-- Drop both possible policy names to ensure a clean slate
DROP POLICY IF EXISTS "Users can view workspace members" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON profiles;

-- Recreate with the self-read fallback
CREATE POLICY "Users can view profiles in their workspace"
  ON profiles FOR SELECT
  USING (
    workspace_id = get_auth_workspace_id()
    OR id = auth.uid()
  );
