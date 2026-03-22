-- Add Zoom meeting columns to meetings table
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS zoom_meeting_id text,
  ADD COLUMN IF NOT EXISTS zoom_join_url text,
  ADD COLUMN IF NOT EXISTS zoom_start_url text;

-- Register Zoom app in apps table
INSERT INTO public.apps (slug, name, description, category, is_active, requires_oauth, oauth_scopes, features)
VALUES (
  'zoom',
  'Zoom',
  'Create and join Zoom meetings directly from your agenda',
  'video_conferencing',
  true,
  true,
  ARRAY['meeting:write:admin', 'meeting:write'],
  ARRAY['create_meetings', 'join_meetings']
) ON CONFLICT (slug) DO NOTHING;
