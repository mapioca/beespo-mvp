CREATE OR REPLACE FUNCTION public.rebuild_legacy_meeting(
  p_legacy_meeting_id uuid,
  p_target_plan_type public.meeting_plan_type DEFAULT 'agenda'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_legacy_meeting public.meetings%ROWTYPE;
  v_created jsonb;
  v_new_event_id uuid;
  v_new_meeting_id uuid;
  v_plan_document_id uuid;
  v_item record;
  v_agenda_doc_id uuid;
  v_program_doc_id uuid;
BEGIN
  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can rebuild legacy meetings';
  END IF;

  SELECT *
  INTO v_legacy_meeting
  FROM public.meetings
  WHERE id = p_legacy_meeting_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Legacy meeting not found';
  END IF;

  IF NOT v_legacy_meeting.is_legacy THEN
    RAISE EXCEPTION 'Meeting is not legacy';
  END IF;

  v_created := public.create_event_and_meeting(
    v_legacy_meeting.title,
    v_legacy_meeting.scheduled_date,
    COALESCE(v_legacy_meeting.scheduled_date + interval '1 hour', v_legacy_meeting.scheduled_date),
    v_legacy_meeting.description,
    NULL,
    false,
    v_legacy_meeting.title,
    p_target_plan_type,
    v_legacy_meeting.template_id
  );

  v_new_event_id := (v_created->>'event_id')::uuid;
  v_new_meeting_id := (v_created->>'meeting_id')::uuid;

  IF p_target_plan_type = 'program' THEN
    v_program_doc_id := public.create_program_plan(
      v_new_meeting_id,
      v_legacy_meeting.title,
      v_legacy_meeting.description,
      COALESCE(v_legacy_meeting.program_style, '{}'::jsonb),
      '[]'::jsonb
    );

    FOR v_item IN
      SELECT title, description, duration_minutes, order_index, hymn_id, item_type
      FROM public.agenda_items
      WHERE meeting_id = p_legacy_meeting_id
      ORDER BY order_index
    LOOP
      INSERT INTO public.program_segments (
        program_document_id,
        title,
        estimated_time,
        description,
        segment_type,
        order_index,
        hymn_id
      ) VALUES (
        v_program_doc_id,
        COALESCE(v_item.title, 'Legacy segment'),
        COALESCE(v_item.duration_minutes, 5),
        v_item.description,
        CASE
          WHEN v_item.item_type = 'speaker' THEN 'speaker'::public.program_segment_type
          WHEN v_item.hymn_id IS NOT NULL THEN 'hymn'::public.program_segment_type
          WHEN v_item.item_type = 'announcement' THEN 'announcement'::public.program_segment_type
          WHEN v_item.item_type = 'business' THEN 'business'::public.program_segment_type
          ELSE 'custom'::public.program_segment_type
        END,
        COALESCE(v_item.order_index, 0),
        v_item.hymn_id
      );
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM public.program_segments
      WHERE program_document_id = v_program_doc_id
    ) AND (
      v_legacy_meeting.presiding_name IS NOT NULL
      OR v_legacy_meeting.conducting_name IS NOT NULL
      OR v_legacy_meeting.chorister_name IS NOT NULL
      OR v_legacy_meeting.organist_name IS NOT NULL
    ) THEN
      INSERT INTO public.program_segments (
        program_document_id,
        title,
        estimated_time,
        description,
        segment_type,
        order_index
      ) VALUES (
        v_program_doc_id,
        'Leadership assignments',
        5,
        'Recovered from legacy meeting metadata',
        'custom',
        0
      );
    END IF;

    v_plan_document_id := v_program_doc_id;
  ELSE
    v_agenda_doc_id := public.create_agenda_plan(
      v_new_meeting_id,
      v_legacy_meeting.title,
      COALESCE(v_legacy_meeting.description, v_legacy_meeting.markdown_agenda),
      CASE
        WHEN COALESCE(v_legacy_meeting.markdown_agenda, '') = '' THEN '[]'::jsonb
        ELSE jsonb_build_array(
          jsonb_build_object(
            'title', 'Recovered notes',
            'description', left(v_legacy_meeting.markdown_agenda, 1000),
            'order_index', 0
          )
        )
      END,
      '[]'::jsonb
    );

    FOR v_item IN
      SELECT title, item_notes, duration_minutes, order_index
      FROM public.agenda_items
      WHERE meeting_id = p_legacy_meeting_id
      ORDER BY order_index
    LOOP
      INSERT INTO public.agenda_discussion_items (
        agenda_document_id,
        topic,
        estimated_time,
        notes,
        order_index
      ) VALUES (
        v_agenda_doc_id,
        COALESCE(v_item.title, 'Legacy item'),
        COALESCE(v_item.duration_minutes, 5),
        v_item.item_notes,
        COALESCE(v_item.order_index, 0)
      );
    END LOOP;

    IF NOT EXISTS (
      SELECT 1
      FROM public.agenda_discussion_items
      WHERE agenda_document_id = v_agenda_doc_id
    ) AND (
      v_legacy_meeting.presiding_name IS NOT NULL
      OR v_legacy_meeting.conducting_name IS NOT NULL
      OR v_legacy_meeting.chorister_name IS NOT NULL
      OR v_legacy_meeting.organist_name IS NOT NULL
    ) THEN
      INSERT INTO public.agenda_discussion_items (
        agenda_document_id,
        topic,
        estimated_time,
        notes,
        order_index
      ) VALUES (
        v_agenda_doc_id,
        'Leadership assignments',
        5,
        'Recovered from legacy meeting metadata',
        0
      );
    END IF;

    v_plan_document_id := v_agenda_doc_id;
  END IF;

  INSERT INTO public.plan_assignments (
    workspace_id,
    assignable_type,
    assignable_id,
    assignee_type,
    assignee_name,
    role,
    is_confirmed
  )
  SELECT
    v_legacy_meeting.workspace_id,
    CASE
      WHEN p_target_plan_type = 'program' THEN 'program_segment'
      ELSE 'agenda_discussion_item'
    END,
    CASE
      WHEN p_target_plan_type = 'program' THEN (
        SELECT id FROM public.program_segments
        WHERE program_document_id = v_plan_document_id
        ORDER BY order_index
        LIMIT 1
      )
      ELSE (
        SELECT id FROM public.agenda_discussion_items
        WHERE agenda_document_id = v_plan_document_id
        ORDER BY order_index
        LIMIT 1
      )
    END,
    'external',
    role_name,
    role_key,
    true
  FROM (
    VALUES
      ('presiding', v_legacy_meeting.presiding_name),
      ('conducting', v_legacy_meeting.conducting_name),
      ('chorister', v_legacy_meeting.chorister_name),
      ('organist', v_legacy_meeting.organist_name)
  ) AS roles(role_key, role_name)
  WHERE role_name IS NOT NULL;

  RETURN jsonb_build_object(
    'event_id', v_new_event_id,
    'meeting_id', v_new_meeting_id,
    'plan_document_id', v_plan_document_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rebuild_legacy_meeting(uuid, public.meeting_plan_type) TO authenticated;
