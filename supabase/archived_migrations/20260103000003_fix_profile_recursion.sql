-- Fix: Remove infinite recursion in profile policies
-- The previous policies caused recursion by querying profiles table within the policy itself

-- Drop all problematic policies
DROP POLICY IF EXISTS "Users can view their own profile or profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;

-- Create a security definer function to get current user's organization_id
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Create a simple policy that allows users to view their own profile
-- This is needed for signup/login flow to check if profile exists
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Create a policy for viewing profiles in the same organization
-- Uses the security definer function to avoid recursion
CREATE POLICY "Users can view profiles in same organization"
  ON profiles FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND organization_id = public.user_organization_id()
  );
