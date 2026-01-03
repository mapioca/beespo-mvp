-- Beespo MVP - Seed Data
-- Pre-built templates for common LDS church leadership meetings

-- Note: This seed creates a special shared organization for pre-built templates
-- These templates are available to all users (is_shared = true)

-- Create shared templates organization (will be used for is_shared templates)
INSERT INTO organizations (id, name, type, created_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'Beespo Templates', 'ward', NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 1. BISHOPRIC MEETING
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Bishopric Meeting',
    'Standard bishopric meeting agenda for ward business and coordination',
    'bishopric',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Review Calendar', 'Upcoming ward events and activities', 2, 5),
    (v_template_id, 'Ward Council Follow-up', 'Review action items from ward council', 3, 10),
    (v_template_id, 'Ministering Assignments', 'Review and adjust ministering assignments', 4, 10),
    (v_template_id, 'Temple Recommend Interviews', 'Discuss scheduling and follow-up', 5, 5),
    (v_template_id, 'Member Concerns', 'Discuss members needing assistance or attention', 6, 15),
    (v_template_id, 'Assignments Review', 'Review and assign follow-up tasks', 7, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 8, 2);
END $$;

-- =====================================================
-- 2. WARD COUNCIL
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Ward Council',
    'Monthly ward council meeting to coordinate ministering and activities',
    'ward_council',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Calendar Review', 'Review upcoming ward events', 2, 5),
    (v_template_id, 'Ministering Report', 'Discuss ministering efforts and needs', 3, 10),
    (v_template_id, 'Member Discussions', 'Discuss members and families needing support', 4, 20),
    (v_template_id, 'Activity Planning', 'Plan and coordinate ward activities', 5, 15),
    (v_template_id, 'Budget Review', 'Review ward budget and expenses', 6, 5),
    (v_template_id, 'Action Items Review', 'Assign and review action items', 7, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 8, 2);
END $$;

-- =====================================================
-- 3. RELIEF SOCIETY PRESIDENCY
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Relief Society Presidency Meeting',
    'Relief Society presidency meeting to coordinate ministering and activities',
    'rs_presidency',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Ministering Updates', 'Review ministering assignments and needs', 2, 10),
    (v_template_id, 'Sister Concerns', 'Discuss sisters needing assistance', 3, 15),
    (v_template_id, 'Activity Planning', 'Plan Relief Society activities and service projects', 4, 10),
    (v_template_id, 'Sunday Lesson Coordination', 'Coordinate Sunday lessons and teachers', 5, 5),
    (v_template_id, 'Assignments', 'Assign action items and responsibilities', 6, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 7, 2);
END $$;

-- =====================================================
-- 4. YOUNG MEN PRESIDENCY
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Young Men Presidency Meeting',
    'Young Men presidency meeting to coordinate youth activities and advancement',
    'ym_presidency',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Youth Check-in', 'Discuss individual youth and their needs', 2, 15),
    (v_template_id, 'Activity Planning', 'Plan mutual activities and service projects', 3, 15),
    (v_template_id, 'Temple & Baptism Coordination', 'Coordinate baptisms for the dead and temple trips', 4, 5),
    (v_template_id, 'Assignments', 'Assign responsibilities and action items', 5, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 6, 2);
END $$;

-- =====================================================
-- 5. YOUNG WOMEN PRESIDENCY
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Young Women Presidency Meeting',
    'Young Women presidency meeting to coordinate youth activities and Personal Progress',
    'yw_presidency',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Youth Check-in', 'Discuss individual young women and their needs', 2, 15),
    (v_template_id, 'Activity Planning', 'Plan mutual activities and service projects', 3, 15),
    (v_template_id, 'Personal Progress Review', 'Review Personal Progress advancement', 4, 5),
    (v_template_id, 'Assignments', 'Assign responsibilities and action items', 5, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 6, 2);
END $$;

-- =====================================================
-- 6. ELDERS QUORUM PRESIDENCY
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Elders Quorum Presidency Meeting',
    'Elders Quorum presidency meeting to coordinate ministering and service',
    'eq_presidency',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Ministering Updates', 'Review ministering assignments and needs', 2, 10),
    (v_template_id, 'Brother Concerns', 'Discuss brethren needing assistance', 3, 15),
    (v_template_id, 'Service Opportunities', 'Coordinate service projects and opportunities', 4, 10),
    (v_template_id, 'Sunday Lesson Planning', 'Coordinate Sunday lessons and teachers', 5, 5),
    (v_template_id, 'Assignments', 'Assign action items and responsibilities', 6, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 7, 2);
END $$;

-- =====================================================
-- 7. PRIMARY PRESIDENCY
-- =====================================================

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO templates (organization_id, name, description, calling_type, is_shared, created_by)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Primary Presidency Meeting',
    'Primary presidency meeting to coordinate children activities and teaching',
    'primary_presidency',
    true,
    NULL
  )
  RETURNING id INTO v_template_id;

  INSERT INTO template_items (template_id, title, description, order_index, duration_minutes) VALUES
    (v_template_id, 'Opening Prayer', 'Invocation', 1, 2),
    (v_template_id, 'Children Updates', 'Discuss individual children and their needs', 2, 10),
    (v_template_id, 'Teacher Support', 'Support Primary teachers and address needs', 3, 10),
    (v_template_id, 'Activity Planning', 'Plan Primary activities and special events', 4, 10),
    (v_template_id, 'Sacrament Meeting Presentations', 'Coordinate Primary program and presentations', 5, 5),
    (v_template_id, 'Assignments', 'Assign responsibilities and action items', 6, 5),
    (v_template_id, 'Closing Prayer', 'Benediction', 7, 2);
END $$;
