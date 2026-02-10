-- =====================================================
-- Form Builder System Migration
-- Creates tables for forms, submissions, and analytics
-- =====================================================

-- Forms table (metadata + JSON schema)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  schema JSONB NOT NULL DEFAULT '{"id": "", "title": "", "fields": []}',
  slug TEXT NOT NULL UNIQUE,
  is_published BOOLEAN NOT NULL DEFAULT false,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form submissions table
CREATE TABLE form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Form view analytics (daily aggregation)
CREATE TABLE form_view_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  view_date DATE NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(form_id, view_date)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

CREATE INDEX idx_forms_workspace_id ON forms(workspace_id);
CREATE INDEX idx_forms_slug ON forms(slug);
CREATE INDEX idx_forms_is_published ON forms(is_published);
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);

CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_submitted_at ON form_submissions(submitted_at DESC);

CREATE INDEX idx_form_view_analytics_form_id ON form_view_analytics(form_id);
CREATE INDEX idx_form_view_analytics_view_date ON form_view_analytics(view_date DESC);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_view_analytics ENABLE ROW LEVEL SECURITY;

-- Forms: Workspace members can manage their forms
CREATE POLICY "forms_select_workspace"
  ON forms FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
    OR is_published = true
  );

CREATE POLICY "forms_insert_workspace"
  ON forms FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "forms_update_workspace"
  ON forms FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "forms_delete_workspace"
  ON forms FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Submissions: Anyone can submit to published forms, workspace can view
CREATE POLICY "submissions_insert_published"
  ON form_submissions FOR INSERT
  WITH CHECK (
    form_id IN (
      SELECT id FROM forms WHERE is_published = true
    )
  );

CREATE POLICY "submissions_select_workspace"
  ON form_submissions FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM forms WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "submissions_delete_workspace"
  ON form_submissions FOR DELETE
  USING (
    form_id IN (
      SELECT id FROM forms WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- View Analytics: Allow unauthenticated inserts/updates for tracking
CREATE POLICY "view_analytics_insert_all"
  ON form_view_analytics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "view_analytics_update_all"
  ON form_view_analytics FOR UPDATE
  USING (true);

CREATE POLICY "view_analytics_select_workspace"
  ON form_view_analytics FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM forms WHERE workspace_id IN (
        SELECT workspace_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- =====================================================
-- Trigger for updated_at
-- =====================================================

CREATE TRIGGER update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper function to generate unique slug
-- =====================================================

CREATE OR REPLACE FUNCTION generate_form_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title if slug not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    -- Append random suffix for uniqueness
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_form_slug_trigger
  BEFORE INSERT ON forms
  FOR EACH ROW
  EXECUTE FUNCTION generate_form_slug();
