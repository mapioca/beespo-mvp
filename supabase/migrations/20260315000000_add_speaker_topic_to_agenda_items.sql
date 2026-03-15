-- Migration to add speaker_topic to agenda_items for snapshotting topics
ALTER TABLE public.agenda_items ADD COLUMN IF NOT EXISTS speaker_topic TEXT;

COMMENT ON COLUMN public.agenda_items.speaker_topic IS 'Snapshotted topic of the speaker at the time of meeting creation/update.';
