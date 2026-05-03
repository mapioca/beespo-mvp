ALTER TABLE public.templates
  ADD COLUMN template_kind text DEFAULT 'agenda'
    CHECK (template_kind IN ('agenda', 'program', 'event', 'table', 'form')),
  ADD COLUMN template_schema_version integer DEFAULT 1,
  ADD COLUMN visibility text DEFAULT 'workspace'
    CHECK (visibility IN ('workspace', 'public', 'private')),
  ADD COLUMN source_entity_type text,
  ADD COLUMN source_entity_id uuid,
  ADD COLUMN version integer DEFAULT 1,
  ADD COLUMN is_active boolean DEFAULT true,
  ADD COLUMN content jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN defaults jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

UPDATE public.templates
SET visibility = CASE
  WHEN is_public THEN 'public'
  ELSE 'workspace'
END
WHERE visibility IS NULL OR visibility = 'workspace';

UPDATE public.templates
SET template_kind = 'agenda'
WHERE template_kind IS NULL;

CREATE OR REPLACE FUNCTION public.instantiate_template_as_plan(
  p_template_id uuid,
  p_meeting_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template public.templates%ROWTYPE;
  v_doc_id uuid;
BEGIN
  SELECT *
  INTO v_template
  FROM public.templates
  WHERE id = p_template_id
    AND (
      workspace_id = public.get_auth_workspace_id()
      OR workspace_id IS NULL
      OR visibility = 'public'
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found';
  END IF;

  IF COALESCE(v_template.template_kind, 'agenda') = 'program' THEN
    v_doc_id := public.create_program_plan(
      p_meeting_id,
      COALESCE(v_template.name, 'Program'),
      v_template.description,
      COALESCE(v_template.defaults->'style_config', '{}'::jsonb),
      COALESCE(v_template.content->'segments', '[]'::jsonb)
    );
  ELSE
    v_doc_id := public.create_agenda_plan(
      p_meeting_id,
      COALESCE(v_template.name, 'Agenda'),
      v_template.description,
      COALESCE(v_template.content->'objectives', '[]'::jsonb),
      COALESCE(v_template.content->'discussion_items', '[]'::jsonb)
    );
  END IF;

  RETURN v_doc_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.instantiate_template_as_plan(uuid, uuid) TO authenticated;
