-- =====================================================
-- BEESPO MVP - Part 2: User Data and Relationships
-- =====================================================
-- Run this AFTER you've signed up with demo@beespo.com
--
-- IMPORTANT: Replace YOUR_USER_ID_HERE with your actual
-- user ID from auth.users table
--
-- To get your user ID, run:
-- SELECT id FROM auth.users WHERE email = 'demo@beespo.com';
--
-- Then replace all instances of YOUR_USER_ID_HERE below
-- =====================================================

-- STOP! Did you replace YOUR_USER_ID_HERE with your actual user ID?
-- You can find it with: SELECT id FROM auth.users WHERE email = 'demo@beespo.com';

BEGIN;

-- Get the current user's ID (after you've signed up)
-- Replace YOUR_USER_ID_HERE with the actual UUID from auth.users
DO $$
DECLARE
  v_user_id UUID := '219013e2-45a8-4dfd-afb0-63407e514c59'::UUID;  -- REPLACE THIS!
  v_workspace_id UUID := 'd0e1f2a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a'::UUID;
BEGIN

  -- Verify the user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
    RAISE EXCEPTION 'User ID % not found in auth.users. Did you sign up and replace YOUR_USER_ID_HERE?', v_user_id;
  END IF;

  -- =====================================================
  -- Update or Insert Profile for signed-up user
  -- =====================================================
  INSERT INTO profiles (id, email, full_name, workspace_id, role, is_sys_admin, created_at, updated_at)
  VALUES (v_user_id, 'demo@beespo.com', 'Bishop James Anderson', v_workspace_id, 'admin', true, NOW() - INTERVAL '3 months', NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    workspace_id = EXCLUDED.workspace_id,
    role = EXCLUDED.role,
    is_sys_admin = EXCLUDED.is_sys_admin;

  -- =====================================================
  -- Update template created_by to real user
  -- =====================================================
  UPDATE templates
  SET created_by = v_user_id
  WHERE workspace_id = v_workspace_id;

  -- =====================================================
  -- Create Meetings
  -- =====================================================
  INSERT INTO meetings (id, workspace_id, template_id, title, scheduled_date, status, created_by, created_at, updated_at)
  VALUES
    -- Past meetings (completed)
    ('a1111111-1111-1111-1111-111111111111', v_workspace_id, '11111111-1111-1111-1111-111111111111', 'Bishopric Meeting - Week 1', NOW() - INTERVAL '12 weeks', 'completed', v_user_id, NOW() - INTERVAL '12 weeks', NOW() - INTERVAL '12 weeks'),
    ('a2222222-2222-2222-2222-222222222222', v_workspace_id, '11111111-1111-1111-1111-111111111111', 'Bishopric Meeting - Week 2', NOW() - INTERVAL '11 weeks', 'completed', v_user_id, NOW() - INTERVAL '11 weeks', NOW() - INTERVAL '11 weeks'),
    ('a3333333-3333-3333-3333-333333333333', v_workspace_id, '22222222-2222-2222-2222-222222222222', 'Ward Council - October', NOW() - INTERVAL '10 weeks', 'completed', v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '10 weeks'),
    ('a4444444-4444-4444-4444-444444444444', v_workspace_id, '11111111-1111-1111-1111-111111111111', 'Bishopric Meeting - Week 5', NOW() - INTERVAL '8 weeks', 'completed', v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '8 weeks'),
    ('a5555555-5555-5555-5555-555555555555', v_workspace_id, '22222222-2222-2222-2222-222222222222', 'Ward Council - November', NOW() - INTERVAL '6 weeks', 'completed', v_user_id, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '6 weeks'),
    ('a6666666-6666-6666-6666-666666666666', v_workspace_id, '11111111-1111-1111-1111-111111111111', 'Bishopric Meeting - Week 9', NOW() - INTERVAL '4 weeks', 'completed', v_user_id, NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),
    ('a7777777-7777-7777-7777-777777777777', v_workspace_id, '22222222-2222-2222-2222-222222222222', 'Ward Council - December', NOW() - INTERVAL '2 weeks', 'completed', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),

    -- Current/upcoming meetings
    ('a8888888-8888-8888-8888-888888888888', v_workspace_id, '11111111-1111-1111-1111-111111111111', 'Bishopric Meeting - This Week', NOW() + INTERVAL '2 days', 'scheduled', v_user_id, NOW() - INTERVAL '1 week', NOW()),
    ('a9999999-9999-9999-9999-999999999999', v_workspace_id, '22222222-2222-2222-2222-222222222222', 'Ward Council - January', NOW() + INTERVAL '1 week', 'scheduled', v_user_id, NOW() - INTERVAL '3 days', NOW());

  -- =====================================================
  -- Create Discussions
  -- =====================================================
  INSERT INTO discussions (id, workspace_id, title, description, category, status, priority, due_date, deferred_reason, parent_discussion_id, created_by, created_at, updated_at)
  VALUES
    -- Active discussions
    ('b1111111-1111-1111-1111-111111111111', v_workspace_id, 'Youth Activity Planning - Summer Camp', 'Plan and organize the annual youth summer camp including budget, transportation, and activities', 'youth', 'active', 'high', NOW() + INTERVAL '3 weeks', NULL, NULL, v_user_id, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '1 week'),

    ('b2222222-2222-2222-2222-222222222222', v_workspace_id, 'New Family Outreach', 'The Johnson family recently moved into the ward. Coordinate welcome visits and integration efforts.', 'member_concerns', 'monitoring', 'medium', NULL, NULL, NULL, v_user_id, NOW() - INTERVAL '5 weeks', NOW() - INTERVAL '2 days'),

    ('b3333333-3333-3333-3333-333333333333', v_workspace_id, 'Budget Allocation Review', 'Review and adjust budget allocations for Q1 2026', 'budget', 'decision_required', 'high', NOW() + INTERVAL '1 week', NULL, NULL, v_user_id, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '2 days'),

    ('b4444444-4444-4444-4444-444444444444', v_workspace_id, 'Temple Night Coordination', 'Organize ward temple night for next month', 'temple_work', 'active', 'medium', NOW() + INTERVAL '4 weeks', NULL, NULL, v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '3 days'),

    -- Resolved discussions
    ('b5555555-5555-5555-5555-555555555555', v_workspace_id, 'Christmas Service Project', 'Organized food drive and gift collection for local shelter', 'service_opportunities', 'resolved', 'high', NOW() - INTERVAL '2 weeks', NULL, NULL, v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '2 weeks'),

    ('b6666666-6666-6666-6666-666666666666', v_workspace_id, 'Relief Society President Calling', 'Discussed and extended calling to Sister Martinez', 'callings', 'resolved', 'high', NULL, NULL, NULL, v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '9 weeks'),

    -- Deferred discussion
    ('b7777777-7777-7777-7777-777777777777', v_workspace_id, 'Building Expansion Proposal', 'Proposal for chapel expansion to accommodate growing membership', 'facilities', 'deferred', 'low', NULL, 'Waiting for stake approval and funding review. Will revisit in Q2 2026.', NULL, v_user_id, NOW() - INTERVAL '7 weeks', NOW() - INTERVAL '5 weeks'),

    -- Follow-up discussion
    ('b8888888-8888-8888-8888-888888888888', v_workspace_id, 'Youth Camp Follow-up: Transportation Arrangements', 'Follow-up to finalize transportation logistics for summer camp', 'youth', 'active', 'high', NOW() + INTERVAL '2 weeks', NULL, 'b1111111-1111-1111-1111-111111111111', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 day'),

    -- New discussions
    ('b9999999-9999-9999-9999-999999999999', v_workspace_id, 'Missionary Coordination', 'Coordinate with full-time missionaries for teaching opportunities', 'mission_work', 'new', 'medium', NOW() + INTERVAL '2 weeks', NULL, NULL, v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    ('ba111111-1111-1111-1111-111111111111', v_workspace_id, 'Primary Program Preparation', 'Begin planning for Primary Sacrament Meeting presentation', 'other', 'new', 'medium', NOW() + INTERVAL '8 weeks', NULL, NULL, v_user_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

  -- =====================================================
  -- Create Discussion Notes
  -- =====================================================
  INSERT INTO discussion_notes (id, discussion_id, meeting_id, content, created_by, created_at, updated_at)
  VALUES
    -- Notes for Youth Activity
    ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'Initial discussion: Proposed dates June 15-18. Need to secure camp location and determine budget requirements.', v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '8 weeks'),
    ('c1111111-1111-1111-1111-111111111112', 'b1111111-1111-1111-1111-111111111111', 'a6666666-6666-6666-6666-666666666666', 'Budget approved for $2,500. Camp Riverside confirmed for June 15-18. Youth leaders assigned to activity planning committees.', v_user_id, NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),
    ('c1111111-1111-1111-1111-111111111113', 'b1111111-1111-1111-1111-111111111111', NULL, 'Follow-up: Need to finalize transportation. Create separate discussion for logistics.', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),

    -- Notes for New Family
    ('c2222222-2222-2222-2222-222222222221', 'b2222222-2222-2222-2222-222222222222', 'a5555555-5555-5555-5555-555555555555', 'Johnson family introduced. Assigned ministering brothers and sisters. Relief Society to coordinate welcome meal.', v_user_id, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '6 weeks'),
    ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', NULL, 'Update: Welcome meal delivered. Family attended Sunday services. Children registered in Primary and Young Men/Women.', v_user_id, NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),

    -- Notes for Budget Discussion
    ('c3333333-3333-3333-3333-333333333331', 'b3333333-3333-3333-3333-333333333333', 'a7777777-7777-7777-7777-777777777777', 'Reviewed Q4 spending. Youth activities over budget by $400. Temple night under budget. Proposed reallocation for Q1.', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),

    -- Notes for Temple Night
    ('c4444444-4444-4444-4444-444444444441', 'b4444444-4444-4444-4444-444444444444', 'a6666666-6666-6666-6666-666666666666', 'Proposed date: February 8th. Need volunteers for coordination. Stake has approved joint ward temple night.', v_user_id, NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),

    -- Notes for Christmas Service
    ('c5555555-5555-5555-5555-555555555551', 'b5555555-5555-5555-5555-555555555555', 'a3333333-3333-3333-3333-333333333333', 'Service project approved. Youth and Relief Society to coordinate. Target: 50 food boxes and toys for 30 children.', v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '10 weeks'),
    ('c5555555-5555-5555-5555-555555555552', 'b5555555-5555-5555-5555-555555555555', NULL, 'Project completed successfully! Delivered 52 food boxes and gifts to 32 children. Strong ward participation.', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks');

  -- =====================================================
  -- Create Business Items
  -- =====================================================
  INSERT INTO business_items (id, workspace_id, person_name, position_calling, category, status, action_date, notes, created_by, created_at, updated_at)
  VALUES
    -- Completed business
    ('d1111111-1111-1111-1111-111111111111', v_workspace_id, 'Sister Maria Martinez', 'Relief Society President', 'sustaining', 'completed', NOW() - INTERVAL '9 weeks', 'Sustained unanimously in sacrament meeting', v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '9 weeks'),

    ('d2222222-2222-2222-2222-222222222222', v_workspace_id, 'Brother David Lee', 'Elders Quorum President', 'release', 'completed', NOW() - INTERVAL '8 weeks', 'Released with thanks after 3 years of service', v_user_id, NOW() - INTERVAL '9 weeks', NOW() - INTERVAL '8 weeks'),

    ('d3333333-3333-3333-3333-333333333333', v_workspace_id, 'Brother Marcus Thompson', 'Elders Quorum President', 'sustaining', 'completed', NOW() - INTERVAL '7 weeks', 'Sustained in sacrament meeting', v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '7 weeks'),

    ('d4444444-4444-4444-4444-444444444444', v_workspace_id, 'Brother James Wilson', 'Priest', 'ordination', 'completed', NOW() - INTERVAL '5 weeks', 'Ordained by his father', v_user_id, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '5 weeks'),

    -- Pending business
    ('d5555555-5555-5555-5555-555555555555', v_workspace_id, 'Sister Jennifer Adams', 'Primary President', 'sustaining', 'pending', NOW() + INTERVAL '3 days', 'To be sustained in upcoming sacrament meeting', v_user_id, NOW() - INTERVAL '1 week', NOW()),

    ('d6666666-6666-6666-6666-666666666666', v_workspace_id, 'Brother Robert Chen', 'Sunday School President', 'release', 'pending', NOW() + INTERVAL '1 week', 'Moving out of ward boundaries', v_user_id, NOW() - INTERVAL '3 days', NOW()),

    ('d7777777-7777-7777-7777-777777777777', v_workspace_id, 'Sister Emily Rodriguez', 'Young Women President', 'confirmation', 'pending', NOW() + INTERVAL '5 days', 'Recent convert, scheduled for confirmation', v_user_id, NOW() - INTERVAL '2 days', NOW());

  -- =====================================================
  -- Create Announcements
  -- =====================================================
  INSERT INTO announcements (id, workspace_id, title, content, priority, status, deadline, created_by, created_at, updated_at)
  VALUES
    -- Active announcements
    ('e1111111-1111-1111-1111-111111111111', v_workspace_id, 'Stake Conference - January 25th', 'Stake Conference will be held on January 25th at 10 AM and 2 PM. All members encouraged to attend. Special broadcast from Salt Lake City.', 'high', 'active', NOW() + INTERVAL '2 weeks', v_user_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),

    ('e2222222-2222-2222-2222-222222222222', v_workspace_id, 'Youth Conference Registration Open', 'Registration for Youth Conference (June 20-22) is now open. Cost is $75 per youth. Deadline for registration is March 1st.', 'high', 'active', NOW() + INTERVAL '6 weeks', v_user_id, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 week'),

    ('e3333333-3333-3333-3333-333333333333', v_workspace_id, 'Temple Recommend Interviews', 'Temple recommend interviews are being scheduled. Please contact the executive secretary to schedule your appointment if your recommend expires in the next 3 months.', 'medium', 'active', NOW() + INTERVAL '3 months', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),

    ('e4444444-4444-4444-4444-444444444444', v_workspace_id, 'Ward Activity - Family Game Night', 'Join us for Family Game Night on January 18th at 7 PM in the cultural hall. Bring your favorite board game and snacks to share!', 'medium', 'active', NOW() + INTERVAL '9 days', v_user_id, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

    -- Draft announcement
    ('e5555555-5555-5555-5555-555555555555', v_workspace_id, 'Easter Service Project', 'Draft: Planning service project for week before Easter. Need to finalize details before announcing.', 'low', 'draft', NOW() + INTERVAL '12 weeks', v_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    -- Stopped announcements
    ('e6666666-6666-6666-6666-666666666666', v_workspace_id, 'Christmas Choir Practice', 'Weekly choir practice every Wednesday at 7 PM for Christmas program.', 'medium', 'stopped', NOW() - INTERVAL '3 weeks', v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '3 weeks'),

    ('e7777777-7777-7777-7777-777777777777', v_workspace_id, 'Food Drive for Local Shelter', 'Bring non-perishable food items for donation. Collection ends December 20th.', 'high', 'stopped', NOW() - INTERVAL '3 weeks', v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '3 weeks');

  -- =====================================================
  -- Create Speakers
  -- =====================================================
  INSERT INTO speakers (id, workspace_id, name, topic, is_confirmed, created_by, created_at, updated_at)
  VALUES
    -- Upcoming speakers
    ('f1111111-1111-1111-1111-111111111111', v_workspace_id, 'Brother Thomas Anderson', 'Faith in Jesus Christ', true, v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 week'),

    ('f2222222-2222-2222-2222-222222222222', v_workspace_id, 'Sister Rachel Williams', 'The Power of Prayer', true, v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 week'),

    ('f3333333-3333-3333-3333-333333333333', v_workspace_id, 'Brother Michael Foster', 'Serving Others', false, v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    ('f4444444-4444-4444-4444-444444444444', v_workspace_id, 'Sister Amanda Baker', 'Strengthening Families', true, v_user_id, NOW() - INTERVAL '1 week', NOW() - INTERVAL '5 days'),

    ('f5555555-5555-5555-5555-555555555555', v_workspace_id, 'Brother Daniel Morrison', 'Repentance and Forgiveness', false, v_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

  -- =====================================================
  -- Create Tasks
  -- =====================================================
  INSERT INTO tasks (id, workspace_id, meeting_id, agenda_item_id, discussion_id, business_item_id, title, description, assigned_to, due_date, status, completed_at, access_token, priority, workspace_task_id, created_by, created_at, updated_at)
  VALUES
    -- Completed tasks
    ('10111111-1111-1111-1111-111111111111', v_workspace_id, 'a5555555-5555-5555-5555-555555555555', NULL, 'b5555555-5555-5555-5555-555555555555', NULL, 'Coordinate with local shelter for Christmas donations', 'Contact shelter director to arrange drop-off times and specific needs', v_user_id, NOW() - INTERVAL '4 weeks', 'completed', NOW() - INTERVAL '3 weeks', gen_random_uuid(), 'high', '001', v_user_id, NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '3 weeks'),

    ('10222222-2222-2222-2222-222222222222', v_workspace_id, 'a5555555-5555-5555-5555-555555555555', NULL, 'b2222222-2222-2222-2222-222222222222', NULL, 'Schedule welcome visit to Johnson family', 'Coordinate with ministering brothers and Relief Society for welcome visit', v_user_id, NOW() - INTERVAL '5 weeks', 'completed', NOW() - INTERVAL '4 weeks', gen_random_uuid(), 'medium', '002', v_user_id, NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '4 weeks'),

    ('10333333-3333-3333-3333-333333333333', v_workspace_id, NULL, NULL, 'b6666666-6666-6666-6666-666666666666', NULL, 'Extend calling to Sister Martinez', 'Schedule appointment and extend calling for Relief Society President', v_user_id, NOW() - INTERVAL '9 weeks', 'completed', NOW() - INTERVAL '9 weeks', gen_random_uuid(), 'high', '003', v_user_id, NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '9 weeks'),

    -- In-progress tasks
    ('10444444-4444-4444-4444-444444444444', v_workspace_id, 'a6666666-6666-6666-6666-666666666666', NULL, 'b1111111-1111-1111-1111-111111111111', NULL, 'Secure camp permits and insurance', 'File necessary permits with county and verify insurance coverage for youth camp', v_user_id, NOW() + INTERVAL '2 weeks', 'in_progress', NULL, gen_random_uuid(), 'high', '004', v_user_id, NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '1 day'),

    ('10555555-5555-5555-5555-555555555555', v_workspace_id, NULL, NULL, 'b4444444-4444-4444-4444-444444444444', NULL, 'Reserve temple session for ward night', 'Contact temple to reserve session for February 8th', v_user_id, NOW() + INTERVAL '1 week', 'in_progress', NULL, gen_random_uuid(), 'high', '005', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 days'),

    ('10666666-6666-6666-6666-666666666666', v_workspace_id, 'a7777777-7777-7777-7777-777777777777', NULL, 'b3333333-3333-3333-3333-333333333333', NULL, 'Prepare Q1 budget proposal', 'Create detailed budget proposal based on ward council recommendations', v_user_id, NOW() + INTERVAL '1 week', 'in_progress', NULL, gen_random_uuid(), 'high', '006', v_user_id, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '1 day'),

    -- Pending tasks
    ('10777777-7777-7777-7777-777777777777', v_workspace_id, NULL, NULL, 'b8888888-8888-8888-8888-888888888888', NULL, 'Arrange transportation for youth camp', 'Coordinate with parents for drivers and arrange bus rental if needed', v_user_id, NOW() + INTERVAL '3 weeks', 'pending', NULL, gen_random_uuid(), 'high', '007', v_user_id, NOW() - INTERVAL '1 week', NOW() - INTERVAL '1 day'),

    ('10888888-8888-8888-8888-888888888888', v_workspace_id, NULL, NULL, 'b2222222-2222-2222-2222-222222222222', NULL, 'Follow up on Johnson family integration', 'Check in with Johnson family and ensure they are settling in well', v_user_id, NOW() + INTERVAL '1 week', 'pending', NULL, gen_random_uuid(), 'medium', '008', v_user_id, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

    ('10999999-9999-9999-9999-999999999999', v_workspace_id, NULL, NULL, 'b4444444-4444-4444-4444-444444444444', NULL, 'Create signup sheet for temple night', 'Prepare and distribute signup sheet for ward temple night attendance', v_user_id, NOW() + INTERVAL '2 weeks', 'pending', NULL, gen_random_uuid(), 'medium', '009', v_user_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    ('10aaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', v_workspace_id, NULL, NULL, 'b1111111-1111-1111-1111-111111111111', NULL, 'Create youth camp packing list', 'Compile comprehensive packing list for youth camp participants', v_user_id, NOW() + INTERVAL '4 weeks', 'pending', NULL, gen_random_uuid(), 'low', '010', v_user_id, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day');

  -- =====================================================
  -- Create Task Comments
  -- =====================================================
  INSERT INTO task_comments (id, task_id, user_id, content, created_at, updated_at)
  VALUES
    -- Comments on in-progress tasks
    ('20111111-1111-1111-1111-111111111111', '10444444-4444-4444-4444-444444444444', v_user_id, 'Started permit application process. County office requires 3-week processing time.', NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks'),
    ('20111111-1111-1111-1111-111111111112', '10444444-4444-4444-4444-444444444444', v_user_id, 'Good to know. Please keep us updated on the status.', NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks'),
    ('20111111-1111-1111-1111-111111111113', '10444444-4444-4444-4444-444444444444', v_user_id, 'Update: Permits submitted. Insurance coverage confirmed with stake. Waiting on county approval.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

    ('20222222-2222-2222-2222-222222222221', '10555555-5555-5555-5555-555555555555', v_user_id, 'Called temple. They have availability for our preferred time. Waiting for email confirmation.', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),

    ('20333333-3333-3333-3333-333333333331', '10666666-6666-6666-6666-666666666666', v_user_id, 'Draft proposal completed. Reviewing with ward clerk before final submission.', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),

    -- Comments on completed task
    ('20444444-4444-4444-4444-444444444441', '10111111-1111-1111-1111-111111111111', v_user_id, 'Spoke with shelter director. They need the donations by December 18th.', NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '6 weeks'),
    ('20444444-4444-4444-4444-444444444442', '10111111-1111-1111-1111-111111111111', v_user_id, 'Coordination complete. Drop-off scheduled for December 19th at 2 PM.', NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks');

  -- =====================================================
  -- Create Task Activities
  -- =====================================================
  INSERT INTO task_activities (id, task_id, user_id, activity_type, details, created_at)
  VALUES
    -- Activities for completed tasks
    ('30111111-1111-1111-1111-111111111111', '10111111-1111-1111-1111-111111111111', v_user_id, 'created', '{"task_title": "Coordinate with local shelter for Christmas donations"}', NOW() - INTERVAL '8 weeks'),
    ('30111111-1111-1111-1111-111111111112', '10111111-1111-1111-1111-111111111111', v_user_id, 'status_changed', '{"from": "pending", "to": "in_progress"}', NOW() - INTERVAL '6 weeks'),
    ('30111111-1111-1111-1111-111111111113', '10111111-1111-1111-1111-111111111111', v_user_id, 'status_changed', '{"from": "in_progress", "to": "completed"}', NOW() - INTERVAL '3 weeks'),

    ('30222222-2222-2222-2222-222222222221', '10222222-2222-2222-2222-222222222222', v_user_id, 'created', '{"task_title": "Schedule welcome visit to Johnson family"}', NOW() - INTERVAL '6 weeks'),
    ('30222222-2222-2222-2222-222222222222', '10222222-2222-2222-2222-222222222222', v_user_id, 'assigned', '{"assigned_to": "Bishop James Anderson"}', NOW() - INTERVAL '6 weeks'),
    ('30222222-2222-2222-2222-222222222223', '10222222-2222-2222-2222-222222222222', v_user_id, 'status_changed', '{"from": "pending", "to": "completed"}', NOW() - INTERVAL '4 weeks'),

    -- Activities for in-progress tasks
    ('30444444-4444-4444-4444-444444444441', '10444444-4444-4444-4444-444444444444', v_user_id, 'created', '{"task_title": "Secure camp permits and insurance"}', NOW() - INTERVAL '4 weeks'),
    ('30444444-4444-4444-4444-444444444442', '10444444-4444-4444-4444-444444444444', v_user_id, 'status_changed', '{"from": "pending", "to": "in_progress"}', NOW() - INTERVAL '3 weeks'),
    ('30444444-4444-4444-4444-444444444443', '10444444-4444-4444-4444-444444444444', v_user_id, 'commented', '{"comment": "Update: Permits submitted"}', NOW() - INTERVAL '1 day'),

    ('30555555-5555-5555-5555-555555555551', '10555555-5555-5555-5555-555555555555', v_user_id, 'created', '{"task_title": "Reserve temple session for ward night"}', NOW() - INTERVAL '2 weeks'),
    ('30555555-5555-5555-5555-555555555552', '10555555-5555-5555-5555-555555555555', v_user_id, 'status_changed', '{"from": "pending", "to": "in_progress"}', NOW() - INTERVAL '1 week'),

    -- Activities for pending tasks
    ('30777777-7777-7777-7777-777777777771', '10777777-7777-7777-7777-777777777777', v_user_id, 'created', '{"task_title": "Arrange transportation for youth camp"}', NOW() - INTERVAL '1 week'),

    ('30888888-8888-8888-8888-888888888881', '10888888-8888-8888-8888-888888888888', v_user_id, 'created', '{"task_title": "Follow up on Johnson family integration"}', NOW() - INTERVAL '3 days');

  -- =====================================================
  -- Create Agenda Items (linking discussions to meetings)
  -- =====================================================
  INSERT INTO agenda_items (id, meeting_id, discussion_id, business_item_id, announcement_id, speaker_id, title, description, order_index, duration_minutes, notes, is_completed, item_type, created_at, updated_at)
  VALUES
    -- Meeting a3333333 (Ward Council - October)
    ('40111111-1111-1111-1111-111111111111', 'a3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555', NULL, NULL, NULL, 'Christmas Service Project', NULL, 3, 20, 'Approved service project plan', true, 'discussion', NOW() - INTERVAL '10 weeks', NOW() - INTERVAL '10 weeks'),

    -- Meeting a4444444 (Bishopric - Week 5)
    ('40222222-2222-2222-2222-222222222222', 'a4444444-4444-4444-4444-444444444444', 'b1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, 'Youth Summer Camp Planning', NULL, 3, 25, 'Initial planning discussion', true, 'discussion', NOW() - INTERVAL '8 weeks', NOW() - INTERVAL '8 weeks'),

    -- Meeting a5555555 (Ward Council - November)
    ('40333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555', 'b2222222-2222-2222-2222-222222222222', NULL, NULL, NULL, 'Johnson Family Welcome', NULL, 4, 15, 'Coordinated welcome efforts', true, 'discussion', NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '6 weeks'),
    ('40333333-3333-3333-3333-333333333334', 'a5555555-5555-5555-5555-555555555555', NULL, 'd1111111-1111-1111-1111-111111111111', NULL, NULL, 'Sustain Sister Martinez as RS President', NULL, 6, 5, 'Prepared for sustaining vote', true, 'business', NOW() - INTERVAL '6 weeks', NOW() - INTERVAL '6 weeks'),

    -- Meeting a6666666 (Bishopric - Week 9)
    ('40444444-4444-4444-4444-444444444444', 'a6666666-6666-6666-6666-666666666666', 'b1111111-1111-1111-1111-111111111111', NULL, NULL, NULL, 'Youth Camp Update', NULL, 2, 15, 'Budget approved, camp confirmed', true, 'discussion', NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),
    ('40444444-4444-4444-4444-444444444445', 'a6666666-6666-6666-6666-666666666666', 'b4444444-4444-4444-4444-444444444444', NULL, NULL, NULL, 'Temple Night Planning', NULL, 4, 15, 'Set date and coordination plan', true, 'discussion', NOW() - INTERVAL '4 weeks', NOW() - INTERVAL '4 weeks'),

    -- Meeting a7777777 (Ward Council - December)
    ('40555555-5555-5555-5555-555555555555', 'a7777777-7777-7777-7777-777777777777', 'b3333333-3333-3333-3333-333333333333', NULL, NULL, NULL, 'Q1 Budget Review', NULL, 3, 20, 'Reviewed budget and proposed reallocations', true, 'discussion', NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks');

  RAISE NOTICE '✅ Demo data loaded successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Login with:';
  RAISE NOTICE '  Email: demo@beespo.com';
  RAISE NOTICE '  Password: Demo123!';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;

COMMIT;
