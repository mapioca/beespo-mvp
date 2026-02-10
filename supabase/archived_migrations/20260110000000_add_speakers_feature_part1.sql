-- Beespo MVP - Speakers Feature (Part 1)
-- Add speakers table, enum value, and basic structure
-- Date: 2026-01-10

-- =====================================================
-- SPEAKERS TABLE
-- =====================================================

CREATE TABLE speakers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT NOT NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_speakers_organization ON speakers(organization_id);
CREATE INDEX idx_speakers_name ON speakers(name);
CREATE INDEX idx_speakers_confirmed ON speakers(is_confirmed);

-- Updated_at trigger
CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON speakers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- UPDATE AGENDA_ITEMS TABLE
-- =====================================================

-- Add speaker_id foreign key
ALTER TABLE agenda_items
ADD COLUMN speaker_id UUID REFERENCES speakers(id) ON DELETE SET NULL;

CREATE INDEX idx_agenda_items_speaker ON agenda_items(speaker_id);

-- =====================================================
-- UPDATE AGENDA_ITEM_TYPE ENUM
-- =====================================================

-- Add 'speaker' to the enum
ALTER TYPE agenda_item_type ADD VALUE 'speaker';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE speakers ENABLE ROW LEVEL SECURITY;

-- Users can view speakers in their organization
CREATE POLICY "Users can view speakers in their organization"
  ON speakers FOR SELECT
  USING (organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- Leaders can create speakers
CREATE POLICY "Leaders can create speakers"
  ON speakers FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can update speakers
CREATE POLICY "Leaders can update speakers"
  ON speakers FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can delete speakers
CREATE POLICY "Leaders can delete speakers"
  ON speakers FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );
