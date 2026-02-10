-- Universal Share Distribution Hub
-- Migration for meeting share invitations, view tracking, and extended share settings

-- =====================================================
-- ADD share_uuid TO MEETINGS TABLE
-- =====================================================
-- Add cryptographically secure UUID for public URLs (replaces sequential tokens)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS share_uuid UUID DEFAULT gen_random_uuid() UNIQUE;

-- Backfill existing meetings with share_uuid
UPDATE meetings SET share_uuid = gen_random_uuid() WHERE share_uuid IS NULL;

-- =====================================================
-- MEETING SHARE INVITATIONS TABLE
-- =====================================================
-- Track per-meeting invitations with permissions
CREATE TABLE IF NOT EXISTS meeting_share_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('viewer', 'editor')),
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, email)
);

-- Create indexes for meeting_share_invitations
CREATE INDEX IF NOT EXISTS idx_meeting_share_invitations_meeting_id ON meeting_share_invitations(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_share_invitations_email ON meeting_share_invitations(email);
CREATE INDEX IF NOT EXISTS idx_meeting_share_invitations_token ON meeting_share_invitations(token);
CREATE INDEX IF NOT EXISTS idx_meeting_share_invitations_status ON meeting_share_invitations(status);

-- =====================================================
-- MEETING SHARE VIEWS TABLE
-- =====================================================
-- Track unique visitors for analytics
CREATE TABLE IF NOT EXISTS meeting_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  visitor_fingerprint TEXT NOT NULL,
  first_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ DEFAULT NOW(),
  view_count INTEGER DEFAULT 1,
  referrer TEXT,
  user_agent TEXT,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, visitor_fingerprint)
);

-- Create indexes for meeting_share_views
CREATE INDEX IF NOT EXISTS idx_meeting_share_views_meeting_id ON meeting_share_views(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_share_views_fingerprint ON meeting_share_views(visitor_fingerprint);
CREATE INDEX IF NOT EXISTS idx_meeting_share_views_first_viewed ON meeting_share_views(first_viewed_at);

-- =====================================================
-- MEETING SHARE SETTINGS TABLE
-- =====================================================
-- Extended share configuration per meeting
CREATE TABLE IF NOT EXISTS meeting_share_settings (
  meeting_id UUID PRIMARY KEY REFERENCES meetings(id) ON DELETE CASCADE,
  allow_notes_export BOOLEAN DEFAULT false,
  show_duration_estimates BOOLEAN DEFAULT true,
  show_presenter_names BOOLEAN DEFAULT true,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TRIGGER FOR updated_at
-- =====================================================
-- Ensure updated_at is automatically updated
CREATE OR REPLACE FUNCTION update_share_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to new tables
DROP TRIGGER IF EXISTS update_meeting_share_invitations_updated_at ON meeting_share_invitations;
CREATE TRIGGER update_meeting_share_invitations_updated_at
  BEFORE UPDATE ON meeting_share_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_share_updated_at();

DROP TRIGGER IF EXISTS update_meeting_share_settings_updated_at ON meeting_share_settings;
CREATE TRIGGER update_meeting_share_settings_updated_at
  BEFORE UPDATE ON meeting_share_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_share_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE meeting_share_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_share_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_share_settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MEETING SHARE INVITATIONS POLICIES
-- =====================================================

-- Workspace leaders/admins can manage invitations
CREATE POLICY "Workspace members can view meeting invitations"
  ON meeting_share_invitations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_invitations.meeting_id
      AND p.id = auth.uid()
    )
  );

CREATE POLICY "Workspace leaders can create meeting invitations"
  ON meeting_share_invitations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_invitations.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can update meeting invitations"
  ON meeting_share_invitations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_invitations.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can delete meeting invitations"
  ON meeting_share_invitations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_invitations.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

-- Anyone can look up their own invitation by token (for accepting)
CREATE POLICY "Anyone can view invitation by token"
  ON meeting_share_invitations FOR SELECT
  USING (true);

-- =====================================================
-- MEETING SHARE VIEWS POLICIES
-- =====================================================

-- Anyone can insert view tracking for publicly shared meetings
CREATE POLICY "Anyone can track views on public meetings"
  ON meeting_share_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_views.meeting_id
      AND m.is_publicly_shared = true
    )
  );

-- Anyone can update view tracking (for incrementing count)
CREATE POLICY "Anyone can update view tracking on public meetings"
  ON meeting_share_views FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_views.meeting_id
      AND m.is_publicly_shared = true
    )
  );

-- Workspace members can read analytics
CREATE POLICY "Workspace members can view share analytics"
  ON meeting_share_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_views.meeting_id
      AND p.id = auth.uid()
    )
  );

-- =====================================================
-- MEETING SHARE SETTINGS POLICIES
-- =====================================================

-- Workspace members can view share settings
CREATE POLICY "Workspace members can view share settings"
  ON meeting_share_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_settings.meeting_id
      AND p.id = auth.uid()
    )
  );

-- Workspace leaders can manage share settings
CREATE POLICY "Workspace leaders can insert share settings"
  ON meeting_share_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_settings.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can update share settings"
  ON meeting_share_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_settings.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Workspace leaders can delete share settings"
  ON meeting_share_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = meeting_share_settings.meeting_id
      AND p.id = auth.uid()
      AND p.role IN ('admin', 'leader')
    )
  );

-- =====================================================
-- PUBLIC ACCESS FOR SHARE SETTINGS (READ-ONLY)
-- =====================================================
-- Allow public to read share settings for publicly shared meetings
CREATE POLICY "Public can view share settings for shared meetings"
  ON meeting_share_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = meeting_share_settings.meeting_id
      AND m.is_publicly_shared = true
    )
  );

-- =====================================================
-- HELPER FUNCTION: Get share analytics
-- =====================================================
CREATE OR REPLACE FUNCTION get_meeting_share_analytics(p_meeting_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_views', COALESCE(SUM(view_count), 0),
    'unique_visitors', COUNT(*),
    'first_view', MIN(first_viewed_at),
    'last_view', MAX(last_viewed_at)
  ) INTO result
  FROM meeting_share_views
  WHERE meeting_id = p_meeting_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_meeting_share_analytics(UUID) TO authenticated;
