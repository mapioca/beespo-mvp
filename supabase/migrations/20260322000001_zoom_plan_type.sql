-- Store the Zoom account plan type (1=Basic/Free, 2=Licensed/Paid) alongside the token
-- so we can enforce/warn about the 40-minute limit without an extra API call on every request.
ALTER TABLE public.app_tokens
  ADD COLUMN IF NOT EXISTS zoom_plan_type integer;

-- Add user:read:user scope needed for GET /v2/users/me
UPDATE public.apps
SET oauth_scopes = array_append(oauth_scopes, 'user:read:user')
WHERE slug = 'zoom'
  AND NOT ('user:read:user' = ANY(oauth_scopes));
