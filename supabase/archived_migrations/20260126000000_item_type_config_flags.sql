-- Migration: Add config flags to procedural_item_types for simplified Item Library
-- Date: 2026-01-26
--
-- This migration adds behavior configuration columns and seeds 6 core item types
-- to support the 2-group Item Library structure (Standard Elements + Custom Elements)

-- =====================================================
-- STEP 1: Add Config Flag Columns
-- =====================================================

-- requires_assignee: Shows person picker (for prayers, speakers, etc.)
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS requires_assignee BOOLEAN DEFAULT false;

-- requires_resource: Shows hymn/music picker
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS requires_resource BOOLEAN DEFAULT false;

-- has_rich_text: Shows description/notes editor
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS has_rich_text BOOLEAN DEFAULT false;

-- is_core: Marks the 6 standard elements (global, not workspace-scoped)
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS is_core BOOLEAN DEFAULT false;

-- icon: Icon identifier for custom items (optional)
ALTER TABLE procedural_item_types
ADD COLUMN IF NOT EXISTS icon TEXT;

-- =====================================================
-- STEP 2: Migrate Existing Data
-- =====================================================

-- Set requires_assignee = true for items that had requires_participant = true
UPDATE procedural_item_types
SET requires_assignee = true
WHERE requires_participant = true;

-- Set requires_resource = true for items that had is_hymn = true
UPDATE procedural_item_types
SET requires_resource = true
WHERE is_hymn = true;

-- Set has_rich_text = false for all existing items (procedural items don't have rich text by default)
-- Rich text is primarily for speaker types

-- =====================================================
-- STEP 3: Seed 6 Core Item Types
-- =====================================================

-- Prayer (procedural type, requires assignee)
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-prayer', 'Prayer', 'Opening or closing prayer', 3, 10,
  true, true, false, false, false, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = true,
  requires_resource = false,
  has_rich_text = false,
  is_custom = false,
  workspace_id = NULL;

-- Speaker (speaker type, requires assignee, has rich text for topic/notes)
-- Note: This will be mapped to type "speaker" in the frontend
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-speaker', 'Speaker', 'Meeting speaker with topic', 10, 20,
  true, true, false, true, false, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = true,
  requires_resource = false,
  has_rich_text = true,
  is_custom = false,
  workspace_id = NULL;

-- Hymn (procedural type, requires resource/hymn picker)
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-hymn', 'Hymn', 'Congregational hymn', 4, 30,
  true, false, true, false, true, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = false,
  requires_resource = true,
  has_rich_text = false,
  is_hymn = true,
  is_custom = false,
  workspace_id = NULL;

-- Discussions (container type)
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-discussions', 'Discussions', 'Container for discussion items', 15, 40,
  true, false, false, false, false, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = false,
  requires_resource = false,
  has_rich_text = false,
  is_custom = false,
  workspace_id = NULL;

-- Ward Business (container type)
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-ward-business', 'Ward Business', 'Container for ward business items', 10, 50,
  true, false, false, false, false, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = false,
  requires_resource = false,
  has_rich_text = false,
  is_custom = false,
  workspace_id = NULL;

-- Announcements (container type)
INSERT INTO procedural_item_types (
  id, name, description, default_duration_minutes, order_hint,
  is_core, requires_assignee, requires_resource, has_rich_text, is_hymn, is_custom, workspace_id
) VALUES (
  'core-announcements', 'Announcements', 'Container for announcements', 5, 60,
  true, false, false, false, false, false, NULL
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_core = true,
  requires_assignee = false,
  requires_resource = false,
  has_rich_text = false,
  is_custom = false,
  workspace_id = NULL;

-- =====================================================
-- STEP 4: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_procedural_item_types_is_core
ON procedural_item_types(is_core);

CREATE INDEX IF NOT EXISTS idx_procedural_item_types_is_custom_workspace
ON procedural_item_types(is_custom, workspace_id);

-- =====================================================
-- STEP 5: Update RLS Policies for Custom Items
-- =====================================================

-- Allow users to read core items (global) and their workspace's custom items
DROP POLICY IF EXISTS "Users can read procedural_item_types" ON procedural_item_types;
CREATE POLICY "Users can read procedural_item_types"
ON procedural_item_types FOR SELECT
TO authenticated
USING (
  is_core = true
  OR workspace_id IS NULL
  OR workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
);

-- Allow users to insert custom items in their workspace
DROP POLICY IF EXISTS "Users can insert custom procedural_item_types" ON procedural_item_types;
CREATE POLICY "Users can insert custom procedural_item_types"
ON procedural_item_types FOR INSERT
TO authenticated
WITH CHECK (
  is_custom = true
  AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
);

-- Allow users to update their workspace's custom items
DROP POLICY IF EXISTS "Users can update custom procedural_item_types" ON procedural_item_types;
CREATE POLICY "Users can update custom procedural_item_types"
ON procedural_item_types FOR UPDATE
TO authenticated
USING (
  is_custom = true
  AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
);

-- Allow users to delete their workspace's custom items
DROP POLICY IF EXISTS "Users can delete custom procedural_item_types" ON procedural_item_types;
CREATE POLICY "Users can delete custom procedural_item_types"
ON procedural_item_types FOR DELETE
TO authenticated
USING (
  is_custom = true
  AND workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
);
