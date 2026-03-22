-- Store the Zoom user ID alongside the token so the deauthorization webhook
-- can look up and delete the right record without a user session.
ALTER TABLE public.app_tokens
  ADD COLUMN IF NOT EXISTS zoom_user_id text;
