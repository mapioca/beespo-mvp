CREATE TABLE public.program_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  style_config jsonb DEFAULT '{}'::jsonb,
  status public.plan_document_status DEFAULT 'draft' NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_program_per_meeting UNIQUE (meeting_id)
);

CREATE TYPE public.program_segment_type AS ENUM (
  'prayer',
  'hymn',
  'spiritual_thought',
  'business',
  'speaker',
  'musical_number',
  'rest_hymn',
  'custom',
  'sacrament',
  'welcome',
  'closing',
  'announcement'
);

CREATE TABLE public.program_segments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  program_document_id uuid NOT NULL REFERENCES public.program_documents(id) ON DELETE CASCADE,
  title text NOT NULL,
  estimated_time integer NOT NULL DEFAULT 5,
  description text,
  segment_type public.program_segment_type DEFAULT 'custom' NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  catalog_item_id uuid REFERENCES public.catalog_items(id) ON DELETE SET NULL,
  hymn_id uuid REFERENCES public.hymns(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_program_documents_workspace ON public.program_documents(workspace_id);
CREATE INDEX idx_program_segments_document ON public.program_segments(program_document_id, order_index);

CREATE TRIGGER update_program_documents_updated_at
  BEFORE UPDATE ON public.program_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_segments_updated_at
  BEFORE UPDATE ON public.program_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.program_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view program documents in their workspace"
  ON public.program_documents
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can create program documents"
  ON public.program_documents
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can update program documents"
  ON public.program_documents
  FOR UPDATE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can delete program documents"
  ON public.program_documents
  FOR DELETE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Users can view program segments through program documents"
  ON public.program_segments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.program_documents pd
      WHERE pd.id = program_document_id
        AND pd.workspace_id = public.get_auth_workspace_id()
    )
  );

CREATE POLICY "Leaders and admins can manage program segments"
  ON public.program_segments
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.program_documents pd
      WHERE pd.id = program_document_id
        AND pd.workspace_id = public.get_auth_workspace_id()
    )
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1
      FROM public.program_documents pd
      WHERE pd.id = program_document_id
        AND pd.workspace_id = public.get_auth_workspace_id()
    )
  );
