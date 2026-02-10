-- =====================================================
-- BEESPO MVP - Part 1: Workspace and Templates
-- =====================================================
-- This migration creates the workspace and templates first.
-- Run this BEFORE signing up.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Clear all tables (preserve structure)
-- =====================================================

TRUNCATE TABLE task_activities CASCADE;
TRUNCATE TABLE task_comments CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE discussion_notes CASCADE;
TRUNCATE TABLE agenda_items CASCADE;
TRUNCATE TABLE discussions CASCADE;
TRUNCATE TABLE announcements CASCADE;
TRUNCATE TABLE business_items CASCADE;
TRUNCATE TABLE speakers CASCADE;
TRUNCATE TABLE meetings CASCADE;
TRUNCATE TABLE template_items CASCADE;
TRUNCATE TABLE templates CASCADE;
TRUNCATE TABLE workspace_invitations CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE workspaces CASCADE;

-- =====================================================
-- STEP 2: Create Demo Workspace
-- =====================================================

INSERT INTO workspaces (id, name, type, organization_type, created_at, updated_at)
VALUES
  ('d0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a', 'Riverside Ward', 'ward', 'bishopric', NOW() - INTERVAL '3 months', NOW());

-- =====================================================
-- STEP 3: Create Meeting Templates
-- =====================================================

INSERT INTO templates (id, workspace_id, name, description, calling_type, is_shared, created_by, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a', 'Bishopric Meeting', 'Weekly bishopric meeting template', 'bishopric', true, NULL, NOW() - INTERVAL '3 months', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a', 'Ward Council', 'Monthly ward council meeting', 'bishopric', true, NULL, NOW() - INTERVAL '3 months', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a', 'PEC Meeting', 'Priesthood Executive Committee meeting', 'bishopric', true, NULL, NOW() - INTERVAL '2 months', NOW());

-- =====================================================
-- STEP 4: Create Template Items
-- =====================================================

INSERT INTO template_items (id, template_id, title, description, order_index, duration_minutes, item_type, created_at)
VALUES
  -- Bishopric Meeting Template Items
  ('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Opening Prayer', NULL, 1, 5, 'procedural', NOW() - INTERVAL '3 months'),
  ('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Review Previous Action Items', NULL, 2, 10, 'discussion', NOW() - INTERVAL '3 months'),
  ('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Member Concerns', 'Discuss members needing assistance', 3, 20, 'discussion', NOW() - INTERVAL '3 months'),
  ('11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Calendar Review', NULL, 4, 10, 'discussion', NOW() - INTERVAL '3 months'),
  ('11111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111111', 'Closing Prayer', NULL, 5, 5, 'procedural', NOW() - INTERVAL '3 months'),

  -- Ward Council Template Items
  ('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Opening Prayer', NULL, 1, 5, 'procedural', NOW() - INTERVAL '3 months'),
  ('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222222', 'Missionary Work', 'Discuss missionary efforts', 2, 15, 'discussion', NOW() - INTERVAL '3 months'),
  ('22222222-2222-2222-2222-222222222224', '22222222-2222-2222-2222-222222222222', 'Youth Activities', NULL, 3, 15, 'discussion', NOW() - INTERVAL '3 months'),
  ('22222222-2222-2222-2222-222222222225', '22222222-2222-2222-2222-222222222222', 'Temple & Family History', NULL, 4, 10, 'discussion', NOW() - INTERVAL '3 months'),
  ('22222222-2222-2222-2222-222222222226', '22222222-2222-2222-2222-222222222222', 'Closing Prayer', NULL, 5, 5, 'procedural', NOW() - INTERVAL '3 months'),

  -- PEC Meeting Template Items
  ('33333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Opening Prayer', NULL, 1, 5, 'procedural', NOW() - INTERVAL '2 months'),
  ('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333333', 'Priesthood Leadership', NULL, 2, 20, 'discussion', NOW() - INTERVAL '2 months'),
  ('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Member Progress', NULL, 3, 15, 'discussion', NOW() - INTERVAL '2 months'),
  ('33333333-3333-3333-3333-333333333334', '33333333-3333-3333-3333-333333333333', 'Closing Prayer', NULL, 4, 5, 'procedural', NOW() - INTERVAL '2 months');

COMMIT;

-- =====================================================
-- SUCCESS!
-- =====================================================
-- ✅ Workspace and templates created successfully!
--
-- 📋 NEXT STEPS:
-- 1. Sign up at your app with:
--    Email: demo@beespo.com
--    Password: Demo123!
--
-- 2. After signup, note your user ID from the URL or profile
--
-- 3. Run the second migration file:
--    02_seed_demo_data.sql
--
-- =====================================================
