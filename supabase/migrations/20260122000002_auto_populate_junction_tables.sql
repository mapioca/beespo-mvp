-- Migration: Add auto_populate toggle to junction tables
-- Date: 2026-01-22
-- This allows users to control whether linked items auto-populate in meeting agenda containers

-- Add auto_populate column to discussion_templates
ALTER TABLE discussion_templates
ADD COLUMN IF NOT EXISTS auto_populate BOOLEAN DEFAULT true;

-- Add auto_populate column to business_templates
ALTER TABLE business_templates
ADD COLUMN IF NOT EXISTS auto_populate BOOLEAN DEFAULT true;

-- Add auto_populate column to announcement_templates
ALTER TABLE announcement_templates
ADD COLUMN IF NOT EXISTS auto_populate BOOLEAN DEFAULT true;

-- Create indexes for filtering
CREATE INDEX IF NOT EXISTS idx_discussion_templates_auto_populate
ON discussion_templates(template_id, auto_populate);

CREATE INDEX IF NOT EXISTS idx_business_templates_auto_populate
ON business_templates(template_id, auto_populate);

CREATE INDEX IF NOT EXISTS idx_announcement_templates_auto_populate
ON announcement_templates(template_id, auto_populate);
