-- Add tags to templates for better organization and filtering
-- Date: 2026-01-21

-- Add tags column to templates table (array of text)
ALTER TABLE templates
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create GIN index for efficient tag searching
CREATE INDEX idx_templates_tags ON templates USING GIN(tags);

-- Update existing templates with some default tags based on calling_type
UPDATE templates
SET tags = CASE
    WHEN calling_type = 'bishopric' THEN ARRAY['Leadership', 'Bishopric']
    WHEN calling_type = 'ward_council' THEN ARRAY['Leadership', 'Ward Council']
    WHEN calling_type = 'rs_presidency' THEN ARRAY['Auxiliary', 'Relief Society']
    WHEN calling_type = 'elders_quorum' THEN ARRAY['Auxiliary', 'Elders Quorum']
    WHEN calling_type = 'yw_presidency' THEN ARRAY['Auxiliary', 'Young Women']
    WHEN calling_type = 'primary_presidency' THEN ARRAY['Auxiliary', 'Primary']
    WHEN is_shared = true THEN ARRAY['Beespo']
    ELSE ARRAY['General']
END
WHERE tags = '{}';

-- Add comment for documentation
COMMENT ON COLUMN templates.tags IS 'Array of tags for categorizing and filtering templates. Examples: Leadership, Auxiliary, Sacrament, Sunday School, etc.';
