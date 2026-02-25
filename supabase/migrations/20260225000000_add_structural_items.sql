-- Add 'structural' to agenda_item_type ENUM
ALTER TYPE agenda_item_type ADD VALUE IF NOT EXISTS 'structural';

-- Add structural_type column to agenda_items table
ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS structural_type text;

-- Add structural_type column to template_items table (for template support)
ALTER TABLE template_items ADD COLUMN IF NOT EXISTS structural_type text;

-- Recreate create_meeting_with_agenda to support structural item_type and structural_type
CREATE OR REPLACE FUNCTION public.create_meeting_with_agenda(p_template_id uuid, p_title text, p_scheduled_date timestamp with time zone, p_agenda_items jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_meeting_id UUID;
  v_workspace_id UUID;
  v_item JSONB;
  v_order_index INTEGER := 0;
  v_item_type agenda_item_type;
  v_participant_name TEXT;
  v_child_items JSONB;
BEGIN
  -- Get workspace_id from user profile
  SELECT workspace_id INTO v_workspace_id
  FROM profiles WHERE id = auth.uid();

  -- Verify user is an admin or leader
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create meetings';
  END IF;

  -- Create meeting
  INSERT INTO meetings (workspace_id, template_id, title, scheduled_date, created_by)
  VALUES (v_workspace_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;

  -- If agenda items provided, insert them directly
  IF jsonb_array_length(p_agenda_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_agenda_items)
    LOOP
      -- Use item_type from payload if valid, otherwise determine from FKs
      v_item_type := CASE
        -- If item_type is explicitly provided and valid, use it (allows empty containers)
        WHEN v_item->>'item_type' IN ('discussion', 'business', 'announcement', 'speaker', 'procedural', 'structural')
          THEN (v_item->>'item_type')::agenda_item_type
        -- Fallback: determine from FK presence
        WHEN v_item->>'discussion_id' IS NOT NULL THEN 'discussion'::agenda_item_type
        WHEN v_item->>'business_item_id' IS NOT NULL THEN 'business'::agenda_item_type
        WHEN v_item->>'announcement_id' IS NOT NULL THEN 'announcement'::agenda_item_type
        WHEN v_item->>'speaker_id' IS NOT NULL THEN 'speaker'::agenda_item_type
        ELSE 'procedural'::agenda_item_type
      END;

      -- Get participant name: either from payload or lookup from participants table
      v_participant_name := v_item->>'participant_name';
      IF v_participant_name IS NULL AND v_item->>'participant_id' IS NOT NULL THEN
        SELECT name INTO v_participant_name
        FROM participants
        WHERE id = (v_item->>'participant_id')::UUID;
      END IF;

      -- Get child_items if present (for containers)
      v_child_items := CASE
        WHEN v_item->'child_items' IS NOT NULL AND jsonb_typeof(v_item->'child_items') = 'array'
          THEN v_item->'child_items'
        ELSE NULL
      END;

      INSERT INTO agenda_items (
        meeting_id,
        title,
        description,
        order_index,
        duration_minutes,
        item_type,
        discussion_id,
        business_item_id,
        announcement_id,
        speaker_id,
        hymn_id,
        participant_id,
        participant_name,
        child_items,
        structural_type
      ) VALUES (
        v_meeting_id,
        v_item->>'title',
        v_item->>'description',
        (v_item->>'order_index')::INTEGER,
        COALESCE((v_item->>'duration_minutes')::INTEGER, 5),
        v_item_type,
        CASE WHEN v_item->>'discussion_id' IS NOT NULL
             THEN (v_item->>'discussion_id')::UUID ELSE NULL END,
        CASE WHEN v_item->>'business_item_id' IS NOT NULL
             THEN (v_item->>'business_item_id')::UUID ELSE NULL END,
        CASE WHEN v_item->>'announcement_id' IS NOT NULL
             THEN (v_item->>'announcement_id')::UUID ELSE NULL END,
        CASE WHEN v_item->>'speaker_id' IS NOT NULL
             THEN (v_item->>'speaker_id')::UUID ELSE NULL END,
        CASE WHEN v_item->>'hymn_id' IS NOT NULL
             THEN (v_item->>'hymn_id')::UUID ELSE NULL END,
        CASE WHEN v_item->>'participant_id' IS NOT NULL
             THEN (v_item->>'participant_id')::UUID ELSE NULL END,
        v_participant_name,
        v_child_items,
        v_item->>'structural_type'
      );

      v_order_index := v_order_index + 1;
    END LOOP;
  ELSE
    -- Fallback: Copy template items if no composed agenda
    INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes, item_type, structural_type)
    SELECT v_meeting_id, title, description, order_index, duration_minutes, item_type, structural_type
    FROM template_items
    WHERE template_id = p_template_id
    ORDER BY order_index;
  END IF;

  RETURN v_meeting_id;
END;
$function$
