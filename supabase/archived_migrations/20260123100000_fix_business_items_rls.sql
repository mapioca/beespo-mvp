-- Fix Business Items RLS Policies
-- Date: 2026-01-23
-- Issue: Old RLS policies reference organization_id (renamed to workspace_id) and only checked 'leader' role.
--        The workspace migration tried to drop policies with wrong names, so old policies still exist.
--        This migration drops ALL old policies and recreates them cleanly with proper workspace_id and role checks.

-- =====================================================
-- STEP 1: Drop ALL old business_items policies (both naming conventions)
-- =====================================================

-- Old policies from 20260107000000_add_business_feature.sql (use organization_id, only 'leader' role)
DROP POLICY IF EXISTS "Leaders can view business items in their organization" ON business_items;
DROP POLICY IF EXISTS "Leaders can create business items" ON business_items;
DROP POLICY IF EXISTS "Leaders can update business items" ON business_items;
DROP POLICY IF EXISTS "Leaders can delete business items" ON business_items;

-- In case they were created with "Users can view..." naming
DROP POLICY IF EXISTS "Users can view business items in their organization" ON business_items;

-- New policies from 20260114000000_workspace_team_management.sql (drop to recreate cleanly)
DROP POLICY IF EXISTS "Users can view business items in their workspace" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can create business items" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can update business items" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can delete business items" ON business_items;

-- =====================================================
-- STEP 2: Recreate all business_items policies with correct workspace_id and roles
-- =====================================================

-- All workspace members can view business items in their workspace
CREATE POLICY "Users can view business items in their workspace"
  ON business_items FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- Leaders and admins can create business items in their workspace
CREATE POLICY "Leaders and admins can create business items"
  ON business_items FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders and admins can update business items in their workspace
CREATE POLICY "Leaders and admins can update business items"
  ON business_items FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders and admins can delete business items in their workspace
CREATE POLICY "Leaders and admins can delete business items"
  ON business_items FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
