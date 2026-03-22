-- Store the plain-text Zoom meeting passcode so it can be shown in the UI
-- and included in email invites alongside the pre-encoded join URL.
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS zoom_passcode text;
