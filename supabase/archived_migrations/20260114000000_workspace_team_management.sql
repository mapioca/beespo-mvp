-- Beespo MVP - Workspace & Team Management Migration
-- Renames organizations -> workspaces, adds organization_type, updates roles, creates invitations

-- =====================================================
-- STEP 1: Rename organizations table to workspaces
-- =====================================================

ALTER TABLE organizations RENAME TO workspaces;

-- =====================================================
-- STEP 2: Update workspaces table structure
-- =====================================================

-- Expand workspace type to include branch and district
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS organizations_type_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_type_check 
  CHECK (type IN ('ward', 'branch', 'stake', 'district'));

-- Add organization_type column
ALTER TABLE workspaces ADD COLUMN organization_type TEXT NOT NULL DEFAULT 'bishopric'
  CHECK (organization_type IN (
    'bishopric',
    'elders_quorum',
    'relief_society',
    'young_men',
    'young_women',
    'primary',
    'missionary_work',
    'temple_family_history',
    'sunday_school'
  ));

-- =====================================================
-- STEP 3: Rename foreign key columns in profiles
-- =====================================================

ALTER TABLE profiles RENAME COLUMN organization_id TO workspace_id;

-- Update profiles role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'leader', 'guest'));

-- Migrate existing roles: leader -> admin (since they created the org), member -> leader
UPDATE profiles SET role = 'admin' WHERE role = 'leader';
UPDATE profiles SET role = 'leader' WHERE role = 'member';

-- Add is_sys_admin flag for global system administrators
ALTER TABLE profiles ADD COLUMN is_sys_admin BOOLEAN DEFAULT false;

-- =====================================================
-- STEP 4: Rename foreign key columns in other tables
-- =====================================================

ALTER TABLE templates RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE meetings RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE tasks RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE discussions RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE business_items RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE announcements RENAME COLUMN organization_id TO workspace_id;
ALTER TABLE speakers RENAME COLUMN organization_id TO workspace_id;

-- =====================================================
-- STEP 5: Create workspace_invitations table
-- =====================================================

CREATE TABLE workspace_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'leader', 'guest')),
  token UUID DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_invitations_token ON workspace_invitations(token);
CREATE INDEX idx_invitations_workspace ON workspace_invitations(workspace_id);
CREATE INDEX idx_invitations_email ON workspace_invitations(email);
CREATE INDEX idx_invitations_status ON workspace_invitations(status);

-- Trigger for updated_at
CREATE TRIGGER update_workspace_invitations_updated_at 
  BEFORE UPDATE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 6: Update all RLS policies
-- =====================================================

-- Drop old organization policies
DROP POLICY IF EXISTS "Users can view their own organization" ON workspaces;
DROP POLICY IF EXISTS "Leaders can update their organization" ON workspaces;

-- New workspace policies
CREATE POLICY "Users can view their own workspace"
  ON workspaces FOR SELECT
  USING (id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update their workspace"
  ON workspaces FOR UPDATE
  USING (
    id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Drop and recreate profile policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Users can view profiles in their workspace"
  ON profiles FOR SELECT
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    OR id = auth.uid()
  );

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update profiles in their workspace"
  ON profiles FOR UPDATE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Admins can delete profiles from their workspace"
  ON profiles FOR DELETE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND id != auth.uid()  -- Cannot delete yourself
  );

-- Invitation policies
CREATE POLICY "Admins can manage invitations"
  ON workspace_invitations FOR ALL
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Leaders can view invitations in their workspace"
  ON workspace_invitations FOR SELECT
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Anyone can view invitation by token"
  ON workspace_invitations FOR SELECT
  USING (true);

-- =====================================================
-- STEP 7: Update template policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view templates in their organization or shared templates" ON templates;
DROP POLICY IF EXISTS "Leaders can create templates" ON templates;
DROP POLICY IF EXISTS "Leaders can update their org templates" ON templates;
DROP POLICY IF EXISTS "Leaders can delete their org templates" ON templates;

