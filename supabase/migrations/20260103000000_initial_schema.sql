-- Beespo MVP - Initial Database Schema
-- Week 2: Complete schema with RLS policies for multi-tenancy

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLES
-- =====================================================

-- Organizations (Wards/Stakes)
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ward', 'stake')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('leader', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates (reusable agenda templates)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calling_type TEXT, -- 'bishopric', 'ward_council', 'rs_presidency', etc.
  is_shared BOOLEAN DEFAULT false, -- true for pre-built templates
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template Items (default agenda items in templates)
CREATE TABLE template_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings (instances created from templates)
CREATE TABLE meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agenda Items (specific items for each meeting)
CREATE TABLE agenda_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  duration_minutes INTEGER,
  notes TEXT, -- Real-time collaborative notes
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks/Action Items
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  agenda_item_id UUID REFERENCES agenda_items(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_templates_organization ON templates(organization_id);
CREATE INDEX idx_templates_shared ON templates(is_shared);
CREATE INDEX idx_template_items_template ON template_items(template_id);
CREATE INDEX idx_meetings_organization ON meetings(organization_id);
CREATE INDEX idx_meetings_date ON meetings(scheduled_date);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_agenda_items_meeting ON agenda_items(meeting_id);
CREATE INDEX idx_tasks_organization ON tasks(organization_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- =====================================================
-- UPDATED_AT Triggers
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON agenda_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own organization
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders can update their organization"
  ON organizations FOR UPDATE
  USING (
    id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader'
  );

-- Profiles: Users can view all profiles in their org, update only their own
CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Templates: Everyone in org can read, leaders can create/update/delete
CREATE POLICY "Users can view templates in their organization or shared templates"
  ON templates FOR SELECT
  USING (
    is_shared = true OR
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can create templates"
  ON templates FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can update their org templates"
  ON templates FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can delete their org templates"
  ON templates FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Template Items: Follow template permissions
CREATE POLICY "Users can view template items for accessible templates"
  ON template_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND (templates.is_shared = true OR templates.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()))
    )
  );

CREATE POLICY "Leaders can manage template items"
  ON template_items FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Meetings: Everyone can read, leaders can create/update
CREATE POLICY "Users can view meetings in their organization"
  ON meetings FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders can create meetings"
  ON meetings FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can update meetings"
  ON meetings FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can delete meetings"
  ON meetings FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Agenda Items: Everyone can read, leaders can manage (for real-time collaboration)
CREATE POLICY "Users can view agenda items in their organization"
  ON agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = agenda_items.meeting_id
      AND meetings.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders can manage agenda items"
  ON agenda_items FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM meetings
      WHERE meetings.id = agenda_items.meeting_id
      AND meetings.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Tasks: Everyone can view their org's tasks, leaders can manage all, members can update tasks assigned to them
CREATE POLICY "Users can view tasks in their organization"
  ON tasks FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can update all tasks, members can update tasks assigned to them"
  ON tasks FOR UPDATE
  USING (
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()) AND
    (
      (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' OR
      assigned_to = auth.uid()
    )
  );

CREATE POLICY "Leaders can delete tasks"
  ON tasks FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to create a meeting from a template (copies template items to agenda items)
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
  v_organization_id UUID;
BEGIN
  -- Get organization_id from user profile
  SELECT organization_id INTO v_organization_id
  FROM profiles WHERE id = auth.uid();

  -- Verify user is a leader
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'leader' THEN
    RAISE EXCEPTION 'Only leaders can create meetings';
  END IF;

  -- Create meeting
  INSERT INTO meetings (organization_id, template_id, title, scheduled_date, created_by)
  VALUES (v_organization_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;

  -- Copy template items to agenda items
  INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes)
  SELECT v_meeting_id, title, description, order_index, duration_minutes
  FROM template_items
  WHERE template_id = p_template_id
  ORDER BY order_index;

  RETURN v_meeting_id;
END;
$$;
