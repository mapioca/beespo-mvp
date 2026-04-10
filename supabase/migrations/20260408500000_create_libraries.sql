CREATE TABLE public.discussion_item_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  topic text NOT NULL,
  estimated_time integer DEFAULT 15,
  notes_template text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.segment_library (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  estimated_time integer DEFAULT 5,
  description text,
  segment_type public.program_segment_type DEFAULT 'custom',
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_discussion_item_library_workspace ON public.discussion_item_library(workspace_id);
CREATE INDEX idx_segment_library_workspace ON public.segment_library(workspace_id);

CREATE TRIGGER update_discussion_item_library_updated_at
  BEFORE UPDATE ON public.discussion_item_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segment_library_updated_at
  BEFORE UPDATE ON public.segment_library
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.discussion_item_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view discussion item library in their workspace"
  ON public.discussion_item_library
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can manage discussion item library"
  ON public.discussion_item_library
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  )
  WITH CHECK (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Users can view segment library in their workspace"
  ON public.segment_library
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can manage segment library"
  ON public.segment_library
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  )
  WITH CHECK (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );
