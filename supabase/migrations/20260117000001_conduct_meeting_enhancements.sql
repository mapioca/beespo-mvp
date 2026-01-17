-- Conduct Meeting Enhancements Migration
-- Adds slug support, time logs, public sharing, and rich notes

-- 1. Add slug to workspaces
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);

-- 2. Add slug to templates
ALTER TABLE templates ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);
-- Note: We create a unique constraint only for non-null slugs within a workspace
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'templates_workspace_slug_unique'
  ) THEN
    ALTER TABLE templates ADD CONSTRAINT templates_workspace_slug_unique
      UNIQUE (workspace_id, slug);
  END IF;
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- 3. Add notes JSONB column to meetings (global meeting notes)
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS notes JSONB
  DEFAULT '{"time":0,"blocks":[],"version":"2.31.0"}'::jsonb;

-- 4. Migrate agenda_items.notes from TEXT to JSONB (if still text)
DO $$
BEGIN
  -- Check if notes column is text type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agenda_items'
    AND column_name = 'notes'
    AND data_type = 'text'
  ) THEN
    ALTER TABLE agenda_items
      ALTER COLUMN notes TYPE JSONB
      USING CASE
        WHEN notes IS NULL THEN NULL
        WHEN notes = '' THEN NULL
        ELSE jsonb_build_object(
          'time', extract(epoch from now())::bigint * 1000,
          'blocks', jsonb_build_array(
            jsonb_build_object('type', 'paragraph', 'data', jsonb_build_object('text', notes))
          ),
          'version', '2.31.0'
        )
      END;
  END IF;
END $$;

-- 5. Create time_logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  agenda_item_id UUID REFERENCES agenda_items(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_logs_meeting ON time_logs(meeting_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_agenda_item ON time_logs(agenda_item_id);

-- 6. RLS for time_logs
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage time logs for their workspace meetings" ON time_logs;
CREATE POLICY "Users can manage time logs for their workspace meetings"
  ON time_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      JOIN profiles p ON p.workspace_id = m.workspace_id
      WHERE m.id = time_logs.meeting_id AND p.id = auth.uid()
    )
  );

-- 7. Public sharing columns
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS public_share_token TEXT UNIQUE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS is_publicly_shared BOOLEAN DEFAULT false;

-- 8. Slug generation function
CREATE OR REPLACE FUNCTION generate_slug(name TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- 9. Auto-generate workspace slug trigger
CREATE OR REPLACE FUNCTION set_workspace_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.name) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_slug_trigger ON workspaces;
CREATE TRIGGER workspace_slug_trigger
  BEFORE INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION set_workspace_slug();

-- 10. Auto-generate template slug trigger
CREATE OR REPLACE FUNCTION set_template_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_slug_trigger ON templates;
CREATE TRIGGER template_slug_trigger
  BEFORE INSERT ON templates
  FOR EACH ROW EXECUTE FUNCTION set_template_slug();

-- 11. Backfill existing workspaces with slugs
UPDATE workspaces
SET slug = generate_slug(name) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL;

-- 12. Backfill existing templates with slugs
UPDATE templates
SET slug = generate_slug(name)
WHERE slug IS NULL;

-- 13. RLS policy for public meeting access (read-only for public shared meetings)
DROP POLICY IF EXISTS "Public can view shared meetings" ON meetings;
CREATE POLICY "Public can view shared meetings"
  ON meetings FOR SELECT
  USING (is_publicly_shared = true AND public_share_token IS NOT NULL);

-- 14. RLS policy for public agenda items access
DROP POLICY IF EXISTS "Public can view agenda items of shared meetings" ON agenda_items;
CREATE POLICY "Public can view agenda items of shared meetings"
  ON agenda_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meetings m
      WHERE m.id = agenda_items.meeting_id
      AND m.is_publicly_shared = true
      AND m.public_share_token IS NOT NULL
    )
  );
