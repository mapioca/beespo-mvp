-- Add "draft" as a valid meetings status
ALTER TABLE public.meetings
DROP CONSTRAINT IF EXISTS meetings_status_check;

ALTER TABLE public.meetings
ADD CONSTRAINT meetings_status_check
CHECK (
  status = ANY (
    ARRAY[
      'draft'::text,
      'scheduled'::text,
      'in_progress'::text,
      'completed'::text,
      'cancelled'::text
    ]
  )
);

-- Create draft meetings using the existing agenda creation RPC, then mark status=draft
CREATE OR REPLACE FUNCTION public.create_meeting_draft_with_agenda(
  p_template_id uuid,
  p_title text,
  p_scheduled_date timestamp with time zone,
  p_agenda_items jsonb DEFAULT '[]'::jsonb,
  p_notes jsonb DEFAULT NULL::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_meeting_id uuid;
BEGIN
  v_meeting_id := public.create_meeting_with_agenda(
    p_template_id,
    p_title,
    p_scheduled_date,
    p_agenda_items,
    p_notes
  );

  UPDATE public.meetings
  SET status = 'draft', updated_at = NOW()
  WHERE id = v_meeting_id;

  RETURN v_meeting_id;
END;
$function$;
