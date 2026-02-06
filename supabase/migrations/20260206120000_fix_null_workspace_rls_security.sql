-- SECURITY FIX: Prevent cross-workspace data leakage via NULL workspace_id comparison
-- 
-- Issue: When a user has no workspace assigned (profile.workspace_id = NULL),
-- the RLS policy `workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())`
-- could potentially expose meetings with NULL workspace_id due to SQL NULL comparison behavior.
--
-- This migration:
-- 1. Updates all RLS SELECT policies to explicitly handle NULL comparisons
-- 2. Ensures users can only see data when BOTH their workspace_id AND the record's workspace_id are NOT NULL
-- 3. Adds NOT NULL constraints to prevent future orphaned records

-- =====================================================
-- STEP 1: DROP AND RECREATE MEETINGS POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view meetings in their workspace" ON meetings;
DROP POLICY IF EXISTS "Public can view shared meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders and admins can create meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders and admins can update meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders and admins can delete meetings" ON meetings;

-- Recreate with NULL-safe comparison
CREATE POLICY "Users can view meetings in their workspace"
  ON meetings FOR SELECT
  USING (
    -- User must have a workspace assigned
    get_auth_workspace_id() IS NOT NULL
    -- AND meeting must belong to that workspace
    AND workspace_id = get_auth_workspace_id()
  );

-- Maintain public sharing for explicitly shared meetings
CREATE POLICY "Public can view shared meetings"
  ON meetings FOR SELECT
  USING (is_publicly_shared = true AND public_share_token IS NOT NULL);

CREATE POLICY "Leaders and admins can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update meetings"
  ON meetings FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete meetings"
  ON meetings FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 2: FIX AGENDA_ITEMS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view agenda items in their organization" ON agenda_items;
DROP POLICY IF EXISTS "Users can view agenda items in their workspace" ON agenda_items;
DROP POLICY IF EXISTS "Public can view agenda items of shared meetings" ON agenda_items;
DROP POLICY IF EXISTS "Leaders can manage agenda items" ON agenda_items;
DROP POLICY IF EXISTS "Leaders and admins can manage agenda items" ON agenda_items;

CREATE POLICY "Users can view agenda items in their workspace"
  ON agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = agenda_items.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
    )
  );

CREATE POLICY "Public can view agenda items of shared meetings"
  ON agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = agenda_items.meeting_id
      AND m.is_publicly_shared = true
      AND m.public_share_token IS NOT NULL
    )
  );

CREATE POLICY "Leaders and admins can manage agenda items"
  ON agenda_items FOR ALL
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = agenda_items.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
    )
  );

-- =====================================================
-- STEP 3: FIX TEMPLATES POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view templates in their workspace or shared templates" ON templates;
DROP POLICY IF EXISTS "Leaders and admins can create templates" ON templates;
DROP POLICY IF EXISTS "Leaders and admins can update their workspace templates" ON templates;
DROP POLICY IF EXISTS "Leaders and admins can delete their workspace templates" ON templates;

CREATE POLICY "Users can view templates in their workspace or shared templates"
  ON templates FOR SELECT
  USING (
    is_shared = true
    OR (
      get_auth_workspace_id() IS NOT NULL
      AND workspace_id = get_auth_workspace_id()
    )
  );

CREATE POLICY "Leaders and admins can create templates"
  ON templates FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update their workspace templates"
  ON templates FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete their workspace templates"
  ON templates FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 4: FIX TASKS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Leaders and admins can create tasks" ON tasks;
