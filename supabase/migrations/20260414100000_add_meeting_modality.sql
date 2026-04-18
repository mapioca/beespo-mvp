-- Add modality field to meetings
-- Captures whether a meeting is online, in-person, or hybrid.
-- Zoom/video configuration is deferred to the meeting workspace (ZoomMeetingSheet).

CREATE TYPE public.meeting_modality AS ENUM ('online', 'in_person', 'hybrid');

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS modality public.meeting_modality;

-- Update create_event_and_meeting RPC to accept modality
CREATE OR REPLACE FUNCTION public.create_event_and_meeting(
  p_event_title text,
  p_event_start_at timestamptz,
  p_event_end_at timestamptz,
  p_event_description text DEFAULT NULL,
  p_event_location text DEFAULT NULL,
  p_event_is_all_day boolean DEFAULT false,
  p_meeting_title text DEFAULT NULL,
  p_meeting_plan_type public.meeting_plan_type DEFAULT NULL,
  p_template_id uuid DEFAULT NULL,
  p_meeting_modality public.meeting_modality DEFAULT NULL
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
    plan_type,
    modality
  ) VALUES (
    v_workspace_id,
    p_template_id,
    COALESCE(NULLIF(p_meeting_title, ''), p_event_title),
    p_event_description,
    p_event_start_at,
    auth.uid(),
    v_event_id,
    false,
    p_meeting_plan_type,
    p_meeting_modality
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
  uuid,
  public.meeting_modality
) TO authenticated;
