CREATE TABLE IF NOT EXISTS public.sacrament_planner_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  meeting_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  meeting_type_overridden boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_sacrament_planner_entry_per_workspace_date UNIQUE (workspace_id, meeting_date)
);

CREATE INDEX IF NOT EXISTS idx_sacrament_planner_entries_workspace_date
  ON public.sacrament_planner_entries(workspace_id, meeting_date);

CREATE TRIGGER update_sacrament_planner_entries_updated_at
  BEFORE UPDATE ON public.sacrament_planner_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.sacrament_planner_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sacrament planner entries in their workspace"
  ON public.sacrament_planner_entries
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Users can create sacrament planner entries in their workspace"
  ON public.sacrament_planner_entries
  FOR INSERT
  WITH CHECK (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Users can update sacrament planner entries in their workspace"
  ON public.sacrament_planner_entries
  FOR UPDATE
  USING (workspace_id = public.get_auth_workspace_id())
  WITH CHECK (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Users can delete sacrament planner entries in their workspace"
  ON public.sacrament_planner_entries
  FOR DELETE
  USING (workspace_id = public.get_auth_workspace_id());
