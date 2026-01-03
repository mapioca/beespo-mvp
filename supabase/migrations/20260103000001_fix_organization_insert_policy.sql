-- Fix: Add INSERT policy for organizations
-- This allows authenticated users to create organizations during setup

CREATE POLICY "Authenticated users can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
