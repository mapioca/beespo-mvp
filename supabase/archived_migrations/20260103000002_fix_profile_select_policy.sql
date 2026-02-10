-- Fix: Allow users to view their own profile even before they have an organization
-- This fixes the circular dependency where users can't check if they have a profile

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Create a new policy that allows users to view their own profile OR profiles in their organization
CREATE POLICY "Users can view their own profile or profiles in their organization"
  ON profiles FOR SELECT
  USING (
    id = auth.uid() OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