CREATE POLICY "Users can view templates in their workspace or shared templates"
  ON templates FOR SELECT
  USING (
    is_shared = true OR
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can create templates"
  ON templates FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update their workspace templates"
  ON templates FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete their workspace templates"
  ON templates FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 8: Update meetings policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view meetings in their organization" ON meetings;
DROP POLICY IF EXISTS "Leaders can create meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders can update meetings" ON meetings;
DROP POLICY IF EXISTS "Leaders can delete meetings" ON meetings;

CREATE POLICY "Users can view meetings in their workspace"
  ON meetings FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update meetings"
  ON meetings FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete meetings"
  ON meetings FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 9: Update tasks policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view tasks in their organization" ON tasks;
DROP POLICY IF EXISTS "Leaders can create tasks" ON tasks;
DROP POLICY IF EXISTS "Leaders can update all tasks, members can update tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "Leaders can delete tasks" ON tasks;

CREATE POLICY "Users can view tasks in their workspace"
  ON tasks FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update all tasks, assigned users can update their tasks"
  ON tasks FOR UPDATE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()) AND
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') OR
      assigned_to = auth.uid()
    )
  );

CREATE POLICY "Leaders and admins can delete tasks"
  ON tasks FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 10: Update discussions policies  
-- =====================================================

DROP POLICY IF EXISTS "Users can view discussions in their organization" ON discussions;
DROP POLICY IF EXISTS "Leaders can create discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders can update discussions" ON discussions;
DROP POLICY IF EXISTS "Leaders can delete discussions" ON discussions;

CREATE POLICY "Users can view discussions in their workspace"
  ON discussions FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create discussions"
  ON discussions FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update discussions"
  ON discussions FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete discussions"
  ON discussions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 11: Update business_items policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view business items in their organization" ON business_items;
DROP POLICY IF EXISTS "Leaders can create business items" ON business_items;
DROP POLICY IF EXISTS "Leaders can update business items" ON business_items;
DROP POLICY IF EXISTS "Leaders can delete business items" ON business_items;

CREATE POLICY "Users can view business items in their workspace"
  ON business_items FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create business items"
  ON business_items FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update business items"
  ON business_items FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete business items"
  ON business_items FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 12: Update announcements policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view announcements in their organization" ON announcements;
DROP POLICY IF EXISTS "Leaders can create announcements" ON announcements;
DROP POLICY IF EXISTS "Leaders can update announcements" ON announcements;
DROP POLICY IF EXISTS "Leaders can delete announcements" ON announcements;

CREATE POLICY "Users can view announcements in their workspace"
  ON announcements FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update announcements"
  ON announcements FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete announcements"
  ON announcements FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 13: Update speakers policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view speakers in their organization" ON speakers;
DROP POLICY IF EXISTS "Leaders can create speakers" ON speakers;
DROP POLICY IF EXISTS "Leaders can update speakers" ON speakers;
DROP POLICY IF EXISTS "Leaders can delete speakers" ON speakers;

CREATE POLICY "Users can view speakers in their workspace"
  ON speakers FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create speakers"
  ON speakers FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update speakers"
  ON speakers FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete speakers"
  ON speakers FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 14: Update helper function
-- =====================================================

CREATE OR REPLACE FUNCTION create_meeting_from_template(
  p_template_id UUID,
  p_title TEXT,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meeting_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get workspace_id from user profile
  SELECT workspace_id INTO v_workspace_id
  FROM profiles WHERE id = auth.uid();

  -- Verify user is an admin or leader
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create meetings';
  END IF;

  -- Create meeting
  INSERT INTO meetings (workspace_id, template_id, title, scheduled_date, created_by)
  VALUES (v_workspace_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;

  -- Copy template items to agenda items
  INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes, item_type)
  SELECT v_meeting_id, title, description, order_index, duration_minutes, item_type
  FROM template_items
  WHERE template_id = p_template_id
  ORDER BY order_index;

  RETURN v_meeting_id;
END;
$$;

-- =====================================================
-- STEP 15: Rename indexes
-- =====================================================

ALTER INDEX IF EXISTS idx_profiles_organization RENAME TO idx_profiles_workspace;
ALTER INDEX IF EXISTS idx_templates_organization RENAME TO idx_templates_workspace;
ALTER INDEX IF EXISTS idx_meetings_organization RENAME TO idx_meetings_workspace;
ALTER INDEX IF EXISTS idx_tasks_organization RENAME TO idx_tasks_workspace;
