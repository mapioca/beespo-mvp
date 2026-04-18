CREATE TYPE public.meeting_plan_type AS ENUM ('agenda', 'program');

ALTER TABLE public.meetings
  ADD COLUMN event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  ADD COLUMN is_legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN plan_type public.meeting_plan_type;

UPDATE public.meetings
SET is_legacy = true
WHERE is_legacy = false;

ALTER TABLE public.meetings
  ADD CONSTRAINT meetings_event_id_or_legacy
  CHECK (event_id IS NOT NULL OR is_legacy = true);

CREATE INDEX idx_meetings_event_id ON public.meetings(event_id);
CREATE INDEX idx_meetings_non_legacy ON public.meetings(is_legacy) WHERE is_legacy = false;
CREATE UNIQUE INDEX idx_meetings_one_per_event
  ON public.meetings(event_id) WHERE event_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_event_and_meeting(
  p_event_title text,
  p_event_start_at timestamptz,
  p_event_end_at timestamptz,
  p_event_description text DEFAULT NULL,
  p_event_location text DEFAULT NULL,
  p_event_is_all_day boolean DEFAULT false,
  p_meeting_title text DEFAULT NULL,
  p_meeting_plan_type public.meeting_plan_type DEFAULT NULL,
  p_template_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_workspace_id uuid;
  v_event_id uuid;
  v_meeting_id uuid;
BEGIN
  v_workspace_id := public.get_auth_workspace_id();

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create event-linked meetings';
  END IF;

  INSERT INTO public.events (
    workspace_id,
    title,
    description,
    location,
    start_at,
    end_at,
    is_all_day,
    created_by
  ) VALUES (
    v_workspace_id,
    p_event_title,
    p_event_description,
    p_event_location,
    p_event_start_at,
    p_event_end_at,
    COALESCE(p_event_is_all_day, false),
    auth.uid()
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.meetings (
    workspace_id,
    template_id,
    title,
    description,
    scheduled_date,
    created_by,
    event_id,
    is_legacy,
    plan_type
  ) VALUES (
    v_workspace_id,
    p_template_id,
    COALESCE(NULLIF(p_meeting_title, ''), p_event_title),
    p_event_description,
    p_event_start_at,
    auth.uid(),
    v_event_id,
    false,
    p_meeting_plan_type
  )
  RETURNING id INTO v_meeting_id;

  RETURN jsonb_build_object(
    'event_id', v_event_id,
    'meeting_id', v_meeting_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_event_and_meeting(
  text,
  timestamptz,
  timestamptz,
  text,
  text,
  boolean,
  text,
  public.meeting_plan_type,
  uuid
) TO authenticated;

CREATE OR REPLACE FUNCTION public.link_meeting_to_event(
  p_event_id uuid,
  p_meeting_title text DEFAULT NULL,
  p_plan_type public.meeting_plan_type DEFAULT NULL,
  p_template_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event public.events%ROWTYPE;
  v_meeting_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF public.get_auth_role() NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can link meetings to events';
  END IF;

  SELECT *
  INTO v_event
  FROM public.events
  WHERE id = p_event_id
    AND workspace_id = public.get_auth_workspace_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found in your workspace';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.meetings
    WHERE event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Event already has a linked meeting';
  END IF;

  INSERT INTO public.meetings (
    workspace_id,
    template_id,
    title,
    description,
    scheduled_date,
    created_by,
    event_id,
    is_legacy,
    plan_type
  ) VALUES (
    v_event.workspace_id,
    p_template_id,
    COALESCE(NULLIF(p_meeting_title, ''), v_event.title),
    v_event.description,
    v_event.start_at,
    auth.uid(),
    v_event.id,
    false,
    p_plan_type
  )
  RETURNING id INTO v_meeting_id;

  RETURN v_meeting_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_meeting_to_event(
  uuid,
  text,
  public.meeting_plan_type,
  uuid
) TO authenticated;
