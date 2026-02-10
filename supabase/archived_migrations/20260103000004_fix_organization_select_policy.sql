-- Fix: Allow users to SELECT organizations during setup (when they don't have a profile yet)
-- The previous policy prevented users from seeing the org they just created during setup

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Create a new policy that allows:
-- 1. Users with profiles to see their organization
-- 2. Authenticated users without profiles to see all orgs (for the setup select after insert)
CREATE POLICY "Users can view organizations"
  ON organizations FOR SELECT
  USING (
    -- User has a profile and organization matches
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    OR
    -- User is authenticated but has no profile yet (setup flow)
    -- This allows them to see the org they just created before creating their profile
    (auth.uid() IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()))
  );
