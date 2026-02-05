-- Beespo MVP - Notebooks Feature Migration
-- Creates notebooks table and adds notebook_id to notes

-- =====================================================
-- 1. Create Notebooks Table
-- =====================================================

CREATE TABLE notebooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled Notebook',
  cover_style TEXT NOT NULL DEFAULT 'gradient-ocean',
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notebooks_workspace ON notebooks(workspace_id);
CREATE INDEX idx_notebooks_created_by ON notebooks(created_by);

-- Trigger for updated_at
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. Add notebook_id to Notes Table
-- =====================================================

ALTER TABLE notes ADD COLUMN notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE;

CREATE INDEX idx_notes_notebook ON notes(notebook_id);

-- =====================================================
-- 3. RLS Policies for Notebooks
-- =====================================================

ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;

-- View: Users can view notebooks in their workspace
CREATE POLICY "Users can view workspace notebooks"
  ON notebooks FOR SELECT
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Create: Users can create notebooks in their workspace
CREATE POLICY "Users can create notebooks in their workspace"
  ON notebooks FOR INSERT
  WITH CHECK (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND created_by = auth.uid()
  );

-- Update: Creator or Admin/Leader can update
CREATE POLICY "Users can update notebooks"
  ON notebooks FOR UPDATE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader')
    )
  );

-- Delete: Creator or Admin/Leader can delete
CREATE POLICY "Users can delete notebooks"
  ON notebooks FOR DELETE
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    AND (
      created_by = auth.uid()
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader')
    )
  );
