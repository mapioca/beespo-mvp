-- Add Workspace Entity ID Fields Migration
-- Adds workspace-scoped IDs for discussions, business_items, announcements, and speakers
-- Pattern: DISC-XXXX, BIZ-XXXX, ANNC-XXXX, SPKR-XXXX

-- =====================================================
-- 1. Create counter tables for each entity
-- =====================================================

CREATE TABLE IF NOT EXISTS workspace_discussion_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_business_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_announcement_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workspace_speaker_counters (
  workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  current_counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. Add workspace entity ID columns
-- =====================================================

ALTER TABLE discussions
ADD COLUMN IF NOT EXISTS workspace_discussion_id VARCHAR(20);

ALTER TABLE business_items
ADD COLUMN IF NOT EXISTS workspace_business_id VARCHAR(20);

ALTER TABLE announcements
ADD COLUMN IF NOT EXISTS workspace_announcement_id VARCHAR(20);

ALTER TABLE speakers
ADD COLUMN IF NOT EXISTS workspace_speaker_id VARCHAR(20);

-- =====================================================
-- 3. Create ID generation functions
-- =====================================================

-- Discussion ID generator
CREATE OR REPLACE FUNCTION generate_workspace_discussion_id()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_discussion_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_discussion_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'DISC-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_discussion_id := v_entity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Business ID generator
CREATE OR REPLACE FUNCTION generate_workspace_business_id()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_business_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_business_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'BIZ-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_business_id := v_entity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Announcement ID generator
CREATE OR REPLACE FUNCTION generate_workspace_announcement_id()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_announcement_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_announcement_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'ANNC-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_announcement_id := v_entity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Speaker ID generator
CREATE OR REPLACE FUNCTION generate_workspace_speaker_id()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_speaker_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_speaker_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'SPKR-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_speaker_id := v_entity_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 4. Create triggers for auto-generating IDs
-- =====================================================

DROP TRIGGER IF EXISTS trigger_generate_workspace_discussion_id ON discussions;
CREATE TRIGGER trigger_generate_workspace_discussion_id
  BEFORE INSERT ON discussions
  FOR EACH ROW
  WHEN (NEW.workspace_discussion_id IS NULL)
  EXECUTE FUNCTION generate_workspace_discussion_id();

DROP TRIGGER IF EXISTS trigger_generate_workspace_business_id ON business_items;
CREATE TRIGGER trigger_generate_workspace_business_id
  BEFORE INSERT ON business_items
  FOR EACH ROW
  WHEN (NEW.workspace_business_id IS NULL)
  EXECUTE FUNCTION generate_workspace_business_id();

DROP TRIGGER IF EXISTS trigger_generate_workspace_announcement_id ON announcements;
CREATE TRIGGER trigger_generate_workspace_announcement_id
  BEFORE INSERT ON announcements
  FOR EACH ROW
  WHEN (NEW.workspace_announcement_id IS NULL)
  EXECUTE FUNCTION generate_workspace_announcement_id();

DROP TRIGGER IF EXISTS trigger_generate_workspace_speaker_id ON speakers;
CREATE TRIGGER trigger_generate_workspace_speaker_id
  BEFORE INSERT ON speakers
  FOR EACH ROW
  WHEN (NEW.workspace_speaker_id IS NULL)
  EXECUTE FUNCTION generate_workspace_speaker_id();

-- =====================================================
-- 5. Backfill existing records
-- =====================================================

-- Backfill discussions
DO $$
DECLARE
  rec RECORD;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id, workspace_id 
    FROM discussions 
    WHERE workspace_discussion_id IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO workspace_discussion_counters (workspace_id, current_counter)
    VALUES (rec.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    UPDATE workspace_discussion_counters
    SET current_counter = current_counter + 1, updated_at = NOW()
    WHERE workspace_id = rec.workspace_id
    RETURNING current_counter INTO v_counter;
    
    v_entity_id := 'DISC-' || LPAD(v_counter::TEXT, 4, '0');
    
    UPDATE discussions SET workspace_discussion_id = v_entity_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill business_items
DO $$
DECLARE
  rec RECORD;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id, workspace_id 
    FROM business_items 
    WHERE workspace_business_id IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO workspace_business_counters (workspace_id, current_counter)
    VALUES (rec.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    UPDATE workspace_business_counters
    SET current_counter = current_counter + 1, updated_at = NOW()
    WHERE workspace_id = rec.workspace_id
    RETURNING current_counter INTO v_counter;
    
    v_entity_id := 'BIZ-' || LPAD(v_counter::TEXT, 4, '0');
    
    UPDATE business_items SET workspace_business_id = v_entity_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill announcements
DO $$
DECLARE
  rec RECORD;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id, workspace_id 
    FROM announcements 
    WHERE workspace_announcement_id IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO workspace_announcement_counters (workspace_id, current_counter)
    VALUES (rec.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    UPDATE workspace_announcement_counters
    SET current_counter = current_counter + 1, updated_at = NOW()
    WHERE workspace_id = rec.workspace_id
    RETURNING current_counter INTO v_counter;
    
    v_entity_id := 'ANNC-' || LPAD(v_counter::TEXT, 4, '0');
    
    UPDATE announcements SET workspace_announcement_id = v_entity_id WHERE id = rec.id;
  END LOOP;
END $$;

-- Backfill speakers
DO $$
DECLARE
  rec RECORD;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  FOR rec IN 
    SELECT id, workspace_id 
    FROM speakers 
    WHERE workspace_speaker_id IS NULL
    ORDER BY created_at ASC
  LOOP
    INSERT INTO workspace_speaker_counters (workspace_id, current_counter)
    VALUES (rec.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    UPDATE workspace_speaker_counters
    SET current_counter = current_counter + 1, updated_at = NOW()
    WHERE workspace_id = rec.workspace_id
    RETURNING current_counter INTO v_counter;
    
    v_entity_id := 'SPKR-' || LPAD(v_counter::TEXT, 4, '0');
    
    UPDATE speakers SET workspace_speaker_id = v_entity_id WHERE id = rec.id;
  END LOOP;
END $$;

-- =====================================================
-- 6. Add unique constraints
-- =====================================================

ALTER TABLE discussions
ADD CONSTRAINT unique_workspace_discussion_id_per_workspace 
UNIQUE (workspace_id, workspace_discussion_id);

ALTER TABLE business_items
ADD CONSTRAINT unique_workspace_business_id_per_workspace 
UNIQUE (workspace_id, workspace_business_id);

ALTER TABLE announcements
ADD CONSTRAINT unique_workspace_announcement_id_per_workspace 
UNIQUE (workspace_id, workspace_announcement_id);

ALTER TABLE speakers
ADD CONSTRAINT unique_workspace_speaker_id_per_workspace 
UNIQUE (workspace_id, workspace_speaker_id);

-- =====================================================
-- 7. Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_discussions_workspace_discussion_id ON discussions(workspace_discussion_id);
CREATE INDEX IF NOT EXISTS idx_business_items_workspace_business_id ON business_items(workspace_business_id);
CREATE INDEX IF NOT EXISTS idx_announcements_workspace_announcement_id ON announcements(workspace_announcement_id);
CREATE INDEX IF NOT EXISTS idx_speakers_workspace_speaker_id ON speakers(workspace_speaker_id);

-- =====================================================
-- 8. Enable RLS on counter tables
-- =====================================================

ALTER TABLE workspace_discussion_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_business_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_announcement_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_speaker_counters ENABLE ROW LEVEL SECURITY;

-- Counter tables RLS policies (view only for workspace members)
CREATE POLICY "Users can view their workspace discussion counter"
  ON workspace_discussion_counters FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their workspace business counter"
  ON workspace_business_counters FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their workspace announcement counter"
  ON workspace_announcement_counters FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can view their workspace speaker counter"
  ON workspace_speaker_counters FOR SELECT
  USING (workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()));
