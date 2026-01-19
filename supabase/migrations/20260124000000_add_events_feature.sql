-- Beespo MVP - Events Feature
-- Core events table with All-Day handling and Promote to Announcement logic

-- =====================================================
-- EVENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (char_length(title) <= 200),
    description TEXT,
    location TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    is_all_day BOOLEAN DEFAULT false,
    workspace_event_id TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure end_at is after start_at
    CONSTRAINT events_valid_dates CHECK (end_at >= start_at)
);

-- =====================================================
-- WORKSPACE EVENT COUNTERS (for auto-incrementing IDs)
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_event_counters (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    counter INTEGER DEFAULT 0
);

-- =====================================================
-- UPDATE ANNOUNCEMENTS TABLE
-- =====================================================

-- Add event_id FK to announcements for the "Promote to Announcement" feature
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Add display scheduling fields for promoted announcements
ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS display_start TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS display_until TIMESTAMPTZ;

-- =====================================================
-- INDEXES
-- =====================================================

-- Index for workspace event queries
CREATE INDEX IF NOT EXISTS idx_events_workspace_id ON events(workspace_id);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_events_start_at ON events(start_at);

-- Composite index for workspace calendar queries
CREATE INDEX IF NOT EXISTS idx_events_workspace_start ON events(workspace_id, start_at);

-- Index for all-day events
CREATE INDEX IF NOT EXISTS idx_events_is_all_day ON events(workspace_id, is_all_day) WHERE is_all_day = true;

-- Index for finding announcements by event
CREATE INDEX IF NOT EXISTS idx_announcements_event_id ON announcements(event_id) WHERE event_id IS NOT NULL;

-- =====================================================
-- AUTO-INCREMENTING WORKSPACE EVENT ID FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION generate_workspace_event_id()
RETURNS TRIGGER AS $$
DECLARE
    new_counter INTEGER;
BEGIN
    -- Initialize counter if not exists
    INSERT INTO workspace_event_counters (workspace_id, counter)
    VALUES (NEW.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;

    -- Increment and get new counter
    UPDATE workspace_event_counters
    SET counter = counter + 1
    WHERE workspace_id = NEW.workspace_id
    RETURNING counter INTO new_counter;

    -- Set the workspace_event_id
    NEW.workspace_event_id := 'EVT-' || LPAD(new_counter::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Generate workspace_event_id on insert
DROP TRIGGER IF EXISTS trigger_generate_workspace_event_id ON events;
CREATE TRIGGER trigger_generate_workspace_event_id
    BEFORE INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION generate_workspace_event_id();

-- Updated_at trigger
DROP TRIGGER IF EXISTS trigger_events_updated_at ON events;
CREATE TRIGGER trigger_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_event_counters ENABLE ROW LEVEL SECURITY;

-- Events policies (same pattern as other workspace-scoped tables)
DROP POLICY IF EXISTS "Users can view events in their workspace" ON events;
CREATE POLICY "Users can view events in their workspace"
    ON events FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can create events" ON events;
CREATE POLICY "Leaders and admins can create events"
    ON events FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can update events" ON events;
CREATE POLICY "Leaders and admins can update events"
    ON events FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can delete events" ON events;
CREATE POLICY "Leaders and admins can delete events"
    ON events FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

-- Counter table policies
DROP POLICY IF EXISTS "Users can view counters in their workspace" ON workspace_event_counters;
CREATE POLICY "Users can view counters in their workspace"
    ON workspace_event_counters FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can manage counters" ON workspace_event_counters;
CREATE POLICY "Leaders and admins can manage counters"
    ON workspace_event_counters FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE events IS 'Calendar events for the workspace';
COMMENT ON COLUMN events.title IS 'Event title (max 200 characters)';
COMMENT ON COLUMN events.description IS 'Event description/details';
COMMENT ON COLUMN events.location IS 'Event location';
COMMENT ON COLUMN events.start_at IS 'Event start timestamp';
COMMENT ON COLUMN events.end_at IS 'Event end timestamp';
COMMENT ON COLUMN events.is_all_day IS 'Whether this is an all-day event';
COMMENT ON COLUMN events.workspace_event_id IS 'Human-readable workspace-scoped ID (EVT-0001, etc.)';

COMMENT ON COLUMN announcements.event_id IS 'Reference to the event this announcement was promoted from';
COMMENT ON COLUMN announcements.display_start IS 'When to start displaying the announcement (for promoted events)';
COMMENT ON COLUMN announcements.display_until IS 'When to stop displaying the announcement (for promoted events)';
