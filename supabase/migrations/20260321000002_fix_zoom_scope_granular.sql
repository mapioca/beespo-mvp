-- Zoom updated to granular scopes: meeting:write:meeting is the correct scope
-- for "Create a meeting for a user" (replaces the generic meeting:write)
UPDATE public.apps
SET oauth_scopes = ARRAY['meeting:write:meeting']
WHERE slug = 'zoom';
