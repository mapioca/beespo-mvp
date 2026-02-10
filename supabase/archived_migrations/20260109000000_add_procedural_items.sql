-- Beespo MVP - Procedural Items Feature
-- Add item_type to template_items and agenda_items to support procedural items
-- Date: 2026-01-09

-- =====================================================
-- ENUM TYPE for item_type
-- =====================================================

-- Create enum type for agenda item types
CREATE TYPE agenda_item_type AS ENUM (
  'procedural',     -- Simple procedural items (prayers, hymns, etc.)
  'discussion',     -- Links to discussions table
  'business',       -- Links to business_items table
  'announcement'    -- Links to announcements table
);

-- =====================================================
-- TABLE MODIFICATIONS
-- =====================================================

-- Add item_type to template_items
ALTER TABLE template_items
ADD COLUMN item_type agenda_item_type NOT NULL DEFAULT 'procedural';

-- Add item_type to agenda_items
ALTER TABLE agenda_items
ADD COLUMN item_type agenda_item_type NOT NULL DEFAULT 'procedural';

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_template_items_type ON template_items(item_type);
CREATE INDEX idx_agenda_items_type ON agenda_items(item_type);

-- =====================================================
-- DATA MIGRATION: Backfill existing records
-- =====================================================

-- Update existing template_items to have proper item_type
-- Since we don't have a way to detect complex items in template_items,
-- we keep them all as 'procedural' (current behavior)
-- NOTE: Template items don't directly link to complex entities

-- Update existing agenda_items based on their foreign keys
UPDATE agenda_items
SET item_type = 'discussion'
WHERE discussion_id IS NOT NULL;

UPDATE agenda_items
SET item_type = 'business'
WHERE business_item_id IS NOT NULL;

UPDATE agenda_items
SET item_type = 'announcement'
WHERE announcement_id IS NOT NULL;

-- All others remain 'procedural' (default)

-- =====================================================
-- CONSTRAINTS: Ensure data integrity
-- =====================================================

-- Add constraint: procedural items should NOT have complex entity FKs
ALTER TABLE agenda_items
ADD CONSTRAINT check_procedural_no_complex_fks
CHECK (
  item_type != 'procedural' OR (
    discussion_id IS NULL AND
    business_item_id IS NULL AND
    announcement_id IS NULL
  )
);

-- Add constraint: discussion type must have discussion_id
ALTER TABLE agenda_items
ADD CONSTRAINT check_discussion_has_fk
CHECK (item_type != 'discussion' OR discussion_id IS NOT NULL);

-- Add constraint: business type must have business_item_id
ALTER TABLE agenda_items
ADD CONSTRAINT check_business_has_fk
CHECK (item_type != 'business' OR business_item_id IS NOT NULL);

-- Add constraint: announcement type must have announcement_id
ALTER TABLE agenda_items
ADD CONSTRAINT check_announcement_has_fk
CHECK (item_type != 'announcement' OR announcement_id IS NOT NULL);

-- =====================================================
-- FUNCTION UPDATE: create_meeting_from_template
-- =====================================================

-- Update function to handle item_type properly
CREATE OR REPLACE FUNCTION create_meeting_from_template(
  p_template_id UUID,
  p_title TEXT,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meeting_id UUID;
  v_organization_id UUID;
  v_max_order_index INTEGER;
BEGIN
  -- Get organization_id from user profile
  SELECT organization_id INTO v_organization_id
  FROM profiles WHERE id = auth.uid();

  -- Verify user is a leader
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'leader' THEN
    RAISE EXCEPTION 'Only leaders can create meetings';
  END IF;

  -- Create meeting
  INSERT INTO meetings (organization_id, template_id, title, scheduled_date, created_by)
  VALUES (v_organization_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;

  -- Copy template items to agenda items (including item_type and all procedural data)
  INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes, item_type)
  SELECT v_meeting_id, title, description, order_index, duration_minutes, item_type
  FROM template_items
  WHERE template_id = p_template_id
  ORDER BY order_index;

  -- Get the max order_index from copied template items
  SELECT COALESCE(MAX(order_index), -1) INTO v_max_order_index
  FROM agenda_items WHERE meeting_id = v_meeting_id;

  -- AUTO-ADD PENDING BUSINESS ITEMS
  INSERT INTO agenda_items (meeting_id, business_item_id, title, description, order_index, duration_minutes, item_type)
  SELECT
    v_meeting_id,
    bi.id,
    'Business: ' ||
    CASE bi.category
      WHEN 'sustaining' THEN 'Sustaining'
      WHEN 'release' THEN 'Release'
      WHEN 'confirmation' THEN 'Confirmation'
      WHEN 'ordination' THEN 'Ordination'
      WHEN 'setting_apart' THEN 'Setting Apart'
      ELSE 'Other'
    END || ' - ' || bi.person_name,
    CONCAT(
      'Person: ', bi.person_name, E'\n',
      CASE WHEN bi.position_calling IS NOT NULL
        THEN 'Position: ' || bi.position_calling || E'\n'
        ELSE ''
      END,
      CASE WHEN bi.notes IS NOT NULL
        THEN 'Notes: ' || bi.notes
        ELSE ''
      END
    ),
    v_max_order_index + ROW_NUMBER() OVER (ORDER BY bi.created_at),
    5,  -- Default 5 minutes for business items
    'business'::agenda_item_type  -- Explicitly set type
  FROM business_items bi
  WHERE bi.organization_id = v_organization_id
    AND bi.status = 'pending'
  ORDER BY bi.created_at;

  -- Update max order_index after business items
  SELECT COALESCE(MAX(order_index), v_max_order_index) INTO v_max_order_index
  FROM agenda_items WHERE meeting_id = v_meeting_id;

  -- AUTO-ADD ACTIVE ANNOUNCEMENTS
  INSERT INTO agenda_items (meeting_id, announcement_id, title, description, order_index, duration_minutes, item_type)
  SELECT
    v_meeting_id,
    a.id,
    'Announcement: ' || a.title,
    CONCAT(
      CASE a.priority
        WHEN 'high' THEN 'HIGH PRIORITY' || E'\n\n'
        WHEN 'medium' THEN 'MEDIUM PRIORITY' || E'\n\n'
        WHEN 'low' THEN 'LOW PRIORITY' || E'\n\n'
      END,
      a.content,
      CASE WHEN a.deadline IS NOT NULL
        THEN E'\n\nDeadline: ' || TO_CHAR(a.deadline, 'Mon DD, YYYY')
        ELSE ''
      END
    ),
    v_max_order_index + ROW_NUMBER() OVER (ORDER BY
      CASE a.priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END,
      a.created_at
    ),
    3,  -- Default 3 minutes for announcements
    'announcement'::agenda_item_type  -- Explicitly set type
  FROM announcements a
  WHERE a.organization_id = v_organization_id
    AND a.status = 'active'
    AND (a.deadline IS NULL OR a.deadline >= CURRENT_DATE)
  ORDER BY
    CASE a.priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    a.created_at;

  RETURN v_meeting_id;
END;
$$;
