-- Fix infinite recursion in profiles policies by introducing security definer functions

-- 1. Create secure functions to get current user's workspace_id and role
-- These bypass RLS on the profiles table to avoid recursion
CREATE OR REPLACE FUNCTION get_auth_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_auth_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- 2. Drop the recursive policies on PROFILES
DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles in their workspace" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles from their workspace" ON profiles;

-- 3. Recreate PROFILES policies using the secure functions
CREATE POLICY "Users can view profiles in their workspace"
  ON profiles FOR SELECT
  USING (
    workspace_id = get_auth_workspace_id()
    OR id = auth.uid()
  );

CREATE POLICY "Admins can update profiles in their workspace"
  ON profiles FOR UPDATE
  USING (
    workspace_id = get_auth_workspace_id()
    AND get_auth_role() = 'admin'
  );

CREATE POLICY "Admins can delete profiles from their workspace"
  ON profiles FOR DELETE
  USING (
    workspace_id = get_auth_workspace_id()
    AND get_auth_role() = 'admin'
    AND id != auth.uid()
  );

-- 4. Optimize WORKSPACES policies to use the new functions (optional but recommended)
DROP POLICY IF EXISTS "Users can view their own workspace" ON workspaces;
DROP POLICY IF EXISTS "Admins can update their workspace" ON workspaces;

CREATE POLICY "Users can view their own workspace"
  ON workspaces FOR SELECT
  USING (id = get_auth_workspace_id());

CREATE POLICY "Admins can update their workspace"
  ON workspaces FOR UPDATE
  USING (
    id = get_auth_workspace_id()
    AND get_auth_role() = 'admin'
  );
