-- Update old helper function to use workspace_id instead of organization_id

-- Drop old policy that depends on the function
DROP POLICY IF EXISTS "Users can view profiles in same organization" ON profiles;

-- Now we can drop the old function
DROP FUNCTION IF EXISTS public.user_organization_id() CASCADE;

-- Create new function with workspace_id
CREATE OR REPLACE FUNCTION public.user_workspace_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$;

-- Note: The new policies were already created in migration 20260114000001_fix_profiles_recursion.sql
-- which uses get_auth_workspace_id() instead
