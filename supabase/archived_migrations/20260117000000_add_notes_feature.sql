-- Beespo MVP - Notes Feature Migration
-- Adds notes (rich text) and note_associations (polymorphic links)

-- =====================================================
-- 1. Create Notes Table
-- =====================================================

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Note',
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_personal BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notes_workspace ON notes(workspace_id);
CREATE INDEX idx_notes_created_by ON notes(created_by);
CREATE INDEX idx_notes_is_personal ON notes(is_personal);

-- Trigger for updated_at
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. Create Note Associations Table (Polymorphic)
-- =====================================================

CREATE TABLE note_associations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('discussion', 'meeting', 'task')),
  entity_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Add a unique constraint to prevent duplicate links
  UNIQUE(note_id, entity_type, entity_id)
);

CREATE INDEX idx_note_associations_note_id ON note_associations(note_id);
CREATE INDEX idx_note_associations_entity ON note_associations(entity_type, entity_id);


-- =====================================================
-- 3. RLS Policies
-- =====================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_associations ENABLE ROW LEVEL SECURITY;

-- NOTES POLICIES

-- View:
-- 1. If persistent/shared: Users can view if they belong to the workspace.
-- 2. If personal: Users can view ONLY if they are the creator.
CREATE POLICY "Users can view accessible notes"
  ON notes FOR SELECT
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()) 
    AND (
      is_personal = false 
      OR 
      (is_personal = true AND created_by = auth.uid())
    )
  );

-- Create:
-- Users can create notes in their workspace.
CREATE POLICY "Users can create notes in their workspace"
  ON notes FOR INSERT
  WITH CHECK (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- Update:
-- 1. If persistent/shared: Admins and Leaders can update.
-- 2. If personal: ONLY the creator can update.
-- 3. Creators can always update their own shared notes (optional, but good for collaboration usually. 
--    Let's restrict shared note editing to Leaders/Admins + Creator for now to match other features, 
--    or keep it simple: "Leaders/Admins can edit any shared note. Creator can edit own note.")
CREATE POLICY "Users can update their notes"
  ON notes FOR UPDATE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (
      -- Admin/Leader can edit any SHARED note
      (is_personal = false AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader'))
      OR
      -- Creator can edit their own note (personal or shared)
      created_by = auth.uid()
    )
  );

-- Delete:
-- Same rules as Update basically.
CREATE POLICY "Users can delete their notes"
  ON notes FOR DELETE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (
      -- Admin/Leader can delete any SHARED note
      (is_personal = false AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader'))
      OR
      -- Creator can delete their own note
      created_by = auth.uid()
    )
  );

-- ASSOCIATIONS POLICIES

-- View: Visible if you can see the parent note
CREATE POLICY "Users can view associations for accessible notes"
  ON note_associations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_associations.note_id
      AND (
        notes.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
        AND (
          notes.is_personal = false 
          OR 
          (notes.is_personal = true AND notes.created_by = auth.uid())
        )
      )
    )
  );

-- Create/Delete: Must have edit rights on the note
CREATE POLICY "Users can manage associations for their editable notes"
  ON note_associations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM notes 
      WHERE notes.id = note_associations.note_id
      AND (
         -- Same condition as Update Policy for notes
         notes.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
         AND (
           (notes.is_personal = false AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader'))
           OR
           notes.created_by = auth.uid()
         )
      )
    )
  );
