-- Add description field to meetings table
ALTER TABLE public.meetings
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.meetings.description IS 'Optional description or summary for the meeting';
