ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS markdown_agenda TEXT;
