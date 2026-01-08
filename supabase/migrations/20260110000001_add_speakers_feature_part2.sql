-- Beespo MVP - Speakers Feature (Part 2)
-- Add constraints that use the 'speaker' enum value
-- Date: 2026-01-10
-- NOTE: Run this AFTER part1 has been committed

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Speaker type items must have speaker_id
ALTER TABLE agenda_items
ADD CONSTRAINT check_speaker_has_fk
CHECK (item_type != 'speaker' OR speaker_id IS NOT NULL);

-- Update procedural constraint to exclude speaker_id
ALTER TABLE agenda_items
DROP CONSTRAINT IF EXISTS check_procedural_no_complex_fks;

ALTER TABLE agenda_items
ADD CONSTRAINT check_procedural_no_complex_fks
CHECK (
  item_type != 'procedural' OR (
    discussion_id IS NULL AND
    business_item_id IS NULL AND
    announcement_id IS NULL AND
    speaker_id IS NULL
  )
);
