-- Fix RLS issue with workspace_task_id generation
-- The trigger function needs SECURITY DEFINER to bypass RLS when inserting counters

-- Drop and recreate the function with SECURITY DEFINER
CREATE OR REPLACE FUNCTION generate_workspace_task_id()
RETURNS TRIGGER 
SECURITY DEFINER  -- This allows the function to bypass RLS
SET search_path = public
AS $$
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
