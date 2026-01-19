-- Beespo MVP - Events External Source Tracking
-- Adds fields to track imported external calendar events

-- =====================================================
-- ADD EXTERNAL SOURCE FIELDS TO EVENTS
-- =====================================================

-- Track the external calendar source for imported events
ALTER TABLE events
ADD COLUMN IF NOT EXISTS external_source_id TEXT,
ADD COLUMN IF NOT EXISTS external_source_type TEXT CHECK (external_source_type IN ('google', 'outlook', 'ics', 'apple', 'other'));

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for looking up events by external source ID (for shadowing/deduplication)
CREATE INDEX IF NOT EXISTS idx_events_external_source_id
ON events(external_source_id)
WHERE external_source_id IS NOT NULL;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON COLUMN events.external_source_id IS 'UID from the external calendar source (for deduplication/shadowing)';
COMMENT ON COLUMN events.external_source_type IS 'Type of external source: google, outlook, ics, apple, or other';
