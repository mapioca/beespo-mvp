-- =============================================================================
-- Migration: Consolidate participants & speakers into directory + meeting_assignments
-- =============================================================================

-- ─── Step 1: Create directory table ─────────────────────────────────────────

CREATE TABLE public.directory (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name text NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_directory_name_per_workspace UNIQUE (workspace_id, name)
);

CREATE INDEX idx_directory_workspace_id ON public.directory(workspace_id);
CREATE INDEX idx_directory_name ON public.directory(workspace_id, name);

-- Updated_at trigger
CREATE TRIGGER set_directory_updated_at
    BEFORE UPDATE ON public.directory
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Step 2: RLS policies for directory ─────────────────────────────────────

ALTER TABLE public.directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view directory in their workspace"
    ON public.directory FOR SELECT
    USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders can create directory entries"
    ON public.directory FOR INSERT
    WITH CHECK (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

CREATE POLICY "Leaders can update directory entries"
    ON public.directory FOR UPDATE
    USING (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

CREATE POLICY "Leaders can delete directory entries"
    ON public.directory FOR DELETE
    USING (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

-- ─── Step 3: Migrate participants into directory (preserve UUIDs) ───────────

INSERT INTO public.directory (id, workspace_id, name, created_by, created_at, updated_at)
SELECT id, workspace_id, name, created_by, created_at, updated_at
FROM public.participants;

-- ─── Step 4: Insert speaker names not already in directory ──────────────────

INSERT INTO public.directory (workspace_id, name, created_by, created_at, updated_at)
SELECT DISTINCT ON (s.workspace_id, s.name)
    s.workspace_id, s.name, s.created_by, s.created_at, s.updated_at
FROM public.speakers s
WHERE NOT EXISTS (
    SELECT 1 FROM public.directory d
    WHERE d.workspace_id = s.workspace_id AND d.name = s.name
);

-- ─── Step 5: Create meeting_assignments table ───────────────────────────────

CREATE TABLE public.meeting_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    directory_id uuid NOT NULL REFERENCES public.directory(id) ON DELETE CASCADE,
    meeting_id uuid REFERENCES public.meetings(id) ON DELETE SET NULL,
    agenda_item_id uuid REFERENCES public.agenda_items(id) ON DELETE SET NULL,
    assignment_type text NOT NULL,
    topic text,
    is_confirmed boolean DEFAULT false,
    workspace_speaker_id text,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meeting_assignments_directory_id ON public.meeting_assignments(directory_id);
CREATE INDEX idx_meeting_assignments_workspace_id ON public.meeting_assignments(workspace_id);
CREATE INDEX idx_meeting_assignments_agenda_item_id ON public.meeting_assignments(agenda_item_id);
CREATE INDEX idx_meeting_assignments_meeting_id ON public.meeting_assignments(meeting_id);
CREATE INDEX idx_meeting_assignments_type ON public.meeting_assignments(assignment_type);

-- Updated_at trigger
CREATE TRIGGER set_meeting_assignments_updated_at
    BEFORE UPDATE ON public.meeting_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Step 6: RLS policies for meeting_assignments ───────────────────────────

ALTER TABLE public.meeting_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting assignments in their workspace"
    ON public.meeting_assignments FOR SELECT
    USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders can create meeting assignments"
    ON public.meeting_assignments FOR INSERT
    WITH CHECK (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

CREATE POLICY "Leaders can update meeting assignments"
    ON public.meeting_assignments FOR UPDATE
    USING (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

CREATE POLICY "Leaders can delete meeting assignments"
    ON public.meeting_assignments FOR DELETE
    USING (
        public.get_auth_role() IN ('admin', 'leader')
        AND workspace_id = public.get_auth_workspace_id()
    );

-- ─── Step 7: Migrate speaker data into meeting_assignments ──────────────────
-- First pass: one assignment per speaker (using speaker UUID as assignment UUID)

INSERT INTO public.meeting_assignments (
    id, workspace_id, directory_id, meeting_id, agenda_item_id,
    assignment_type, topic, is_confirmed, workspace_speaker_id,
    created_by, created_at, updated_at
)
SELECT
    s.id,
    s.workspace_id,
    d.id,
    ai.meeting_id,
    ai.id,
    'speaker',
    s.topic,
    s.is_confirmed,
    s.workspace_speaker_id,
    s.created_by,
    s.created_at,
    s.updated_at
FROM public.speakers s
JOIN public.directory d ON d.workspace_id = s.workspace_id AND d.name = s.name
LEFT JOIN public.agenda_items ai ON ai.speaker_id = s.id
-- Only take the first agenda_item per speaker to avoid UUID conflicts
WHERE ai.id IS NULL OR ai.id = (
    SELECT ai2.id FROM public.agenda_items ai2
    WHERE ai2.speaker_id = s.id
    ORDER BY ai2.created_at
    LIMIT 1
);

-- Second pass: speakers linked to multiple agenda items (generate new UUIDs for extra)
INSERT INTO public.meeting_assignments (
    workspace_id, directory_id, meeting_id, agenda_item_id,
    assignment_type, topic, is_confirmed, workspace_speaker_id,
    created_by, created_at, updated_at
)
SELECT
    s.workspace_id, d.id, ai.meeting_id, ai.id,
    'speaker', s.topic, s.is_confirmed, s.workspace_speaker_id,
    s.created_by, s.created_at, s.updated_at
FROM public.speakers s
JOIN public.directory d ON d.workspace_id = s.workspace_id AND d.name = s.name
JOIN public.agenda_items ai ON ai.speaker_id = s.id
WHERE ai.id NOT IN (
    SELECT agenda_item_id FROM public.meeting_assignments WHERE agenda_item_id IS NOT NULL
);

-- ─── Step 8: Migrate participant assignments into meeting_assignments ────────

INSERT INTO public.meeting_assignments (
    workspace_id, directory_id, meeting_id, agenda_item_id,
    assignment_type, created_at
)
SELECT
    d.workspace_id,
    ai.participant_id,
    ai.meeting_id,
    ai.id,
    CASE
        WHEN ai.title ILIKE '%prayer%' THEN 'prayer'
        WHEN ai.title ILIKE '%invocation%' THEN 'invocation'
        WHEN ai.title ILIKE '%benediction%' THEN 'benediction'
        ELSE 'participant'
    END,
    ai.created_at
FROM public.agenda_items ai
JOIN public.directory d ON d.id = ai.participant_id
WHERE ai.participant_id IS NOT NULL;

-- ─── Step 9: Repoint agenda_items.speaker_id FK → meeting_assignments ───────

ALTER TABLE public.agenda_items DROP CONSTRAINT IF EXISTS agenda_items_speaker_id_fkey;
ALTER TABLE public.agenda_items ADD CONSTRAINT agenda_items_speaker_id_fkey
    FOREIGN KEY (speaker_id) REFERENCES public.meeting_assignments(id) ON DELETE SET NULL;

-- ─── Step 10: Repoint agenda_items.participant_id FK → directory ─────────────

ALTER TABLE public.agenda_items DROP CONSTRAINT IF EXISTS agenda_items_participant_id_fkey;
ALTER TABLE public.agenda_items ADD CONSTRAINT agenda_items_participant_id_fkey
    FOREIGN KEY (participant_id) REFERENCES public.directory(id) ON DELETE SET NULL;

-- ─── Step 11: Update generate_workspace_speaker_id trigger ──────────────────

CREATE OR REPLACE FUNCTION public.generate_workspace_speaker_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  -- Only generate for speaker assignments
  IF NEW.assignment_type = 'speaker' AND NEW.workspace_speaker_id IS NULL THEN
    v_workspace_id := NEW.workspace_id;

    INSERT INTO workspace_speaker_counters (workspace_id, current_counter)
    VALUES (v_workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;

    UPDATE workspace_speaker_counters
    SET current_counter = current_counter + 1, updated_at = NOW()
    WHERE workspace_id = v_workspace_id
    RETURNING current_counter INTO v_counter;

    v_entity_id := 'SPKR-' || LPAD(v_counter::TEXT, 4, '0');
    NEW.workspace_speaker_id := v_entity_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger on speakers
DROP TRIGGER IF EXISTS trigger_generate_workspace_speaker_id ON public.speakers;

-- Create new trigger on meeting_assignments
CREATE TRIGGER set_workspace_assignment_id
    BEFORE INSERT ON public.meeting_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_workspace_speaker_id();

-- ─── Step 12: Update RPCs to read from directory instead of participants ─────

CREATE OR REPLACE FUNCTION public.create_meeting_with_agenda(
  p_template_id uuid,
  p_title text,
  p_scheduled_date timestamp with time zone,
  p_agenda_items jsonb DEFAULT '[]'::jsonb,
  p_notes jsonb DEFAULT NULL::jsonb
)
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
  SELECT workspace_id INTO v_workspace_id
  FROM profiles WHERE id = auth.uid();

  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('admin', 'leader') THEN
    RAISE EXCEPTION 'Only admins and leaders can create meetings';
  END IF;

  INSERT INTO meetings (workspace_id, template_id, title, scheduled_date, notes, created_by)
  VALUES (v_workspace_id, p_template_id, p_title, p_scheduled_date, COALESCE(p_notes, '{"time": 0, "blocks": [], "version": "2.31.0"}'::jsonb), auth.uid())
  RETURNING id INTO v_meeting_id;

  IF jsonb_array_length(p_agenda_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_agenda_items)
    LOOP
      v_item_type := CASE
        WHEN v_item->>'item_type' IN ('discussion', 'business', 'announcement', 'speaker', 'procedural', 'structural')
          THEN (v_item->>'item_type')::agenda_item_type
        WHEN v_item->>'discussion_id' IS NOT NULL THEN 'discussion'::agenda_item_type
        WHEN v_item->>'business_item_id' IS NOT NULL THEN 'business'::agenda_item_type
        WHEN v_item->>'announcement_id' IS NOT NULL THEN 'announcement'::agenda_item_type
        WHEN v_item->>'speaker_id' IS NOT NULL THEN 'speaker'::agenda_item_type
        ELSE 'procedural'::agenda_item_type
      END;

      -- Get participant name: either from payload or lookup from directory table
      v_participant_name := v_item->>'participant_name';
      IF v_participant_name IS NULL AND v_item->>'participant_id' IS NOT NULL THEN
        SELECT name INTO v_participant_name
        FROM directory
        WHERE id = (v_item->>'participant_id')::UUID;
      END IF;

      v_child_items := CASE
        WHEN v_item->'child_items' IS NOT NULL AND jsonb_typeof(v_item->'child_items') = 'array'
          THEN v_item->'child_items'
        ELSE NULL
      END;

      INSERT INTO agenda_items (
        meeting_id, title, description, item_notes, order_index, duration_minutes,
        item_type, discussion_id, business_item_id, announcement_id, speaker_id,
        hymn_id, participant_id, participant_name, child_items, structural_type
      ) VALUES (
        v_meeting_id,
        v_item->>'title',
        v_item->>'description',
        v_item->>'item_notes',
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
    INSERT INTO agenda_items (meeting_id, title, description, item_notes, order_index, duration_minutes, item_type, structural_type)
    SELECT v_meeting_id, title, description, item_notes, order_index, duration_minutes, item_type, structural_type
    FROM template_items
    WHERE template_id = p_template_id
    ORDER BY order_index;
  END IF;

  RETURN v_meeting_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_meeting_with_agenda(
  p_meeting_id uuid,
  p_title text,
  p_scheduled_date timestamp with time zone,
  p_agenda_items jsonb DEFAULT '[]'::jsonb,
  p_notes jsonb DEFAULT NULL::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_workspace_id UUID;
  v_item JSONB;
  v_item_id UUID;
  v_order_index INTEGER := 0;
  v_item_type agenda_item_type;
  v_participant_name TEXT;
  v_child_items JSONB;
  v_valid_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT workspace_id INTO v_workspace_id
  FROM meetings WHERE id = p_meeting_id;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND workspace_id = v_workspace_id
      AND role IN ('admin', 'leader')
  ) THEN
    RAISE EXCEPTION 'Only admins and leaders of this unit can update meetings';
  END IF;

  IF p_notes IS NOT NULL THEN
    UPDATE meetings
    SET title = p_title, scheduled_date = p_scheduled_date, notes = p_notes, updated_at = NOW()
    WHERE id = p_meeting_id;
  ELSE
    UPDATE meetings
    SET title = p_title, scheduled_date = p_scheduled_date, updated_at = NOW()
    WHERE id = p_meeting_id;
  END IF;

  IF jsonb_array_length(p_agenda_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_agenda_items)
    LOOP
      IF v_item->>'id' IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
         v_valid_ids := array_append(v_valid_ids, (v_item->>'id')::UUID);
      END IF;
    END LOOP;
  END IF;

  DELETE FROM agenda_items
  WHERE meeting_id = p_meeting_id
    AND (array_length(v_valid_ids, 1) IS NULL OR id != ALL(v_valid_ids));

  IF jsonb_array_length(p_agenda_items) > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_agenda_items)
    LOOP
      v_item_type := CASE
        WHEN v_item->>'item_type' IN ('discussion', 'business', 'announcement', 'speaker', 'procedural', 'structural')
          THEN (v_item->>'item_type')::agenda_item_type
        WHEN v_item->>'discussion_id' IS NOT NULL THEN 'discussion'::agenda_item_type
        WHEN v_item->>'business_item_id' IS NOT NULL THEN 'business'::agenda_item_type
        WHEN v_item->>'announcement_id' IS NOT NULL THEN 'announcement'::agenda_item_type
        WHEN v_item->>'speaker_id' IS NOT NULL THEN 'speaker'::agenda_item_type
        ELSE 'procedural'::agenda_item_type
      END;

      -- Get participant name from directory
      v_participant_name := v_item->>'participant_name';
      IF v_participant_name IS NULL AND v_item->>'participant_id' IS NOT NULL THEN
        SELECT name INTO v_participant_name
        FROM directory
        WHERE id = (v_item->>'participant_id')::UUID;
      END IF;

      IF v_item ? 'child_items' THEN
        v_child_items := v_item->'child_items';
      ELSE
        v_child_items := '[]'::jsonb;
      END IF;

      IF v_item->>'id' IS NOT NULL AND (v_item->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        UPDATE agenda_items
        SET
          title = v_item->>'title',
          description = v_item->>'description',
          item_notes = v_item->>'item_notes',
          order_index = v_order_index,
          duration_minutes = (v_item->>'duration_minutes')::INTEGER,
          item_type = v_item_type,
          speaker_id = (v_item->>'speaker_id')::UUID,
          participant_id = (v_item->>'participant_id')::UUID,
          participant_name = v_participant_name,
          discussion_id = (v_item->>'discussion_id')::UUID,
          business_item_id = (v_item->>'business_item_id')::UUID,
          announcement_id = (v_item->>'announcement_id')::UUID,
          hymn_id = (v_item->>'hymn_id')::UUID,
          child_items = v_child_items,
          structural_type = v_item->>'structural_type',
          updated_at = NOW()
        WHERE id = (v_item->>'id')::UUID AND meeting_id = p_meeting_id;
      ELSE
        INSERT INTO agenda_items (
          meeting_id, title, description, item_notes, order_index, duration_minutes,
          item_type, speaker_id, participant_id, participant_name,
          discussion_id, business_item_id, announcement_id, hymn_id,
          child_items, structural_type
        ) VALUES (
          p_meeting_id,
          v_item->>'title',
          v_item->>'description',
          v_item->>'item_notes',
          v_order_index,
          (v_item->>'duration_minutes')::INTEGER,
          v_item_type,
          (v_item->>'speaker_id')::UUID,
          (v_item->>'participant_id')::UUID,
          v_participant_name,
          (v_item->>'discussion_id')::UUID,
          (v_item->>'business_item_id')::UUID,
          (v_item->>'announcement_id')::UUID,
          (v_item->>'hymn_id')::UUID,
          v_child_items,
          v_item->>'structural_type'
        );
      END IF;

      v_order_index := v_order_index + 1;
    END LOOP;
  END IF;

  RETURN p_meeting_id;
END;
$function$;

-- ─── Step 13: Drop old tables ───────────────────────────────────────────────

-- Drop speaker_templates (join table that depends on speakers)
DROP POLICY IF EXISTS "Leaders can manage speaker templates" ON public.speaker_templates;
DROP POLICY IF EXISTS "Users can view speaker templates" ON public.speaker_templates;
DROP POLICY IF EXISTS "Users can view speaker templates in their workspace" ON public.speaker_templates;
DROP TABLE IF EXISTS public.speaker_templates;

-- Drop speakers RLS policies
DROP POLICY IF EXISTS "Leaders and admins can create speakers" ON public.speakers;
DROP POLICY IF EXISTS "Leaders and admins can delete speakers" ON public.speakers;
DROP POLICY IF EXISTS "Leaders and admins can manage speakers" ON public.speakers;
DROP POLICY IF EXISTS "Leaders and admins can update speakers" ON public.speakers;
DROP POLICY IF EXISTS "Users can view speakers in their workspace" ON public.speakers;

-- Drop speakers table
DROP TABLE public.speakers;

-- Drop participants RLS policies
DROP POLICY IF EXISTS "Leaders can create participants" ON public.participants;
DROP POLICY IF EXISTS "Leaders and admins can manage participants" ON public.participants;
DROP POLICY IF EXISTS "Leaders can delete participants" ON public.participants;
DROP POLICY IF EXISTS "Leaders can update participants" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their workspace" ON public.participants;

-- Drop participants table
DROP TABLE public.participants;
