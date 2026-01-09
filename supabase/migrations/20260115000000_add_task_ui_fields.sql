-- Add Task UI Fields Migration
-- Adds workspace_task_id, priority, and labels system for tasks

-- =====================================================
-- 1. Add workspace_task_id counter table
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_task_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Add new columns to tasks table
-- =====================================================

-- Add workspace_task_id column
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS workspace_task_id VARCHAR(20);

-- Add priority column with default 'medium'
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high'));

-- =====================================================
-- 3. Create task_labels table
-- =====================================================

CREATE TABLE IF NOT EXISTS task_labels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- hex color code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name) -- Prevent duplicate label names per workspace
);

-- =====================================================
-- 4. Create task_label_assignments junction table
-- =====================================================

CREATE TABLE IF NOT EXISTS task_label_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, label_id) -- Prevent duplicate assignments
);

-- =====================================================
-- 5. Function to generate workspace task ID
-- =====================================================

CREATE OR REPLACE FUNCTION generate_workspace_task_id()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_task_id TEXT;
BEGIN
  -- Get workspace_id from the task
  v_workspace_id := NEW.workspace_id;
  
  -- Initialize counter for workspace if it doesn't exist
  INSERT INTO workspace_task_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  -- Increment and get the counter
  UPDATE workspace_task_counters
  SET current_counter = current_counter + 1,
      updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  -- Generate the task ID in format TASK-XXXX (4 digits, zero-padded)
  v_task_id := 'TASK-' || LPAD(v_counter::TEXT, 4, '0');
  
  -- Assign to the new row
  NEW.workspace_task_id := v_task_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Create trigger for auto-generating workspace_task_id
-- =====================================================

DROP TRIGGER IF EXISTS trigger_generate_workspace_task_id ON tasks;

CREATE TRIGGER trigger_generate_workspace_task_id
  BEFORE INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.workspace_task_id IS NULL)
  EXECUTE FUNCTION generate_workspace_task_id();

-- =====================================================
-- 7. Backfill existing tasks with workspace_task_ids
-- =====================================================

DO $$
DECLARE
  task_record RECORD;
  v_counter INTEGER;
  v_task_id TEXT;
BEGIN
  -- Process each task that doesn't have a workspace_task_id
  FOR task_record IN 
    SELECT id, workspace_id 
    FROM tasks 
    WHERE workspace_task_id IS NULL
    ORDER BY created_at ASC
  LOOP
    -- Initialize counter for workspace if it doesn't exist
    INSERT INTO workspace_task_counters (workspace_id, current_counter)
    VALUES (task_record.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    -- Increment and get the counter
    UPDATE workspace_task_counters
    SET current_counter = current_counter + 1,
        updated_at = NOW()
    WHERE workspace_id = task_record.workspace_id
    RETURNING current_counter INTO v_counter;
    
    -- Generate the task ID
    v_task_id := 'TASK-' || LPAD(v_counter::TEXT, 4, '0');
    
    -- Update the task
    UPDATE tasks
    SET workspace_task_id = v_task_id
    WHERE id = task_record.id;
  END LOOP;
END $$;

-- =====================================================
-- 8. Add unique constraint on workspace_task_id per workspace
-- =====================================================

-- First, ensure no duplicates exist (should be guaranteed by the backfill)
-- Then add the unique constraint
ALTER TABLE tasks
ADD CONSTRAINT unique_workspace_task_id_per_workspace 
UNIQUE (workspace_id, workspace_task_id);

-- =====================================================
-- 9. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_task_id ON tasks(workspace_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_task_labels_workspace ON task_labels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_task ON task_label_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_label_assignments_label ON task_label_assignments(label_id);

-- =====================================================
-- 10. Add updated_at triggers
-- =====================================================

CREATE TRIGGER update_workspace_task_counters_updated_at 
  BEFORE UPDATE ON workspace_task_counters
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_labels_updated_at 
  BEFORE UPDATE ON task_labels
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE workspace_task_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_label_assignments ENABLE ROW LEVEL SECURITY;

-- workspace_task_counters: Users can view their workspace counter
CREATE POLICY "Users can view their workspace task counter"
  ON workspace_task_counters FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- task_labels: Users can view labels in their workspace
CREATE POLICY "Users can view labels in their workspace"
  ON task_labels FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

-- task_labels: Leaders can create labels
CREATE POLICY "Leaders can create labels"
  ON task_labels FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- task_labels: Leaders can update labels
CREATE POLICY "Leaders can update labels"
  ON task_labels FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- task_labels: Leaders can delete labels
CREATE POLICY "Leaders can delete labels"
  ON task_labels FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- task_label_assignments: Users can view label assignments for tasks in their workspace
CREATE POLICY "Users can view task label assignments in their workspace"
  ON task_label_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_label_assignments.task_id
      AND tasks.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- task_label_assignments: Leaders can create label assignments
CREATE POLICY "Leaders can create task label assignments"
  ON task_label_assignments FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_label_assignments.task_id
      AND tasks.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- task_label_assignments: Leaders can delete label assignments
CREATE POLICY "Leaders can delete task label assignments"
  ON task_label_assignments FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_label_assignments.task_id
      AND tasks.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
