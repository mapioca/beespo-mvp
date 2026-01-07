-- Beespo MVP - Announcements Feature
-- Add announcements for time-based information sharing

-- =====================================================
-- NEW TABLE: announcements
-- =====================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'stopped')),
  deadline DATE,  -- Optional; null means no auto-expiration
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE MODIFICATIONS
-- =====================================================

-- Add announcement_id to agenda_items to link announcements to agendas
ALTER TABLE agenda_items
ADD COLUMN announcement_id UUID REFERENCES announcements(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_announcements_organization ON announcements(organization_id);
CREATE INDEX idx_announcements_status ON announcements(status);
CREATE INDEX idx_announcements_priority ON announcements(priority);
CREATE INDEX idx_announcements_deadline ON announcements(deadline);
CREATE INDEX idx_agenda_items_announcement ON agenda_items(announcement_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-expire announcements when deadline passes
CREATE OR REPLACE FUNCTION auto_expire_announcements()
RETURNS TRIGGER AS $$
BEGIN
  -- If deadline has passed and status is still active, auto-stop it
  IF NEW.deadline IS NOT NULL
     AND NEW.deadline < CURRENT_DATE
     AND NEW.status = 'active'
  THEN
    NEW.status = 'stopped';
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER auto_expire_announcement_on_update
  BEFORE UPDATE ON announcements
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_announcements();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Leaders can view announcements in their organization
CREATE POLICY "Leaders can view announcements in their organization"
  ON announcements FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can create announcements
CREATE POLICY "Leaders can create announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can update announcements
CREATE POLICY "Leaders can update announcements"
  ON announcements FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can delete announcements
CREATE POLICY "Leaders can delete announcements"
  ON announcements FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- FUNCTION UPDATE: Auto-add active announcements to meetings
-- =====================================================

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
  v_max_order_index INTEGER;
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

  -- Copy template items to agenda items
  INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes)
  SELECT v_meeting_id, title, description, order_index, duration_minutes
  FROM template_items
  WHERE template_id = p_template_id
  ORDER BY order_index;

  -- Get the max order_index from copied template items
  SELECT COALESCE(MAX(order_index), -1) INTO v_max_order_index
  FROM agenda_items WHERE meeting_id = v_meeting_id;

  -- AUTO-ADD PENDING BUSINESS ITEMS
  -- Insert all pending business items as agenda items
  INSERT INTO agenda_items (meeting_id, business_item_id, title, description, order_index, duration_minutes)
  SELECT
    v_meeting_id,
    bi.id,
    'Business: ' ||
    CASE bi.category
      WHEN 'sustaining' THEN 'Sustaining'
      WHEN 'release' THEN 'Release'
      WHEN 'confirmation' THEN 'Confirmation'
      WHEN 'ordination' THEN 'Ordination'
      WHEN 'setting_apart' THEN 'Setting Apart'
      ELSE 'Other'
    END || ' - ' || bi.person_name,
    CONCAT(
      'Person: ', bi.person_name, E'\n',
      CASE WHEN bi.position_calling IS NOT NULL
        THEN 'Position: ' || bi.position_calling || E'\n'
        ELSE ''
      END,
      CASE WHEN bi.notes IS NOT NULL
        THEN 'Notes: ' || bi.notes
        ELSE ''
      END
    ),
    v_max_order_index + ROW_NUMBER() OVER (ORDER BY bi.created_at),
    5  -- Default 5 minutes for business items
  FROM business_items bi
  WHERE bi.organization_id = v_organization_id
    AND bi.status = 'pending'
  ORDER BY bi.created_at;

  -- Update max order_index after business items
  SELECT COALESCE(MAX(order_index), v_max_order_index) INTO v_max_order_index
  FROM agenda_items WHERE meeting_id = v_meeting_id;

  -- AUTO-ADD ACTIVE ANNOUNCEMENTS
  INSERT INTO agenda_items (meeting_id, announcement_id, title, description, order_index, duration_minutes)
  SELECT
    v_meeting_id,
    a.id,
    'Announcement: ' || a.title,
    CONCAT(
      CASE a.priority
        WHEN 'high' THEN '🔴 HIGH PRIORITY' || E'\n\n'
        WHEN 'medium' THEN '🟡 MEDIUM PRIORITY' || E'\n\n'
        WHEN 'low' THEN '🟢 LOW PRIORITY' || E'\n\n'
      END,
      a.content,
      CASE WHEN a.deadline IS NOT NULL
        THEN E'\n\nDeadline: ' || TO_CHAR(a.deadline, 'Mon DD, YYYY')
        ELSE ''
      END
    ),
    v_max_order_index + ROW_NUMBER() OVER (ORDER BY
      CASE a.priority
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
      END,
      a.created_at
    ),
    3  -- Default 3 minutes for announcements (shorter than business items)
  FROM announcements a
  WHERE a.organization_id = v_organization_id
    AND a.status = 'active'
    -- Only include announcements that haven't expired
    AND (a.deadline IS NULL OR a.deadline >= CURRENT_DATE)
  ORDER BY
    CASE a.priority
      WHEN 'high' THEN 1
      WHEN 'medium' THEN 2
      WHEN 'low' THEN 3
    END,
    a.created_at;

  RETURN v_meeting_id;
END;
$$;
