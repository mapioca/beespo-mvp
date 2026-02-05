-- Beespo MVP - Apps Hub and Canva Integration
-- Marketplace for workspace integrations with OAuth support

-- =====================================================
-- APPS TABLE (Available apps in the marketplace)
-- =====================================================

CREATE TABLE IF NOT EXISTS apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    requires_oauth BOOLEAN DEFAULT true,
    oauth_scopes TEXT[],
    features TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE apps IS 'Available apps in the Apps Hub marketplace';
COMMENT ON COLUMN apps.slug IS 'URL-friendly unique identifier (e.g., canva, figma)';
COMMENT ON COLUMN apps.name IS 'Display name of the app';
COMMENT ON COLUMN apps.description IS 'App description for marketplace display';
COMMENT ON COLUMN apps.icon_url IS 'Path to app icon';
COMMENT ON COLUMN apps.category IS 'App category (design, productivity, etc.)';
COMMENT ON COLUMN apps.is_active IS 'Whether app is available in marketplace';
COMMENT ON COLUMN apps.requires_oauth IS 'Whether app requires OAuth connection';
COMMENT ON COLUMN apps.oauth_scopes IS 'Required OAuth scopes for the app';
COMMENT ON COLUMN apps.features IS 'Feature flags unlocked by this app';

-- =====================================================
-- WORKSPACE_APPS TABLE (Apps connected to workspaces)
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_apps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    connected_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('pending', 'connected', 'disconnected', 'error')) DEFAULT 'pending',
    settings JSONB DEFAULT '{}',
    connected_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (workspace_id, app_id)
);

COMMENT ON TABLE workspace_apps IS 'Apps connected to workspaces';
COMMENT ON COLUMN workspace_apps.status IS 'Connection status: pending, connected, disconnected, error';
COMMENT ON COLUMN workspace_apps.settings IS 'App-specific settings for this workspace';
COMMENT ON COLUMN workspace_apps.connected_at IS 'When the OAuth connection was completed';

-- =====================================================
-- APP_TOKENS TABLE (OAuth tokens per user per app)
-- =====================================================

CREATE TABLE IF NOT EXISTS app_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scopes TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, app_id, workspace_id)
);

COMMENT ON TABLE app_tokens IS 'OAuth tokens for connected apps per user and workspace';
COMMENT ON COLUMN app_tokens.access_token IS 'Encrypted OAuth access token';
COMMENT ON COLUMN app_tokens.refresh_token IS 'Encrypted OAuth refresh token';
COMMENT ON COLUMN app_tokens.expires_at IS 'Token expiration timestamp';
COMMENT ON COLUMN app_tokens.scopes IS 'Granted OAuth scopes';

-- =====================================================
-- EVENT_DESIGNS TABLE (Canva designs for events)
-- =====================================================

