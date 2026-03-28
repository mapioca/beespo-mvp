-- Add a notes field to discussions for the main content/body of a discussion
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS notes text;
