CREATE TYPE public.assignee_type AS ENUM ('member', 'participant', 'speaker', 'external');

CREATE TABLE public.plan_assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  assignable_type text NOT NULL
    CHECK (assignable_type IN ('program_segment', 'agenda_discussion_item')),
  assignable_id uuid NOT NULL,
  assignee_type public.assignee_type NOT NULL,
  assignee_id uuid,
  assignee_name text,
  role text,
  is_confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT assignment_has_identity
    CHECK (assignee_id IS NOT NULL OR assignee_name IS NOT NULL)
);

CREATE INDEX idx_plan_assignments_workspace ON public.plan_assignments(workspace_id);
CREATE INDEX idx_plan_assignments_assignable ON public.plan_assignments(assignable_type, assignable_id);
CREATE INDEX idx_plan_assignments_assignee ON public.plan_assignments(assignee_id);

CREATE TRIGGER update_plan_assignments_updated_at
  BEFORE UPDATE ON public.plan_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.plan_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view plan assignments in their workspace"
  ON public.plan_assignments
  FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can create plan assignments"
  ON public.plan_assignments
  FOR INSERT
  WITH CHECK (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can update plan assignments"
  ON public.plan_assignments
  FOR UPDATE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE POLICY "Leaders and admins can delete plan assignments"
  ON public.plan_assignments
  FOR DELETE
  USING (
    workspace_id = public.get_auth_workspace_id()
    AND public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
  );

CREATE OR REPLACE FUNCTION public.create_agenda_plan(
  p_meeting_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_objectives jsonb DEFAULT '[]'::jsonb,
  p_discussion_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meeting public.meetings%ROWTYPE;
  v_doc_id uuid;
  v_item jsonb;
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create agenda plans';
  END IF;

  SELECT *
  INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  IF v_meeting.is_legacy THEN
    RAISE EXCEPTION 'Legacy meetings cannot use agenda plans';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agenda_documents WHERE meeting_id = p_meeting_id)
    OR EXISTS (SELECT 1 FROM public.program_documents WHERE meeting_id = p_meeting_id) THEN
    RAISE EXCEPTION 'Meeting already has a plan';
  END IF;

  UPDATE public.meetings
  SET plan_type = 'agenda'
  WHERE id = p_meeting_id;

  INSERT INTO public.agenda_documents (
    meeting_id,
    workspace_id,
    title,
    description,
    created_by
  ) VALUES (
    p_meeting_id,
    v_meeting.workspace_id,
    p_title,
    p_description,
    auth.uid()
  )
  RETURNING id INTO v_doc_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_objectives, '[]'::jsonb))
  LOOP
    INSERT INTO public.agenda_objectives (
      agenda_document_id,
      title,
      description,
      order_index
    ) VALUES (
      v_doc_id,
      COALESCE(v_item->>'title', 'Untitled objective'),
      v_item->>'description',
      COALESCE((v_item->>'order_index')::integer, 0)
    );
  END LOOP;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_discussion_items, '[]'::jsonb))
  LOOP
    INSERT INTO public.agenda_discussion_items (
      agenda_document_id,
      topic,
      estimated_time,
      notes,
      order_index,
      status,
      catalog_item_id
    ) VALUES (
      v_doc_id,
      COALESCE(v_item->>'topic', 'Untitled discussion'),
      COALESCE((v_item->>'estimated_time')::integer, 5),
      v_item->>'notes',
      COALESCE((v_item->>'order_index')::integer, 0),
      COALESCE(v_item->>'status', 'pending'),
      CASE
        WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
        ELSE (v_item->>'catalog_item_id')::uuid
      END
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_agenda_plan(
  p_agenda_document_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status public.plan_document_status DEFAULT NULL,
  p_objectives jsonb DEFAULT NULL,
  p_discussion_items jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc public.agenda_documents%ROWTYPE;
  v_item jsonb;
  v_valid_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can update agenda plans';
  END IF;

  SELECT *
  INTO v_doc
  FROM public.agenda_documents
  WHERE id = p_agenda_document_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agenda document not found';
  END IF;

  UPDATE public.agenda_documents
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status)
  WHERE id = p_agenda_document_id;

  IF p_objectives IS NOT NULL THEN
    SELECT COALESCE(array_agg((value->>'id')::uuid), ARRAY[]::uuid[])
    INTO v_valid_ids
    FROM jsonb_array_elements(p_objectives) value
    WHERE value->>'id' ~ '^[0-9a-f-]{36}$';

    DELETE FROM public.agenda_objectives
    WHERE agenda_document_id = p_agenda_document_id
      AND (array_length(v_valid_ids, 1) IS NULL OR id != ALL(v_valid_ids));

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_objectives)
    LOOP
      IF v_item->>'id' ~ '^[0-9a-f-]{36}$' THEN
        UPDATE public.agenda_objectives
        SET
          title = COALESCE(v_item->>'title', title),
          description = v_item->>'description',
          order_index = COALESCE((v_item->>'order_index')::integer, order_index)
        WHERE id = (v_item->>'id')::uuid;
      ELSE
        INSERT INTO public.agenda_objectives (
          agenda_document_id,
          title,
          description,
          order_index
        ) VALUES (
          p_agenda_document_id,
          COALESCE(v_item->>'title', 'Untitled objective'),
          v_item->>'description',
          COALESCE((v_item->>'order_index')::integer, 0)
        );
      END IF;
    END LOOP;
  END IF;

  IF p_discussion_items IS NOT NULL THEN
    SELECT COALESCE(array_agg((value->>'id')::uuid), ARRAY[]::uuid[])
    INTO v_valid_ids
    FROM jsonb_array_elements(p_discussion_items) value
    WHERE value->>'id' ~ '^[0-9a-f-]{36}$';

    DELETE FROM public.agenda_discussion_items
    WHERE agenda_document_id = p_agenda_document_id
      AND (array_length(v_valid_ids, 1) IS NULL OR id != ALL(v_valid_ids));

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_discussion_items)
    LOOP
      IF v_item->>'id' ~ '^[0-9a-f-]{36}$' THEN
        UPDATE public.agenda_discussion_items
        SET
          topic = COALESCE(v_item->>'topic', topic),
          estimated_time = COALESCE((v_item->>'estimated_time')::integer, estimated_time),
          notes = v_item->>'notes',
          order_index = COALESCE((v_item->>'order_index')::integer, order_index),
          status = COALESCE(v_item->>'status', status),
          catalog_item_id = CASE
            WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
            ELSE (v_item->>'catalog_item_id')::uuid
          END
        WHERE id = (v_item->>'id')::uuid;
      ELSE
        INSERT INTO public.agenda_discussion_items (
          agenda_document_id,
          topic,
          estimated_time,
          notes,
          order_index,
          status,
          catalog_item_id
        ) VALUES (
          p_agenda_document_id,
          COALESCE(v_item->>'topic', 'Untitled discussion'),
          COALESCE((v_item->>'estimated_time')::integer, 5),
          v_item->>'notes',
          COALESCE((v_item->>'order_index')::integer, 0),
          COALESCE(v_item->>'status', 'pending'),
          CASE
            WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
            ELSE (v_item->>'catalog_item_id')::uuid
          END
        );
      END IF;
    END LOOP;
  END IF;

  RETURN p_agenda_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_program_plan(
  p_meeting_id uuid,
  p_title text,
  p_description text DEFAULT NULL,
  p_style_config jsonb DEFAULT '{}'::jsonb,
  p_segments jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_meeting public.meetings%ROWTYPE;
  v_doc_id uuid;
  v_item jsonb;
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create program plans';
  END IF;

  SELECT *
  INTO v_meeting
  FROM public.meetings
  WHERE id = p_meeting_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Meeting not found';
  END IF;

  IF v_meeting.is_legacy THEN
    RAISE EXCEPTION 'Legacy meetings cannot use program plans';
  END IF;

  IF EXISTS (SELECT 1 FROM public.agenda_documents WHERE meeting_id = p_meeting_id)
    OR EXISTS (SELECT 1 FROM public.program_documents WHERE meeting_id = p_meeting_id) THEN
    RAISE EXCEPTION 'Meeting already has a plan';
  END IF;

  UPDATE public.meetings
  SET plan_type = 'program'
  WHERE id = p_meeting_id;

  INSERT INTO public.program_documents (
    meeting_id,
    workspace_id,
    title,
    description,
    style_config,
    created_by
  ) VALUES (
    p_meeting_id,
    v_meeting.workspace_id,
    p_title,
    p_description,
    COALESCE(p_style_config, '{}'::jsonb),
    auth.uid()
  )
  RETURNING id INTO v_doc_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_segments, '[]'::jsonb))
  LOOP
    INSERT INTO public.program_segments (
      program_document_id,
      title,
      estimated_time,
      description,
      segment_type,
      order_index,
      catalog_item_id,
      hymn_id
    ) VALUES (
      v_doc_id,
      COALESCE(v_item->>'title', 'Untitled segment'),
      COALESCE((v_item->>'estimated_time')::integer, 5),
      v_item->>'description',
      COALESCE((v_item->>'segment_type')::public.program_segment_type, 'custom'::public.program_segment_type),
      COALESCE((v_item->>'order_index')::integer, 0),
      CASE
        WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
        ELSE (v_item->>'catalog_item_id')::uuid
      END,
      CASE
        WHEN v_item->>'hymn_id' IS NULL OR v_item->>'hymn_id' = '' THEN NULL
        ELSE (v_item->>'hymn_id')::uuid
      END
    );
  END LOOP;

  RETURN v_doc_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_program_plan(
  p_program_document_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_style_config jsonb DEFAULT NULL,
  p_status public.plan_document_status DEFAULT NULL,
  p_segments jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_doc public.program_documents%ROWTYPE;
  v_item jsonb;
  v_valid_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can update program plans';
  END IF;

  SELECT *
  INTO v_doc
  FROM public.program_documents
  WHERE id = p_program_document_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Program document not found';
  END IF;

  UPDATE public.program_documents
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    style_config = COALESCE(p_style_config, style_config),
    status = COALESCE(p_status, status)
  WHERE id = p_program_document_id;

  IF p_segments IS NOT NULL THEN
    SELECT COALESCE(array_agg((value->>'id')::uuid), ARRAY[]::uuid[])
    INTO v_valid_ids
    FROM jsonb_array_elements(p_segments) value
    WHERE value->>'id' ~ '^[0-9a-f-]{36}$';

    DELETE FROM public.program_segments
    WHERE program_document_id = p_program_document_id
      AND (array_length(v_valid_ids, 1) IS NULL OR id != ALL(v_valid_ids));

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_segments)
    LOOP
      IF v_item->>'id' ~ '^[0-9a-f-]{36}$' THEN
        UPDATE public.program_segments
        SET
          title = COALESCE(v_item->>'title', title),
          estimated_time = COALESCE((v_item->>'estimated_time')::integer, estimated_time),
          description = v_item->>'description',
          segment_type = COALESCE((v_item->>'segment_type')::public.program_segment_type, segment_type),
          order_index = COALESCE((v_item->>'order_index')::integer, order_index),
          catalog_item_id = CASE
            WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
            ELSE (v_item->>'catalog_item_id')::uuid
          END,
          hymn_id = CASE
            WHEN v_item->>'hymn_id' IS NULL OR v_item->>'hymn_id' = '' THEN NULL
            ELSE (v_item->>'hymn_id')::uuid
          END
        WHERE id = (v_item->>'id')::uuid;
      ELSE
        INSERT INTO public.program_segments (
          program_document_id,
          title,
          estimated_time,
          description,
          segment_type,
          order_index,
          catalog_item_id,
          hymn_id
        ) VALUES (
          p_program_document_id,
          COALESCE(v_item->>'title', 'Untitled segment'),
          COALESCE((v_item->>'estimated_time')::integer, 5),
          v_item->>'description',
          COALESCE((v_item->>'segment_type')::public.program_segment_type, 'custom'::public.program_segment_type),
          COALESCE((v_item->>'order_index')::integer, 0),
          CASE
            WHEN v_item->>'catalog_item_id' IS NULL OR v_item->>'catalog_item_id' = '' THEN NULL
            ELSE (v_item->>'catalog_item_id')::uuid
          END,
          CASE
            WHEN v_item->>'hymn_id' IS NULL OR v_item->>'hymn_id' = '' THEN NULL
            ELSE (v_item->>'hymn_id')::uuid
          END
        );
      END IF;
    END LOOP;
  END IF;

  RETURN p_program_document_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.link_task_to_discussion_item(
  p_discussion_item_id uuid,
  p_task_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.agenda_discussion_items adi
    JOIN public.agenda_documents ad ON ad.id = adi.agenda_document_id
    WHERE adi.id = p_discussion_item_id
      AND ad.workspace_id = public.get_auth_workspace_id()
  ) THEN
    RAISE EXCEPTION 'Discussion item not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.tasks t
    WHERE t.id = p_task_id
      AND t.workspace_id = public.get_auth_workspace_id()
  ) THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  INSERT INTO public.agenda_discussion_tasks (agenda_discussion_item_id, task_id)
  VALUES (p_discussion_item_id, p_task_id)
  ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_plan_participant(
  p_assignable_type text,
  p_assignable_id uuid,
  p_assignee_type public.assignee_type,
  p_assignee_id uuid DEFAULT NULL,
  p_assignee_name text DEFAULT NULL,
  p_role text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id uuid := public.get_auth_workspace_id();
  v_assignment_id uuid;
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can assign plan participants';
  END IF;

  IF p_assignable_type = 'agenda_discussion_item' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.agenda_discussion_items adi
      JOIN public.agenda_documents ad ON ad.id = adi.agenda_document_id
      WHERE adi.id = p_assignable_id
        AND ad.workspace_id = v_workspace_id
    ) THEN
      RAISE EXCEPTION 'Agenda discussion item not found';
    END IF;
  ELSIF p_assignable_type = 'program_segment' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.program_segments ps
      JOIN public.program_documents pd ON pd.id = ps.program_document_id
      WHERE ps.id = p_assignable_id
        AND pd.workspace_id = v_workspace_id
    ) THEN
      RAISE EXCEPTION 'Program segment not found';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid assignable type';
  END IF;

  INSERT INTO public.plan_assignments (
    workspace_id,
    assignable_type,
    assignable_id,
    assignee_type,
    assignee_id,
    assignee_name,
    role
  ) VALUES (
    v_workspace_id,
    p_assignable_type,
    p_assignable_id,
    p_assignee_type,
    p_assignee_id,
    p_assignee_name,
    p_role
  )
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_agenda_plan(uuid, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_agenda_plan(uuid, text, text, public.plan_document_status, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_program_plan(uuid, text, text, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_program_plan(uuid, text, text, jsonb, public.plan_document_status, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_task_to_discussion_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_plan_participant(text, uuid, public.assignee_type, uuid, text, text) TO authenticated;
