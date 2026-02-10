-- Migration: Add participants feature
-- Participants are reusable names for procedural item assignments (prayers, talks, etc.)

-- Create participants table
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_participants_workspace ON participants(workspace_id);
CREATE INDEX idx_participants_name ON participants(workspace_id, name);

-- Updated_at trigger
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON participants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their workspace"
  ON participants FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders can create participants"
  ON participants FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can update participants"
  ON participants FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders can delete participants"
  ON participants FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('leader', 'admin') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Add participant_id to agenda_items for procedural item assignments
ALTER TABLE agenda_items
ADD COLUMN participant_id UUID REFERENCES participants(id) ON DELETE SET NULL;

CREATE INDEX idx_agenda_items_participant ON agenda_items(participant_id);

-- Add participant_name field for display (denormalized for convenience)
ALTER TABLE agenda_items
ADD COLUMN participant_name TEXT;
