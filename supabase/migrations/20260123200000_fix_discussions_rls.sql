-- Fix Discussions RLS Policies
-- Date: 2026-01-23
-- Issue: Old RLS policy "Leaders can view discussions in their organization" was never dropped
--        because the DROP statement in 20260114000000_workspace_team_management.sql used wrong name.
--        The old policy references organization_id which no longer exists (renamed to workspace_id).

-- =====================================================
-- STEP 1: Drop ALL old discussions policies (both naming conventions)
-- =====================================================

-- Old policies from 20260106000000_add_discussions_feature.sql (use organization_id, only 'leader' role)
DROP POLICY IF EXISTS "Leaders can view discussions in their organization" ON discussions;
DROP POLICY IF EXISTS "Leaders can create discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders can update discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders can delete discussions" ON discussions;

-- In case they were created with "Users can view..." naming
DROP POLICY IF EXISTS "Users can view discussions in their organization" ON discussions;

-- New policies from 20260114000000_workspace_team_management.sql (drop to recreate cleanly)
DROP POLICY IF EXISTS "Users can view discussions in their workspace" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can create discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can update discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can delete discussions" ON discussions;

-- =====================================================
-- STEP 2: Recreate all discussions policies with correct workspace_id and roles
-- =====================================================

-- All workspace members can view discussions in their workspace
CREATE POLICY "Users can view discussions in their workspace"
  ON discussions FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- Leaders and admins can create discussions in their workspace
CREATE POLICY "Leaders and admins can create discussions"
  ON discussions FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders and admins can update discussions in their workspace
CREATE POLICY "Leaders and admins can update discussions"
  ON discussions FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders and admins can delete discussions in their workspace
CREATE POLICY "Leaders and admins can delete discussions"
  ON discussions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );
