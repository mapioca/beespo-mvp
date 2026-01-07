-- Beespo MVP - Discussions Feature Migration
-- Adds discussions, discussion_notes tables and updates agenda_items, tasks

-- =====================================================
-- NEW TABLES
-- =====================================================

-- Discussions (standalone discussion topics)
CREATE TABLE discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'member_concerns',
    'activities',
    'service_opportunities',
    'callings',
    'temple_work',
    'budget',
    'facilities',
    'youth',
    'mission_work',
    'other'
  )),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new',
    'active',
    'decision_required',
    'monitoring',
    'resolved',
    'deferred'
  )),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low',
    'medium',
    'high'
  )),
  due_date DATE,
  deferred_reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Discussion Notes (timeline of notes on discussions)
CREATE TABLE discussion_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODIFY EXISTING TABLES
-- =====================================================

-- Add discussion_id to agenda_items (optional link to discussion)
ALTER TABLE agenda_items
ADD COLUMN discussion_id UUID REFERENCES discussions(id) ON DELETE SET NULL;

-- Add discussion_id to tasks (optional link to discussion)
ALTER TABLE tasks
ADD COLUMN discussion_id UUID REFERENCES discussions(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_discussions_organization ON discussions(organization_id);
CREATE INDEX idx_discussions_status ON discussions(status);
CREATE INDEX idx_discussions_category ON discussions(category);
CREATE INDEX idx_discussions_priority ON discussions(priority);
CREATE INDEX idx_discussions_due_date ON discussions(due_date);
CREATE INDEX idx_discussion_notes_discussion ON discussion_notes(discussion_id);
CREATE INDEX idx_discussion_notes_meeting ON discussion_notes(meeting_id);
CREATE INDEX idx_discussion_notes_created_by ON discussion_notes(created_by);
CREATE INDEX idx_agenda_items_discussion ON agenda_items(discussion_id);
CREATE INDEX idx_tasks_discussion ON tasks(discussion_id);

-- =====================================================
-- UPDATED_AT Triggers
-- =====================================================

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_discussion_notes_updated_at BEFORE UPDATE ON discussion_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_notes ENABLE ROW LEVEL SECURITY;

-- Discussions: Leaders can CRUD, members cannot see (MVP restriction)
CREATE POLICY "Leaders can view discussions in their organization"
  ON discussions FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can create discussions"
  ON discussions FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can update discussions"
  ON discussions FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can delete discussions"
  ON discussions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Discussion Notes: Leaders can CRUD, creator or leader can edit/delete own notes
CREATE POLICY "Leaders can view discussion notes in their organization"
  ON discussion_notes FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM discussions
      WHERE discussions.id = discussion_notes.discussion_id
      AND discussions.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders can create discussion notes"
  ON discussion_notes FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM discussions
      WHERE discussions.id = discussion_notes.discussion_id
      AND discussions.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Creators and leaders can update discussion notes"
  ON discussion_notes FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM discussions
      WHERE discussions.id = discussion_notes.discussion_id
      AND discussions.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ) AND
    (created_by = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader')
  );

CREATE POLICY "Creators and leaders can delete discussion notes"
  ON discussion_notes FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM discussions
      WHERE discussions.id = discussion_notes.discussion_id
      AND discussions.organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
    ) AND
    (created_by = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader')
  );

-- =====================================================
-- HELPER VIEWS (Optional - for easier querying)
-- =====================================================

-- View to get discussion with note counts and task counts
CREATE OR REPLACE VIEW discussion_summary AS
SELECT
  d.*,
  COUNT(DISTINCT dn.id) as note_count,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT ai.meeting_id) as meeting_count
FROM discussions d
LEFT JOIN discussion_notes dn ON d.id = dn.discussion_id
LEFT JOIN tasks t ON d.id = t.discussion_id
LEFT JOIN agenda_items ai ON d.id = ai.discussion_id
GROUP BY d.id;