CREATE TABLE IF NOT EXISTS event_designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    canva_design_id TEXT NOT NULL,
    canva_edit_url TEXT,
    edit_url_expires_at TIMESTAMPTZ,
    title TEXT NOT NULL,
    width INTEGER DEFAULT 480,
    height INTEGER DEFAULT 672,
    export_status TEXT CHECK (export_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    export_job_id TEXT,
    storage_path TEXT,
    public_url TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE event_designs IS 'Canva designs created for events';
COMMENT ON COLUMN event_designs.canva_design_id IS 'Canva design ID';
COMMENT ON COLUMN event_designs.canva_edit_url IS 'URL to edit the design in Canva';
COMMENT ON COLUMN event_designs.edit_url_expires_at IS 'When the edit URL expires';
COMMENT ON COLUMN event_designs.export_status IS 'Export job status: pending, processing, completed, failed';
COMMENT ON COLUMN event_designs.export_job_id IS 'Canva export job ID';
COMMENT ON COLUMN event_designs.storage_path IS 'Path in Supabase Storage';
COMMENT ON COLUMN event_designs.public_url IS 'Public URL of exported image';

-- =====================================================
-- INDEXES
-- =====================================================

-- Apps indexes
CREATE INDEX IF NOT EXISTS idx_apps_slug ON apps(slug);
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_active ON apps(is_active) WHERE is_active = true;

-- Workspace apps indexes
CREATE INDEX IF NOT EXISTS idx_workspace_apps_workspace_id ON workspace_apps(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_apps_app_id ON workspace_apps(app_id);
CREATE INDEX IF NOT EXISTS idx_workspace_apps_status ON workspace_apps(status);

-- App tokens indexes
CREATE INDEX IF NOT EXISTS idx_app_tokens_user_app ON app_tokens(user_id, app_id);
CREATE INDEX IF NOT EXISTS idx_app_tokens_workspace ON app_tokens(workspace_id);
CREATE INDEX IF NOT EXISTS idx_app_tokens_expires ON app_tokens(expires_at);

-- Event designs indexes
CREATE INDEX IF NOT EXISTS idx_event_designs_event_id ON event_designs(event_id);
CREATE INDEX IF NOT EXISTS idx_event_designs_workspace_id ON event_designs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_event_designs_canva_design_id ON event_designs(canva_design_id);
CREATE INDEX IF NOT EXISTS idx_event_designs_export_status ON event_designs(export_status);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
DROP TRIGGER IF EXISTS trigger_workspace_apps_updated_at ON workspace_apps;
CREATE TRIGGER trigger_workspace_apps_updated_at
    BEFORE UPDATE ON workspace_apps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_app_tokens_updated_at ON app_tokens;
CREATE TRIGGER trigger_app_tokens_updated_at
    BEFORE UPDATE ON app_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_event_designs_updated_at ON event_designs;
CREATE TRIGGER trigger_event_designs_updated_at
    BEFORE UPDATE ON event_designs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_designs ENABLE ROW LEVEL SECURITY;

-- Apps policies (public read for marketplace)
DROP POLICY IF EXISTS "Anyone can view active apps" ON apps;
CREATE POLICY "Anyone can view active apps"
    ON apps FOR SELECT
    USING (is_active = true);

-- Workspace apps policies
DROP POLICY IF EXISTS "Users can view workspace apps in their workspace" ON workspace_apps;
CREATE POLICY "Users can view workspace apps in their workspace"
    ON workspace_apps FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage workspace apps" ON workspace_apps;
CREATE POLICY "Admins can manage workspace apps"
    ON workspace_apps FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Leaders can add workspace apps" ON workspace_apps;
CREATE POLICY "Leaders can add workspace apps"
    ON workspace_apps FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

-- App tokens policies (users can only see their own tokens)
DROP POLICY IF EXISTS "Users can view their own app tokens" ON app_tokens;
CREATE POLICY "Users can view their own app tokens"
    ON app_tokens FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage their own app tokens" ON app_tokens;
CREATE POLICY "Users can manage their own app tokens"
    ON app_tokens FOR ALL
    USING (user_id = auth.uid());

-- Event designs policies
DROP POLICY IF EXISTS "Users can view event designs in their workspace" ON event_designs;
CREATE POLICY "Users can view event designs in their workspace"
    ON event_designs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can create event designs" ON event_designs;
CREATE POLICY "Leaders and admins can create event designs"
    ON event_designs FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can update event designs" ON event_designs;
CREATE POLICY "Leaders and admins can update event designs"
    ON event_designs FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

DROP POLICY IF EXISTS "Leaders and admins can delete event designs" ON event_designs;
CREATE POLICY "Leaders and admins can delete event designs"
    ON event_designs FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

-- =====================================================
-- SEED CANVA APP
-- =====================================================

INSERT INTO apps (slug, name, description, icon_url, category, requires_oauth, oauth_scopes, features)
VALUES (
    'canva',
    'Canva',
    'Create beautiful event invitations, flyers, and graphics with Canva''s powerful design tools.',
    '/icons/canva.png',
    'design',
    true,
    ARRAY['design:content:write', 'design:content:read'],
    ARRAY['event_invitations', 'design_studio']
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_url = EXCLUDED.icon_url,
    category = EXCLUDED.category,
    requires_oauth = EXCLUDED.requires_oauth,
    oauth_scopes = EXCLUDED.oauth_scopes,
    features = EXCLUDED.features;

-- =====================================================
-- STORAGE BUCKET FOR EVENT INVITATIONS
-- =====================================================

-- Note: Run this in Supabase dashboard or via separate migration
-- INSERT INTO storage.buckets (id, name, public) VALUES ('event-invitations', 'event-invitations', true);
