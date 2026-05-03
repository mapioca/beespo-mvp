-- Guard agenda creation against partially migrated databases where
-- public.program_documents is not present yet.
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
  v_meeting record;
  v_doc_id uuid;
  v_item jsonb;
  v_program_table_exists boolean;
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

  SELECT to_regclass('public.program_documents') IS NOT NULL
  INTO v_program_table_exists;

  IF EXISTS (SELECT 1 FROM public.agenda_documents WHERE meeting_id = p_meeting_id)
    OR (
      v_program_table_exists
      AND EXISTS (SELECT 1 FROM public.program_documents WHERE meeting_id = p_meeting_id)
    ) THEN
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
