-- Migration: Enhance procedural items with participant and hymn selection flags
-- Date: 2026-01-22

-- Add requires_participant column to indicate items that need a single person assigned
-- (prayers, presides, conducts, etc. - NOT group activities like hymns, calendar review)
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS requires_participant BOOLEAN DEFAULT false;

-- Add Presides and Conducts procedural items
INSERT INTO procedural_item_types (id, name, description, category, default_duration_minutes, order_hint, requires_participant) VALUES
  ('presides', 'Presides', 'Person presiding over the meeting', 'administrative', 0, 1, true),
  ('conducts', 'Conducts', 'Person conducting the meeting', 'administrative', 0, 1, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  requires_participant = EXCLUDED.requires_participant;

-- Update existing items to set requires_participant flag appropriately
-- Items that require a single person assignment
UPDATE procedural_item_types SET requires_participant = true WHERE id IN (
  'prayer',
  'opening_prayer',
  'closing_prayer',
  'invocation',
  'benediction',
  'presides',
  'conducts',
  'spiritual_thought',
  'testimony',
  'opening_remarks',
  'closing_remarks'
);

-- Items that should have hymn selection (slots for hymns, not individual hymns)
-- Update is_hymn to true for hymn slot items
UPDATE procedural_item_types SET is_hymn = true WHERE id IN (
  'opening_hymn',
  'closing_hymn',
  'sacrament_hymn',
  'intermediate_hymn'
);

-- Also ensure any item with 'hymn' in the name (case insensitive) has is_hymn = true
-- This catches any custom hymn-related items
UPDATE procedural_item_types
SET is_hymn = true
WHERE LOWER(name) LIKE '%hymn%' AND is_hymn = false;

-- Create index for requires_participant filtering
CREATE INDEX IF NOT EXISTS idx_procedural_item_types_requires_participant
ON procedural_item_types(requires_participant);
