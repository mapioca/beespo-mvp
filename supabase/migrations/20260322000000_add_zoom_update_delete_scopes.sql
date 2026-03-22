-- Add update and delete scopes required for managing Zoom meetings
UPDATE public.apps
SET oauth_scopes = ARRAY['meeting:write:meeting', 'meeting:update:meeting', 'meeting:delete:meeting']
WHERE slug = 'zoom';
