-- Beespo MVP - Business Feature
-- Add business items tracking for formal church procedures

-- =====================================================
-- NEW TABLE: business_items
-- =====================================================

CREATE TABLE business_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  position_calling TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'sustaining',
    'release',
    'confirmation',
    'ordination',
    'setting_apart',
    'other'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  action_date DATE,
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE MODIFICATIONS
-- =====================================================

-- Add business_item_id to agenda_items to link business items to agendas
ALTER TABLE agenda_items
ADD COLUMN business_item_id UUID REFERENCES business_items(id) ON DELETE SET NULL;

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_business_items_organization ON business_items(organization_id);
CREATE INDEX idx_business_items_status ON business_items(status);
CREATE INDEX idx_business_items_category ON business_items(category);
CREATE INDEX idx_business_items_person_name ON business_items(person_name);
CREATE INDEX idx_agenda_items_business_item ON agenda_items(business_item_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_business_items_updated_at BEFORE UPDATE ON business_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-set action_date when status changes to completed
CREATE OR REPLACE FUNCTION set_business_item_action_date()
RETURNS TRIGGER AS $$
BEGIN
  -- Status changed to completed: set action_date to today if null
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.action_date IS NULL THEN
    NEW.action_date = CURRENT_DATE;
  END IF;

  -- Status changed to pending: clear action_date
  IF NEW.status = 'pending' AND OLD.status = 'completed' THEN
    NEW.action_date = NULL;
  END IF;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_business_action_date
  BEFORE UPDATE ON business_items
  FOR EACH ROW
  EXECUTE FUNCTION set_business_item_action_date();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE business_items ENABLE ROW LEVEL SECURITY;

-- Leaders can view business items in their organization
CREATE POLICY "Leaders can view business items in their organization"
  ON business_items FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can create business items
CREATE POLICY "Leaders can create business items"
  ON business_items FOR INSERT
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can update business items
CREATE POLICY "Leaders can update business items"
  ON business_items FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Leaders can delete business items
CREATE POLICY "Leaders can delete business items"
  ON business_items FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'leader' AND
    organization_id = (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- =====================================================
-- FUNCTION UPDATE: Auto-add pending business items to meetings
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

  RETURN v_meeting_id;
END;
$$;
