-- Add meeting metadata columns for roles and attendance tracking
ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS presiding_name TEXT,
  ADD COLUMN IF NOT EXISTS conducting_name TEXT,
  ADD COLUMN IF NOT EXISTS chorister_name TEXT,
  ADD COLUMN IF NOT EXISTS organist_name TEXT,
  ADD COLUMN IF NOT EXISTS attendance_count INTEGER;
