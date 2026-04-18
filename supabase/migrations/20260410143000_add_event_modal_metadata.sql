ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'activity',
ADD COLUMN IF NOT EXISTS date_tbd boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS time_tbd boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS duration_mode text NOT NULL DEFAULT 'minutes',
ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE public.events
ADD CONSTRAINT events_event_type_check
CHECK (event_type = ANY (ARRAY['interview'::text, 'meeting'::text, 'activity'::text]));

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_duration_mode_check;

ALTER TABLE public.events
ADD CONSTRAINT events_duration_mode_check
CHECK (duration_mode = ANY (ARRAY['minutes'::text, 'tbd'::text, 'all_day'::text]));

ALTER TABLE public.events
DROP CONSTRAINT IF EXISTS events_duration_minutes_check;

ALTER TABLE public.events
ADD CONSTRAINT events_duration_minutes_check
CHECK (
  duration_minutes IS NULL
  OR (duration_minutes > 0 AND duration_minutes <= 1440)
);

UPDATE public.events
SET duration_mode = CASE WHEN is_all_day THEN 'all_day' ELSE 'minutes' END
WHERE duration_mode IS NULL;
