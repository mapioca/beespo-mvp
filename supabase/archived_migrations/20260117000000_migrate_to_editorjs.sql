-- Migration: Migrate notes content to Editor.js format
-- This migration resets all existing notes' content to an empty Editor.js structure
-- to prevent potential frontend crashes due to incompatible Tiptap JSON data.

UPDATE notes
SET content = '{"time": 0, "blocks": [], "version": "2.29.0"}'::jsonb;
