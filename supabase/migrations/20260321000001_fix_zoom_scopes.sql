-- Fix Zoom OAuth scopes: remove invalid admin scope, keep only meeting:write
UPDATE public.apps
SET oauth_scopes = ARRAY['meeting:write']
WHERE slug = 'zoom';
