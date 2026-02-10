-- Fix RLS Policies for agenda_items table
-- The workspace migration (20260114000000) missed updating agenda_items policies.
-- Old policies reference 'organization_id' (renamed to 'workspace_id') and only check for 'leader' role.

-- =====================================================
-- STEP 1: Drop old agenda_items policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view agenda items in their organization" ON agenda_items;
DROP POLICY IF EXISTS "Leaders can manage agenda items" ON agenda_items;

-- =====================================================
-- STEP 2: Create updated agenda_items policies
-- =====================================================

-- SELECT: Users can view agenda items for meetings in their workspace
CREATE POLICY "Users can view agenda items in their workspace"
  ON agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = agenda_items.meeting_id
      AND meetings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- INSERT: Leaders and admins can create agenda items for meetings in their workspace
CREATE POLICY "Leaders and admins can insert agenda items"
  ON agenda_items FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = meeting_id
      AND meetings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- UPDATE: Leaders and admins can update agenda items for meetings in their workspace
CREATE POLICY "Leaders and admins can update agenda items"
  ON agenda_items FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = agenda_items.meeting_id
      AND meetings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- DELETE: Leaders and admins can delete agenda items for meetings in their workspace
CREATE POLICY "Leaders and admins can delete agenda items"
  ON agenda_items FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = agenda_items.meeting_id
      AND meetings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