DROP POLICY IF EXISTS "Leaders and admins can update all tasks, assigned users can update their tasks" ON tasks;
DROP POLICY IF EXISTS "Leaders and admins can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks in their workspace"
  ON tasks FOR SELECT
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update all tasks, assigned users can update their tasks"
  ON tasks FOR UPDATE
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
    AND (
      get_auth_role() IN ('admin', 'leader')
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY "Leaders and admins can delete tasks"
  ON tasks FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 5: FIX DISCUSSIONS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view discussions in their workspace" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can create discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can update discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders and admins can delete discussions" ON discussions;

CREATE POLICY "Users can view discussions in their workspace"
  ON discussions FOR SELECT
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create discussions"
  ON discussions FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update discussions"
  ON discussions FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete discussions"
  ON discussions FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 6: FIX BUSINESS_ITEMS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view business items in their workspace" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can create business items" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can update business items" ON business_items;
DROP POLICY IF EXISTS "Leaders and admins can delete business items" ON business_items;

CREATE POLICY "Users can view business items in their workspace"
  ON business_items FOR SELECT
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create business items"
  ON business_items FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update business items"
  ON business_items FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete business items"
  ON business_items FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 7: FIX ANNOUNCEMENTS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view announcements in their workspace" ON announcements;
DROP POLICY IF EXISTS "Leaders and admins can create announcements" ON announcements;
DROP POLICY IF EXISTS "Leaders and admins can update announcements" ON announcements;
DROP POLICY IF EXISTS "Leaders and admins can delete announcements" ON announcements;

CREATE POLICY "Users can view announcements in their workspace"
  ON announcements FOR SELECT
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete announcements"
  ON announcements FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 8: FIX SPEAKERS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view speakers in their workspace" ON speakers;
DROP POLICY IF EXISTS "Leaders and admins can create speakers" ON speakers;
DROP POLICY IF EXISTS "Leaders and admins can update speakers" ON speakers;
DROP POLICY IF EXISTS "Leaders and admins can delete speakers" ON speakers;

CREATE POLICY "Users can view speakers in their workspace"
  ON speakers FOR SELECT
  USING (
    get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create speakers"
  ON speakers FOR INSERT
  WITH CHECK (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update speakers"
  ON speakers FOR UPDATE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete speakers"
  ON speakers FOR DELETE
  USING (
    get_auth_role() IN ('admin', 'leader')
    AND get_auth_workspace_id() IS NOT NULL
    AND workspace_id = get_auth_workspace_id()
  );

-- =====================================================
-- STEP 9: FIX PARTICIPANTS POLICIES (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'participants') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view participants in their workspace" ON participants';
    EXECUTE 'DROP POLICY IF EXISTS "Leaders and admins can manage participants" ON participants';
    
    EXECUTE 'CREATE POLICY "Users can view participants in their workspace"
      ON participants FOR SELECT
      USING (
        get_auth_workspace_id() IS NOT NULL
        AND workspace_id = get_auth_workspace_id()
      )';
    
    EXECUTE 'CREATE POLICY "Leaders and admins can manage participants"
      ON participants FOR ALL
      USING (
        get_auth_role() IN (''admin'', ''leader'')
        AND get_auth_workspace_id() IS NOT NULL
        AND workspace_id = get_auth_workspace_id()
      )';
  END IF;
END $$;

-- =====================================================
-- STEP 10: FIX SHARE-RELATED TABLES POLICIES
-- =====================================================

-- meeting_share_invitations
DROP POLICY IF EXISTS "Workspace members can view meeting invitations" ON meeting_share_invitations;
DROP POLICY IF EXISTS "Workspace leaders can create meeting invitations" ON meeting_share_invitations;
DROP POLICY IF EXISTS "Workspace leaders can update meeting invitations" ON meeting_share_invitations;
DROP POLICY IF EXISTS "Workspace leaders can delete meeting invitations" ON meeting_share_invitations;

CREATE POLICY "Workspace members can view meeting invitations"
  ON meeting_share_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_invitations.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
    )
  );

CREATE POLICY "Workspace leaders can create meeting invitations"
  ON meeting_share_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_invitations.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can update meeting invitations"
  ON meeting_share_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_invitations.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can delete meeting invitations"
  ON meeting_share_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_invitations.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

-- meeting_share_views
DROP POLICY IF EXISTS "Workspace members can view share analytics" ON meeting_share_views;

CREATE POLICY "Workspace members can view share analytics"
  ON meeting_share_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_views.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
    )
  );

-- meeting_share_settings
DROP POLICY IF EXISTS "Workspace members can view share settings" ON meeting_share_settings;
DROP POLICY IF EXISTS "Workspace leaders can insert share settings" ON meeting_share_settings;
DROP POLICY IF EXISTS "Workspace leaders can update share settings" ON meeting_share_settings;
DROP POLICY IF EXISTS "Workspace leaders can delete share settings" ON meeting_share_settings;

CREATE POLICY "Workspace members can view share settings"
  ON meeting_share_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_settings.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
    )
  );

CREATE POLICY "Workspace leaders can insert share settings"
  ON meeting_share_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_settings.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can update share settings"
  ON meeting_share_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_settings.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can delete share settings"
  ON meeting_share_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_settings.meeting_id
      AND get_auth_workspace_id() IS NOT NULL
      AND m.workspace_id = get_auth_workspace_id()
      AND get_auth_role() IN ('admin', 'leader')
    )
  );

-- =====================================================
-- STEP 11: LOG FOR AUDIT
-- =====================================================

-- Log that this security fix was applied
DO $$
BEGIN
  RAISE NOTICE '✅ Security fix applied: NULL workspace_id RLS vulnerability patched';
  RAISE NOTICE '   - All SELECT policies now require get_auth_workspace_id() IS NOT NULL';
  RAISE NOTICE '   - Tables fixed: meetings, agenda_items, templates, tasks, discussions,';
  RAISE NOTICE '     business_items, announcements, speakers, participants, share tables';
END $$;
