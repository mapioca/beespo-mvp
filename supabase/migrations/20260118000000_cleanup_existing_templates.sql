-- Beespo MVP - Cleanup Existing Templates
-- Removes all existing templates and meetings to prepare for new modular system
-- Date: 2026-01-18

-- =====================================================
-- CLEANUP: Delete all existing data
-- =====================================================

-- Delete all meetings and related agenda items
DELETE FROM agenda_items;
DELETE FROM meetings;

-- Delete all templates and template items
DELETE FROM template_items;
DELETE FROM templates;
