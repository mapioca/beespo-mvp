-- Migration: Update create_meeting_from_template logic
-- Description: Adds auto-fetching of pending business items and active announcements

CREATE OR REPLACE FUNCTION create_meeting_from_template(
  p_template_id UUID,
  p_title TEXT,
  p_scheduled_date TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_meeting_id UUID;
  v_organization_id UUID;
  v_next_order_index INTEGER;
BEGIN
  -- Get organization_id from user profile
  SELECT organization_id INTO v_organization_id
  FROM profiles WHERE id = auth.uid();

  -- Verify user is a leader
  IF (SELECT role FROM profiles WHERE id = auth.uid()) != 'leader' THEN
    RAISE EXCEPTION 'Only leaders can create meetings';
  END IF;

  -- Create meeting
  INSERT INTO meetings (organization_id, template_id, title, scheduled_date, created_by)
  VALUES (v_organization_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;

  -- 1. Copy template items to agenda items
  INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes, item_type)
  SELECT 
    v_meeting_id, 
    title, 
    description, 
    order_index, 
    duration_minutes, 
    item_type
  FROM template_items
  WHERE template_id = p_template_id;

  -- Get the current max order_index to append items after
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order_index
  FROM agenda_items
  WHERE meeting_id = v_meeting_id;

  -- 2. Auto-add Pending Business Items
  -- We insert them as 'business' type items linked to the business_item row
  INSERT INTO agenda_items (
    meeting_id, 
    title, 
    order_index, 
    item_type, 
    business_item_id,
    duration_minutes
  )
  SELECT 
    v_meeting_id,
    CASE 
      WHEN category = 'sustaining' THEN 'Sustaining: ' || person_name || ' - ' || position_calling
      WHEN category = 'release' THEN 'Vote of Thanks: ' || person_name || ' - ' || position_calling
      ELSE 'Business: ' || person_name
    END as title,
    v_next_order_index + (ROW_NUMBER() OVER (ORDER BY created_at)) - 1,
    'business',
    id,
    2 -- Default 2 mins for business
  FROM business_items
  WHERE organization_id = v_organization_id 
  AND status = 'pending';

  -- Update index for next step
  SELECT COALESCE(MAX(order_index), -1) + 1 INTO v_next_order_index
  FROM agenda_items
  WHERE meeting_id = v_meeting_id;

  -- 3. Auto-add Active Announcements
  INSERT INTO agenda_items (
    meeting_id, 
    title, 
    description,
    order_index, 
    item_type, 
    announcement_id,
    duration_minutes
  )
  SELECT 
    v_meeting_id,
    title,
    content,
    v_next_order_index + (ROW_NUMBER() OVER (ORDER BY priority DESC, created_at DESC)) - 1,
    'announcement',
    id,
    1 -- Default 1 min for announcements
  FROM announcements
  WHERE organization_id = v_organization_id 
  AND status = 'active';

  RETURN v_meeting_id;
END;
$$;
