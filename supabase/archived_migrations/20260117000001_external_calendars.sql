-- Beespo MVP - Calendar Feature Phase 3
-- External calendar subscriptions and event caching

-- =====================================================
-- NEW TABLE: calendar_subscriptions
-- =====================================================

CREATE TABLE calendar_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  color TEXT DEFAULT '#6b7280',
  is_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- NEW TABLE: external_calendar_events
-- =====================================================

CREATE TABLE external_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES calendar_subscriptions(id) ON DELETE CASCADE NOT NULL,
  external_uid TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT,
  is_all_day BOOLEAN DEFAULT false,
  raw_ical TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(subscription_id, external_uid)
);

-- =====================================================
-- NEW TABLE: external_event_links
-- Link external events to converted announcements
-- =====================================================

CREATE TABLE external_event_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_event_id UUID REFERENCES external_calendar_events(id) ON DELETE CASCADE,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(external_event_id),
  UNIQUE(announcement_id)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_calendar_subscriptions_workspace ON calendar_subscriptions(workspace_id);
CREATE INDEX idx_external_events_subscription ON external_calendar_events(subscription_id);
CREATE INDEX idx_external_events_start_date ON external_calendar_events(start_date);
CREATE INDEX idx_external_event_links_external ON external_event_links(external_event_id);
CREATE INDEX idx_external_event_links_announcement ON external_event_links(announcement_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger for calendar_subscriptions
CREATE TRIGGER update_calendar_subscriptions_updated_at
  BEFORE UPDATE ON calendar_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update timestamp trigger for external_calendar_events
CREATE TRIGGER update_external_calendar_events_updated_at
  BEFORE UPDATE ON external_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Calendar Subscriptions RLS
ALTER TABLE calendar_subscriptions ENABLE ROW LEVEL SECURITY;

-- All workspace members can view calendar subscriptions
CREATE POLICY "Workspace members can view calendar subscriptions"
  ON calendar_subscriptions FOR SELECT
  USING (
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Only admins can create calendar subscriptions
CREATE POLICY "Admins can create calendar subscriptions"
  ON calendar_subscriptions FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Only admins can update calendar subscriptions
CREATE POLICY "Admins can update calendar subscriptions"
  ON calendar_subscriptions FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- Only admins can delete calendar subscriptions
CREATE POLICY "Admins can delete calendar subscriptions"
  ON calendar_subscriptions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
  );

-- External Calendar Events RLS
ALTER TABLE external_calendar_events ENABLE ROW LEVEL SECURITY;

-- Workspace members can view external events from their subscriptions
CREATE POLICY "Workspace members can view external calendar events"
  ON external_calendar_events FOR SELECT
  USING (
    subscription_id IN (
      SELECT id FROM calendar_subscriptions
      WHERE workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Allow inserts from service role (for syncing) - handled by API
CREATE POLICY "Service can manage external calendar events"
  ON external_calendar_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- External Event Links RLS
ALTER TABLE external_event_links ENABLE ROW LEVEL SECURITY;

-- Workspace members can view links
CREATE POLICY "Workspace members can view external event links"
  ON external_event_links FOR SELECT
  USING (
    external_event_id IN (
      SELECT ece.id FROM external_calendar_events ece
      JOIN calendar_subscriptions cs ON ece.subscription_id = cs.id
      WHERE cs.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Admins and leaders can create links
CREATE POLICY "Admins and leaders can create external event links"
  ON external_event_links FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader')
  );

-- Admins and leaders can delete links
CREATE POLICY "Admins and leaders can delete external event links"
  ON external_event_links FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader')
  );

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE calendar_subscriptions IS 'External iCal calendar subscription sources';
COMMENT ON TABLE external_calendar_events IS 'Cached events from external calendar subscriptions';
COMMENT ON TABLE external_event_links IS 'Links between external events and converted announcements';
COMMENT ON COLUMN calendar_subscriptions.url IS 'iCal feed URL (must be https)';
COMMENT ON COLUMN calendar_subscriptions.sync_error IS 'Last sync error message if any';
COMMENT ON COLUMN external_calendar_events.external_uid IS 'UID from the iCal VEVENT';
COMMENT ON COLUMN external_calendar_events.raw_ical IS 'Original VEVENT content for debugging';
