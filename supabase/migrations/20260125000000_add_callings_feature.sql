-- Beespo MVP - Callings Feature Migration
-- Purpose: Brainstorming candidates and tracking calling lifecycle
-- Philosophy: We are a scratchpad - LCR is the final destination
-- Privacy: We only store names, no emails/phones/member IDs

-- =====================================================
-- TABLE 1: candidate_names (Autocomplete Pool)
-- =====================================================
-- Lightweight name pool for faster data entry

CREATE TABLE candidate_names (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, name)
);

-- =====================================================
-- TABLE 2: callings (The Roles)
-- =====================================================

CREATE TABLE callings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  organization TEXT,
  is_filled BOOLEAN DEFAULT false,
  filled_by UUID REFERENCES candidate_names(id) ON DELETE SET NULL,
  filled_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 3: calling_candidates (The Brainstorming Layer)
-- =====================================================
-- Links names to potential roles during brainstorming

CREATE TABLE calling_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calling_id UUID REFERENCES callings(id) ON DELETE CASCADE NOT NULL,
  candidate_name_id UUID REFERENCES candidate_names(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN (
    'proposed',
    'discussing',
    'selected',
    'archived'
  )),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(calling_id, candidate_name_id)
);

-- =====================================================
-- TABLE 4: calling_processes (The Lifecycle Tracker)
-- =====================================================
-- Created when a candidate is "Selected", tracks official steps

CREATE TABLE calling_processes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calling_id UUID REFERENCES callings(id) ON DELETE CASCADE NOT NULL,
  candidate_name_id UUID REFERENCES candidate_names(id) ON DELETE CASCADE NOT NULL,
  calling_candidate_id UUID REFERENCES calling_candidates(id) ON DELETE SET NULL,
  current_stage TEXT NOT NULL DEFAULT 'defined' CHECK (current_stage IN (
    'defined',
    'approved',
    'extended',
    'accepted',
    'sustained',
    'set_apart',
    'recorded_lcr'
  )),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'completed',
    'dropped'
  )),
  dropped_reason TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 5: calling_history_log (Audit Trail)
-- =====================================================
-- Tracks all status/stage changes for timeline view

CREATE TABLE calling_history_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calling_process_id UUID REFERENCES calling_processes(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'process_started',
    'stage_changed',
    'status_changed',
    'comment_added',
    'task_created',
    'task_completed'
  )),
  from_value TEXT,
  to_value TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE 6: calling_comments (Discussion Notes)
-- =====================================================

