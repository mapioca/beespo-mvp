-- Beespo MVP - Calendar Feature Phase 1
-- Add scheduling fields to announcements for calendar display

-- =====================================================
-- ANNOUNCEMENTS TABLE MODIFICATIONS
-- =====================================================

-- Add scheduling fields to announcements
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS schedule_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly', 'custom')),
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE,
ADD COLUMN IF NOT EXISTS recurrence_config JSONB DEFAULT '{}'::JSONB;

-- Set default for existing rows
UPDATE announcements
SET recurrence_type = 'none',
    recurrence_config = '{}'::JSONB
WHERE recurrence_type IS NULL;

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for calendar queries - schedule_date filtered
CREATE INDEX IF NOT EXISTS idx_announcements_schedule_date
ON announcements(schedule_date)
WHERE schedule_date IS NOT NULL;

-- Composite index for workspace calendar queries
CREATE INDEX IF NOT EXISTS idx_announcements_workspace_schedule
ON announcements(workspace_id, schedule_date);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN announcements.schedule_date IS 'The date/time when this announcement appears on the calendar';
COMMENT ON COLUMN announcements.recurrence_type IS 'Type of recurrence: none, daily, weekly, biweekly, monthly, yearly, custom';
COMMENT ON COLUMN announcements.recurrence_end_date IS 'End date for recurring announcements (null = indefinite until deadline)';
COMMENT ON COLUMN announcements.recurrence_config IS 'JSON config for custom recurrence patterns (e.g., specific days of week)';
