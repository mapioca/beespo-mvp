-- Structural Adjustments to Template System
-- Date: 2026-01-18
-- Changes:
-- 1. Remove Speaker singleton constraint (allow multiple speakers)
-- 2. Update procedural items catalog (consolidate prayers, remove break/other)
-- 3. Add is_custom flag for user-created items

-- =====================================================
-- 1. REMOVE SPEAKER SINGLETON CONSTRAINT
-- =====================================================

-- Drop the unique index that enforced Speaker singleton
DROP INDEX IF EXISTS idx_template_speaker_singleton;

-- =====================================================
-- 2. UPDATE PROCEDURAL ITEMS CATALOG
-- =====================================================

-- Remove opening/closing prayers (will be replaced with single "Prayer")
DELETE FROM procedural_item_types WHERE id = 'opening_prayer';
DELETE FROM procedural_item_types WHERE id = 'closing_prayer';

-- Remove break
DELETE FROM procedural_item_types WHERE id = 'break';

-- Remove other/custom (redundant with custom item creation)
DELETE FROM procedural_item_types WHERE id = 'other';

-- Add consolidated Prayer component
INSERT INTO procedural_item_types (id, name, description, default_duration_minutes, order_hint, is_custom)
VALUES ('prayer', 'Prayer', 'Prayer component - customize as Opening/Closing/etc.', 2, 1, false)
ON CONFLICT (id) DO NOTHING;

-- Update spiritual thought order
UPDATE procedural_item_types 
SET order_hint = 10 
WHERE id = 'spiritual_thought';

-- Update sacrament order
UPDATE procedural_item_types 
SET order_hint = 20 
WHERE id = 'sacrament_distribution';

-- =====================================================
-- 3. ADD CUSTOM FLAG COLUMN (if not exists)
-- =====================================================

-- Already exists in the schema, but ensure it's there
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'procedural_item_types' 
    AND column_name = 'is_custom'
  ) THEN
    ALTER TABLE procedural_item_types 
    ADD COLUMN is_custom BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Mark all existing items as not custom
UPDATE procedural_item_types 
SET is_custom = false 
WHERE is_custom IS NULL;

-- =====================================================
-- 4. ADD WORKSPACE SCOPING FOR CUSTOM ITEMS
-- =====================================================

-- Add workspace_id for custom procedural items (organization-specific)
ALTER TABLE procedural_item_types 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Create index for custom items lookup by workspace
CREATE INDEX IF NOT EXISTS idx_procedural_items_workspace 
ON procedural_item_types(workspace_id) 
WHERE is_custom = true;

-- Update RLS policy for procedural_item_types
DROP POLICY IF EXISTS "All users can view procedural item types" ON procedural_item_types;

CREATE POLICY "Users can view procedural item types"
  ON procedural_item_types FOR SELECT
  USING (
    -- Global items (not custom)
    (is_custom = false AND workspace_id IS NULL) OR
    -- Custom items from their workspace
    (is_custom = true AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()))
  );

-- Leaders can create custom items for their workspace
CREATE POLICY "Leaders can create custom procedural items"
  ON procedural_item_types FOR INSERT
  WITH CHECK (
    is_custom = true AND
    workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid()) AND
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader')
  );