CREATE TABLE calling_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  calling_process_id UUID REFERENCES calling_processes(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODIFY TASKS TABLE
-- =====================================================
-- Add link to calling_process for associated tasks

ALTER TABLE tasks
ADD COLUMN calling_process_id UUID REFERENCES calling_processes(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_candidate_names_workspace ON candidate_names(workspace_id);
CREATE INDEX idx_candidate_names_name ON candidate_names(name);

CREATE INDEX idx_callings_workspace ON callings(workspace_id);
CREATE INDEX idx_callings_organization ON callings(organization);
CREATE INDEX idx_callings_is_filled ON callings(is_filled);

CREATE INDEX idx_calling_candidates_calling ON calling_candidates(calling_id);
CREATE INDEX idx_calling_candidates_candidate ON calling_candidates(candidate_name_id);
CREATE INDEX idx_calling_candidates_status ON calling_candidates(status);

CREATE INDEX idx_calling_processes_calling ON calling_processes(calling_id);
CREATE INDEX idx_calling_processes_candidate ON calling_processes(candidate_name_id);
CREATE INDEX idx_calling_processes_stage ON calling_processes(current_stage);
CREATE INDEX idx_calling_processes_status ON calling_processes(status);

CREATE INDEX idx_calling_history_log_process ON calling_history_log(calling_process_id);
CREATE INDEX idx_calling_history_log_action ON calling_history_log(action);

CREATE INDEX idx_calling_comments_process ON calling_comments(calling_process_id);

CREATE INDEX idx_tasks_calling_process ON tasks(calling_process_id);

-- =====================================================
-- UPDATED_AT TRIGGERS
-- =====================================================

CREATE TRIGGER update_candidate_names_updated_at
  BEFORE UPDATE ON candidate_names
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_callings_updated_at
  BEFORE UPDATE ON callings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calling_candidates_updated_at
  BEFORE UPDATE ON calling_candidates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calling_processes_updated_at
  BEFORE UPDATE ON calling_processes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calling_comments_updated_at
  BEFORE UPDATE ON calling_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE candidate_names ENABLE ROW LEVEL SECURITY;
ALTER TABLE callings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calling_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE calling_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calling_history_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE calling_comments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- candidate_names Policies
-- =====================================================

CREATE POLICY "Users can view candidate names in their workspace"
  ON candidate_names FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create candidate names"
  ON candidate_names FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update candidate names"
  ON candidate_names FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete candidate names"
  ON candidate_names FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- callings Policies
-- =====================================================

CREATE POLICY "Users can view callings in their workspace"
  ON callings FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Leaders and admins can create callings"
  ON callings FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can update callings"
  ON callings FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Leaders and admins can delete callings"
  ON callings FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- calling_candidates Policies
-- =====================================================

CREATE POLICY "Users can view calling candidates in their workspace"
  ON calling_candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_candidates.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can create calling candidates"
  ON calling_candidates FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_candidates.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can update calling candidates"
  ON calling_candidates FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_candidates.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can delete calling candidates"
  ON calling_candidates FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_candidates.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- calling_processes Policies
-- =====================================================

CREATE POLICY "Users can view calling processes in their workspace"
  ON calling_processes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_processes.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can create calling processes"
  ON calling_processes FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_processes.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can update calling processes"
  ON calling_processes FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_processes.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can delete calling processes"
  ON calling_processes FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM callings
      WHERE callings.id = calling_processes.calling_id
      AND callings.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- calling_history_log Policies
-- =====================================================

CREATE POLICY "Users can view calling history in their workspace"
  ON calling_history_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_history_log.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can create calling history"
  ON calling_history_log FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_history_log.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- History is immutable - no update or delete policies

-- =====================================================
-- calling_comments Policies
-- =====================================================

CREATE POLICY "Users can view calling comments in their workspace"
  ON calling_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_comments.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Leaders and admins can create calling comments"
  ON calling_comments FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_comments.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Creators can update their own comments"
  ON calling_comments FOR UPDATE
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_comments.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Creators and admins can delete calling comments"
  ON calling_comments FOR DELETE
  USING (
    (created_by = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin') AND
    EXISTS (
      SELECT 1 FROM calling_processes cp
      JOIN callings c ON cp.calling_id = c.id
      WHERE cp.id = calling_comments.calling_process_id
      AND c.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- =====================================================
-- HELPER FUNCTION: Log Stage Change
-- =====================================================

CREATE OR REPLACE FUNCTION log_calling_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO calling_history_log (
      calling_process_id,
      action,
      from_value,
      to_value,
      created_by
    ) VALUES (
      NEW.id,
      'stage_changed',
      OLD.current_stage,
      NEW.current_stage,
      auth.uid()
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO calling_history_log (
      calling_process_id,
      action,
      from_value,
      to_value,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      CASE WHEN NEW.status = 'dropped' THEN NEW.dropped_reason ELSE NULL END,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calling_process_stage_change_trigger
  AFTER UPDATE ON calling_processes
  FOR EACH ROW EXECUTE FUNCTION log_calling_stage_change();

-- =====================================================
-- HELPER FUNCTION: Log Process Started
-- =====================================================

CREATE OR REPLACE FUNCTION log_calling_process_started()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO calling_history_log (
    calling_process_id,
    action,
    to_value,
    created_by
  ) VALUES (
    NEW.id,
    'process_started',
    NEW.current_stage,
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calling_process_started_trigger
  AFTER INSERT ON calling_processes
  FOR EACH ROW EXECUTE FUNCTION log_calling_process_started();

-- =====================================================
-- VIEW: Calling Summary
-- =====================================================

CREATE OR REPLACE VIEW calling_summary AS
SELECT
  c.*,
  cn.name as filled_by_name,
  COUNT(DISTINCT cc.id) as candidate_count,
  COUNT(DISTINCT cp.id) FILTER (WHERE cp.status = 'active') as active_process_count
FROM callings c
LEFT JOIN candidate_names cn ON c.filled_by = cn.id
LEFT JOIN calling_candidates cc ON c.id = cc.calling_id
LEFT JOIN calling_processes cp ON c.id = cp.calling_id
GROUP BY c.id, cn.name;
