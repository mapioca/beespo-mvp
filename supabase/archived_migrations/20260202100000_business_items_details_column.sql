-- Migration: Add details JSONB column to business_items
-- Purpose: Store structured metadata for conducting script generation
-- Examples:
--   Ordination: { "office": "Elder", "priesthood": "Melchizedek", "gender": "male" }
--   Sustaining: { "calling": "Sunday School President", "gender": "male" }
--   Release: { "calling": "Relief Society Teacher", "gender": "female" }

-- =====================================================
-- ADD DETAILS COLUMN
-- =====================================================

ALTER TABLE business_items
ADD COLUMN IF NOT EXISTS details JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN business_items.details IS 'Structured metadata for conducting script generation. Schema varies by category: ordination requires office/priesthood, sustaining/release require calling, all require gender for pronouns.';

-- =====================================================
-- ADD INDEX FOR JSONB QUERIES
-- =====================================================

-- GIN index for efficient JSONB queries (e.g., filtering by office type)
CREATE INDEX IF NOT EXISTS idx_business_items_details ON business_items USING GIN (details);
