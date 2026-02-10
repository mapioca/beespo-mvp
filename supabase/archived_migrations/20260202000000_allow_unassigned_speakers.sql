-- Migration: Allow Unassigned Speakers in Meetings
-- Issue: The check_speaker_has_fk constraint prevents saving meetings with
-- unassigned speaker slots ("TBD speakers"), which is a valid use case.
--
-- This migration removes the constraint so users can:
-- 1. Create meetings with placeholder speaker items
-- 2. Assign speakers later when confirmed
-- 3. Save meetings with "TBD" speaker slots intentionally

-- =====================================================
-- DROP SPEAKER CONSTRAINT
-- =====================================================

-- Remove the constraint that requires speaker_id when item_type='speaker'
ALTER TABLE agenda_items DROP CONSTRAINT IF EXISTS check_speaker_has_fk;

-- Note: The speaker_id column is already nullable (defined with ON DELETE SET NULL),
-- so no column alteration is needed.

-- =====================================================
-- ADD COMMENT FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN agenda_items.speaker_id IS 'Optional foreign key to speakers table. NULL indicates an unassigned/TBD speaker slot.';
