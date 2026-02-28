-- Migration: Add topic to hymns table
-- Description: Adds a topic column to the hymns table to support grouping and filtering in the Hymn Selector.

ALTER TABLE public.hymns ADD COLUMN topic text;

COMMENT ON COLUMN public.hymns.topic IS 'The group or topical category for the hymn (e.g., "Sacrament", "Restoration", "Easter")';
