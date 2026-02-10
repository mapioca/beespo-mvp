--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: agenda_item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.agenda_item_type AS ENUM (
    'procedural',
    'discussion',
    'business',
    'announcement',
    'speaker'
);


--
-- Name: column_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.column_type_enum AS ENUM (
    'text',
    'number',
    'select',
    'multi_select',
    'date',
    'datetime',
    'checkbox',
    'user_link',
    'table_link'
);


--
-- Name: hymn_book_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hymn_book_type AS ENUM (
    'hymns_church',
    'hymns_home_church',
    'childrens_songbook'
);


--
-- Name: anonymize_user_account(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.anonymize_user_account(target_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_workspace_id UUID;
  v_old_email TEXT;
  v_anonymized_email TEXT;
  v_unassigned_tasks INT := 0;
  v_result JSONB;
BEGIN
  -- Get the user's current workspace and email
  SELECT workspace_id, email INTO v_workspace_id, v_old_email
  FROM profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  -- Generate anonymized email (unique, frees original)
  v_anonymized_email := 'deleted_' || target_user_id::text || '_' ||
                        extract(epoch from now())::bigint || '@deleted.beespo.com';

  -- ========================================
  -- A. Anonymize the Profile
  -- ========================================
  UPDATE profiles
  SET
    full_name = 'Former Member',
    email = v_anonymized_email,
    role_title = NULL,
    feature_interests = NULL,
    is_deleted = TRUE,
    deleted_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id;

  -- ========================================
  -- B. Unassign incomplete tasks
  -- ========================================
  WITH updated_tasks AS (
    UPDATE tasks
    SET
      assigned_to = NULL,
      updated_at = NOW()
    WHERE assigned_to = target_user_id
      AND status != 'completed'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_unassigned_tasks FROM updated_tasks;

  -- ========================================
  -- C. Remove from workspace invitations (pending ones they sent)
  -- ========================================
  UPDATE workspace_invitations
  SET invited_by = NULL
  WHERE invited_by = target_user_id;

  -- Revoke any pending invitations TO this user's email
  UPDATE workspace_invitations
  SET status = 'revoked'
  WHERE email = v_old_email
    AND status = 'pending';

  -- ========================================
  -- D. Clean up user-specific data
  -- ========================================
  -- Delete OAuth tokens
  DELETE FROM oauth_tokens WHERE user_id = target_user_id;

  -- Delete notification preferences (if table exists)
  -- DELETE FROM notification_preferences WHERE user_id = target_user_id;

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'old_email', v_old_email,
    'anonymized_email', v_anonymized_email,
    'unassigned_tasks', v_unassigned_tasks,
    'deleted_at', NOW()
  );

  RETURN v_result;
END;
$$;


--
-- Name: FUNCTION anonymize_user_account(target_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.anonymize_user_account(target_user_id uuid) IS 'Anonymizes a user account for deletion. Preserves historical data but removes PII.
Call this BEFORE deleting from auth.users.';


--
-- Name: auto_expire_announcements(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_expire_announcements() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: create_meeting_from_template(uuid, text, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_meeting_from_template(p_template_id uuid, p_title text, p_scheduled_date timestamp with time zone) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_meeting_id UUID;
  v_workspace_id UUID;
BEGIN
  -- Get workspace_id from user profile
  SELECT workspace_id INTO v_workspace_id
  FROM profiles WHERE id = auth.uid();
  -- Verify user is a leader or admin
  IF (SELECT role FROM profiles WHERE id = auth.uid()) NOT IN ('leader', 'admin') THEN
    RAISE EXCEPTION 'Only leaders and admins can create meetings';
  END IF;
  -- Create meeting
  INSERT INTO meetings (workspace_id, template_id, title, scheduled_date, created_by)
  VALUES (v_workspace_id, p_template_id, p_title, p_scheduled_date, auth.uid())
  RETURNING id INTO v_meeting_id;
  -- Copy template items to agenda items (structure only, no auto-linking)
  INSERT INTO agenda_items (
    meeting_id, 
    title, 
    description, 
    order_index, 
    duration_minutes, 
    item_type,
    procedural_item_type_id,
    hymn_number,
    hymn_title
  )
  SELECT 
    v_meeting_id, 
    title, 
    description, 
    order_index, 
    duration_minutes, 
    item_type,
    procedural_item_type_id,
    hymn_number,
    hymn_title
  FROM template_items
  WHERE template_id = p_template_id
  ORDER BY order_index;
  RETURN v_meeting_id;
END;
$$;


--
-- Name: create_meeting_with_agenda(uuid, text, timestamp with time zone, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_meeting_with_agenda(p_template_id uuid, p_title text, p_scheduled_date timestamp with time zone, p_agenda_items jsonb DEFAULT '[]'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
        WHEN v_item->>'item_type' IN ('discussion', 'business', 'announcement', 'speaker', 'procedural')
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
        child_items
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
        v_child_items
      );

      v_order_index := v_order_index + 1;
    END LOOP;
  ELSE
    -- Fallback: Copy template items if no composed agenda
    INSERT INTO agenda_items (meeting_id, title, description, order_index, duration_minutes, item_type)
    SELECT v_meeting_id, title, description, order_index, duration_minutes, item_type
    FROM template_items
    WHERE template_id = p_template_id
    ORDER BY order_index;
  END IF;

  RETURN v_meeting_id;
END;
$$;


--
-- Name: create_platform_invitation(integer, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_platform_invitation(p_max_uses integer DEFAULT 1, p_description text DEFAULT NULL::text, p_expires_in_days integer DEFAULT NULL::integer) RETURNS TABLE(id uuid, code text, max_uses integer, expires_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_code TEXT;
  v_new_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_attempts INTEGER := 0;
BEGIN
  -- Verify caller is sys_admin (qualify column with table name to avoid ambiguity)
  IF (SELECT profiles.is_sys_admin FROM profiles WHERE profiles.id = auth.uid()) != true THEN
    RAISE EXCEPTION 'Only system administrators can create invite codes';
  END IF;
  -- Calculate expiration
  IF p_expires_in_days IS NOT NULL THEN
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;
  -- Generate unique code with retry
  LOOP
    v_code := generate_invite_code();
    v_attempts := v_attempts + 1;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM platform_invitations WHERE platform_invitations.code = v_code) THEN
      EXIT;
    END IF;
    
    IF v_attempts > 10 THEN
      RAISE EXCEPTION 'Unable to generate unique code after 10 attempts';
    END IF;
  END LOOP;
  -- Insert the new invitation
  INSERT INTO platform_invitations (code, description, max_uses, expires_at, created_by)
  VALUES (v_code, p_description, p_max_uses, v_expires_at, auth.uid())
  RETURNING platform_invitations.id INTO v_new_id;
  RETURN QUERY 
  SELECT v_new_id, v_code, p_max_uses, v_expires_at;
END;
$$;


--
-- Name: ensure_single_default_view(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_single_default_view() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE dynamic_views
    SET is_default = false
    WHERE table_id = NEW.table_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: generate_dynamic_table_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_dynamic_table_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);

    -- Append random suffix for uniqueness
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);

    NEW.slug := final_slug;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: generate_form_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_form_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from title if slug not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := lower(regexp_replace(NEW.title, '[^a-zA-Z0-9]+', '-', 'g'));
    base_slug := trim(both '-' from base_slug);
    
    -- Append random suffix for uniqueness
    final_slug := base_slug || '-' || substring(gen_random_uuid()::text from 1 for 8);
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_invite_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_invite_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- Exclude confusing chars: I, O, 0, 1
  v_i INTEGER;
BEGIN
  v_code := 'BEE-';
  
  FOR v_i IN 1..6 LOOP
    v_code := v_code || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
  END LOOP;
  
  RETURN v_code;
END;
$$;


--
-- Name: generate_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slug(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$;


--
-- Name: generate_workspace_announcement_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_announcement_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_announcement_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_announcement_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'ANNC-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_announcement_id := v_entity_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_business_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_business_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_business_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_business_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'BIZ-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_business_id := v_entity_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_discussion_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_discussion_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_discussion_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_discussion_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'DISC-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_discussion_id := v_entity_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_event_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_event_id() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_counter INTEGER;
BEGIN
    -- Initialize counter if not exists
    INSERT INTO workspace_event_counters (workspace_id, counter)
    VALUES (NEW.workspace_id, 0)
    ON CONFLICT (workspace_id) DO NOTHING;

    -- Increment and get new counter
    UPDATE workspace_event_counters
    SET counter = counter + 1
    WHERE workspace_id = NEW.workspace_id
    RETURNING counter INTO new_counter;

    -- Set the workspace_event_id
    NEW.workspace_event_id := 'EVT-' || LPAD(new_counter::TEXT, 4, '0');

    RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_meeting_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_meeting_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
  v_workspace_id := NEW.workspace_id;
  
  INSERT INTO workspace_meeting_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  UPDATE workspace_meeting_counters
  SET current_counter = current_counter + 1, updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  v_entity_id := 'MTG-' || LPAD(v_counter::TEXT, 4, '0');
  NEW.workspace_meeting_id := v_entity_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_speaker_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_speaker_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_entity_id TEXT;
BEGIN
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
  
  RETURN NEW;
END;
$$;


--
-- Name: generate_workspace_task_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_workspace_task_id() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_workspace_id UUID;
  v_counter INTEGER;
  v_task_id TEXT;
BEGIN
  -- Get workspace_id from the task
  v_workspace_id := NEW.workspace_id;
  
  -- Initialize counter for workspace if it doesn't exist
  INSERT INTO workspace_task_counters (workspace_id, current_counter)
  VALUES (v_workspace_id, 0)
  ON CONFLICT (workspace_id) DO NOTHING;
  
  -- Increment and get the counter
  UPDATE workspace_task_counters
  SET current_counter = current_counter + 1,
      updated_at = NOW()
  WHERE workspace_id = v_workspace_id
  RETURNING current_counter INTO v_counter;
  
  -- Generate the task ID in format TASK-XXXX (4 digits, zero-padded)
  v_task_id := 'TASK-' || LPAD(v_counter::TEXT, 4, '0');
  
  -- Assign to the new row
  NEW.workspace_task_id := v_task_id;
  
  RETURN NEW;
END;
$$;


--
-- Name: get_auth_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_auth_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;


--
-- Name: get_auth_workspace_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_auth_workspace_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$;


--
-- Name: get_meeting_share_analytics(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_meeting_share_analytics(p_meeting_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_views', COALESCE(SUM(view_count), 0),
    'unique_visitors', COUNT(*),
    'first_view', MIN(first_viewed_at),
    'last_view', MAX(last_viewed_at)
  ) INTO result
  FROM meeting_share_views
  WHERE meeting_id = p_meeting_id;

  RETURN result;
END;
$$;


--
-- Name: log_calling_process_started(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_calling_process_started() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO calling_history_log (
    calling_process_id,
    action,
    to_value,
    created_by
  ) VALUES (
    NEW.id,
    'process_started',
    NEW.current_stage,
    auth.uid()
  );
  RETURN NEW;
END;
$$;


--
-- Name: log_calling_stage_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.log_calling_stage_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  IF OLD.current_stage IS DISTINCT FROM NEW.current_stage THEN
    INSERT INTO calling_history_log (
      calling_process_id,
      action,
      from_value,
      to_value,
      created_by
    ) VALUES (
      NEW.id,
      'stage_changed',
      OLD.current_stage,
      NEW.current_stage,
      auth.uid()
    );
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO calling_history_log (
      calling_process_id,
      action,
      from_value,
      to_value,
      notes,
      created_by
    ) VALUES (
      NEW.id,
      'status_changed',
      OLD.status,
      NEW.status,
      CASE WHEN NEW.status = 'dropped' THEN NEW.dropped_reason ELSE NULL END,
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_business_item_action_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_business_item_action_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: set_column_position(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_column_position() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM dynamic_columns
    WHERE table_id = NEW.table_id AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_row_position(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_row_position() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.position = 0 THEN
    SELECT COALESCE(MAX(position), 0) + 1 INTO NEW.position
    FROM dynamic_rows
    WHERE table_id = NEW.table_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_template_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_template_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_workspace_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_workspace_slug() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_slug(NEW.name) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_share_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_share_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: user_workspace_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_workspace_id() RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$;


--
-- Name: validate_and_consume_invite_code(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_and_consume_invite_code(p_code text, p_ip_address text DEFAULT NULL::text) RETURNS TABLE(is_valid boolean, error_message text, invitation_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_invitation RECORD;
  v_rate_limited BOOLEAN := false;
  v_attempt_count INTEGER;
BEGIN
  -- Check rate limiting (5 failed attempts in 15 minutes = locked)
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO v_attempt_count
    FROM invite_validation_attempts
    WHERE ip_address = p_ip_address
      AND was_successful = false
      AND attempted_at > NOW() - INTERVAL '15 minutes';
    
    IF v_attempt_count >= 5 THEN
      -- Log this blocked attempt
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
      
      RETURN QUERY SELECT false, 'Too many attempts. Please try again later.', NULL::UUID;
      RETURN;
    END IF;
  END IF;
  -- Find and lock the invitation row for update
  SELECT * INTO v_invitation
  FROM platform_invitations
  WHERE code = UPPER(TRIM(p_code))  -- Case-insensitive comparison
  FOR UPDATE;
  -- Code doesn't exist
  IF v_invitation IS NULL THEN
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;
  -- Check if revoked
  IF v_invitation.status = 'revoked' THEN
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;
  -- Check if expired
  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < NOW() THEN
    -- Update status to expired if not already
    IF v_invitation.status != 'expired' THEN
      UPDATE platform_invitations SET status = 'expired' WHERE id = v_invitation.id;
    END IF;
    
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;
  -- Check if exhausted
  IF v_invitation.uses_count >= v_invitation.max_uses THEN
    -- Update status to exhausted if not already
    IF v_invitation.status != 'exhausted' THEN
      UPDATE platform_invitations SET status = 'exhausted' WHERE id = v_invitation.id;
    END IF;
    
    IF p_ip_address IS NOT NULL THEN
      INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
      VALUES (p_ip_address, LEFT(p_code, 4) || '****', false);
    END IF;
    
    RETURN QUERY SELECT false, 'Invalid invite code.', NULL::UUID;
    RETURN;
  END IF;
  -- Code is valid! Increment usage count
  UPDATE platform_invitations 
  SET 
    uses_count = uses_count + 1,
    status = CASE 
      WHEN uses_count + 1 >= max_uses THEN 'exhausted'
      ELSE status 
    END
  WHERE id = v_invitation.id;
  -- Log successful attempt
  IF p_ip_address IS NOT NULL THEN
    INSERT INTO invite_validation_attempts (ip_address, attempted_code, was_successful)
    VALUES (p_ip_address, LEFT(p_code, 4) || '****', true);
  END IF;
  RETURN QUERY SELECT true, NULL::TEXT, v_invitation.id;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agenda_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    meeting_id uuid,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL,
    duration_minutes integer,
    notes jsonb,
    is_completed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discussion_id uuid,
    business_item_id uuid,
    announcement_id uuid,
    item_type public.agenda_item_type DEFAULT 'procedural'::public.agenda_item_type NOT NULL,
    speaker_id uuid,
    participant_id uuid,
    participant_name text,
    hymn_id uuid,
    child_items jsonb,
    CONSTRAINT check_procedural_no_complex_fks CHECK (((item_type <> 'procedural'::public.agenda_item_type) OR ((discussion_id IS NULL) AND (business_item_id IS NULL) AND (announcement_id IS NULL) AND (speaker_id IS NULL))))
);


--
-- Name: COLUMN agenda_items.speaker_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agenda_items.speaker_id IS 'Optional foreign key to speakers table. NULL indicates an unassigned/TBD speaker slot.';


--
-- Name: COLUMN agenda_items.hymn_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agenda_items.hymn_id IS 'Reference to the hymn associated with this agenda item';


--
-- Name: COLUMN agenda_items.child_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.agenda_items.child_items IS 'JSONB array of child items for container types (discussion, business, announcement). Each child contains title, description, and relevant foreign key.';


--
-- Name: announcement_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcement_templates (
    announcement_id uuid NOT NULL,
    template_id uuid NOT NULL
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    deadline date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_announcement_id character varying(20),
    schedule_date timestamp with time zone,
    recurrence_type text,
    recurrence_end_date date,
    recurrence_config jsonb DEFAULT '{}'::jsonb,
    event_id uuid,
    display_start timestamp with time zone,
    display_until timestamp with time zone,
    CONSTRAINT announcements_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT announcements_recurrence_type_check CHECK ((recurrence_type = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'biweekly'::text, 'monthly'::text, 'yearly'::text, 'custom'::text]))),
    CONSTRAINT announcements_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'stopped'::text])))
);


--
-- Name: COLUMN announcements.schedule_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.schedule_date IS 'The date/time when this announcement appears on the calendar';


--
-- Name: COLUMN announcements.recurrence_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.recurrence_type IS 'Type of recurrence: none, daily, weekly, biweekly, monthly, yearly, custom';


--
-- Name: COLUMN announcements.recurrence_end_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.recurrence_end_date IS 'End date for recurring announcements (null = indefinite until deadline)';


--
-- Name: COLUMN announcements.recurrence_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.recurrence_config IS 'JSON config for custom recurrence patterns (e.g., specific days of week)';


--
-- Name: COLUMN announcements.event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.event_id IS 'Reference to the event this announcement was promoted from';


--
-- Name: COLUMN announcements.display_start; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.display_start IS 'When to start displaying the announcement (for promoted events)';


--
-- Name: COLUMN announcements.display_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.announcements.display_until IS 'When to stop displaying the announcement (for promoted events)';


--
-- Name: app_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    app_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    scopes text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE app_tokens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.app_tokens IS 'OAuth tokens for connected apps per user and workspace';


--
-- Name: COLUMN app_tokens.access_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_tokens.access_token IS 'Encrypted OAuth access token';


--
-- Name: COLUMN app_tokens.refresh_token; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_tokens.refresh_token IS 'Encrypted OAuth refresh token';


--
-- Name: COLUMN app_tokens.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_tokens.expires_at IS 'Token expiration timestamp';


--
-- Name: COLUMN app_tokens.scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.app_tokens.scopes IS 'Granted OAuth scopes';


--
-- Name: apps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.apps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    icon_url text,
    category text,
    is_active boolean DEFAULT true,
    requires_oauth boolean DEFAULT true,
    oauth_scopes text[],
    features text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE apps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.apps IS 'Available apps in the Apps Hub marketplace';


--
-- Name: COLUMN apps.slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.slug IS 'URL-friendly unique identifier (e.g., canva, figma)';


--
-- Name: COLUMN apps.name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.name IS 'Display name of the app';


--
-- Name: COLUMN apps.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.description IS 'App description for marketplace display';


--
-- Name: COLUMN apps.icon_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.icon_url IS 'Path to app icon';


--
-- Name: COLUMN apps.category; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.category IS 'App category (design, productivity, etc.)';


--
-- Name: COLUMN apps.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.is_active IS 'Whether app is available in marketplace';


--
-- Name: COLUMN apps.requires_oauth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.requires_oauth IS 'Whether app requires OAuth connection';


--
-- Name: COLUMN apps.oauth_scopes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.oauth_scopes IS 'Required OAuth scopes for the app';


--
-- Name: COLUMN apps.features; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.apps.features IS 'Feature flags unlocked by this app';


--
-- Name: business_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    person_name text NOT NULL,
    position_calling text,
    category text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    action_date date,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_business_id character varying(20),
    details jsonb,
    CONSTRAINT business_items_category_check CHECK ((category = ANY (ARRAY['sustaining'::text, 'release'::text, 'confirmation'::text, 'ordination'::text, 'setting_apart'::text, 'other'::text]))),
    CONSTRAINT business_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text])))
);


--
-- Name: COLUMN business_items.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.business_items.details IS 'Structured metadata for conducting script generation. Schema varies by category: ordination requires office/priesthood, sustaining/release require calling, all require gender for pronouns.';


--
-- Name: business_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.business_templates (
    business_item_id uuid NOT NULL,
    template_id uuid NOT NULL
);


--
-- Name: calendar_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendar_subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    color text DEFAULT '#6b7280'::text,
    is_enabled boolean DEFAULT true,
    last_synced_at timestamp with time zone,
    sync_error text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE calendar_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.calendar_subscriptions IS 'External iCal calendar subscription sources';


--
-- Name: COLUMN calendar_subscriptions.url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.calendar_subscriptions.url IS 'iCal feed URL (must be https)';


--
-- Name: COLUMN calendar_subscriptions.sync_error; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.calendar_subscriptions.sync_error IS 'Last sync error message if any';


--
-- Name: calling_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calling_candidates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    calling_id uuid NOT NULL,
    candidate_name_id uuid NOT NULL,
    status text DEFAULT 'proposed'::text NOT NULL,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calling_candidates_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'discussing'::text, 'selected'::text, 'archived'::text])))
);


--
-- Name: calling_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calling_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    calling_process_id uuid NOT NULL,
    content text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: calling_history_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calling_history_log (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    calling_process_id uuid NOT NULL,
    action text NOT NULL,
    from_value text,
    to_value text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calling_history_log_action_check CHECK ((action = ANY (ARRAY['process_started'::text, 'stage_changed'::text, 'status_changed'::text, 'comment_added'::text, 'task_created'::text, 'task_completed'::text])))
);


--
-- Name: calling_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calling_processes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    calling_id uuid NOT NULL,
    candidate_name_id uuid NOT NULL,
    calling_candidate_id uuid,
    current_stage text DEFAULT 'defined'::text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    dropped_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT calling_processes_current_stage_check CHECK ((current_stage = ANY (ARRAY['defined'::text, 'approved'::text, 'extended'::text, 'accepted'::text, 'sustained'::text, 'set_apart'::text, 'recorded_lcr'::text]))),
    CONSTRAINT calling_processes_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'dropped'::text])))
);


--
-- Name: calling_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.calling_summary AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS workspace_id,
    NULL::text AS title,
    NULL::text AS organization,
    NULL::boolean AS is_filled,
    NULL::uuid AS filled_by,
    NULL::timestamp with time zone AS filled_at,
    NULL::uuid AS created_by,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::text AS filled_by_name,
    NULL::bigint AS candidate_count,
    NULL::bigint AS active_process_count;


--
-- Name: callings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.callings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    organization text,
    is_filled boolean DEFAULT false,
    filled_by uuid,
    filled_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: candidate_names; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.candidate_names (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discussion_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    discussion_id uuid NOT NULL,
    meeting_id uuid,
    content text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: discussion_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.discussion_summary AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS organization_id,
    NULL::character varying(200) AS title,
    NULL::text AS description,
    NULL::text AS category,
    NULL::text AS status,
    NULL::text AS priority,
    NULL::date AS due_date,
    NULL::text AS deferred_reason,
    NULL::uuid AS created_by,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::bigint AS note_count,
    NULL::bigint AS task_count,
    NULL::bigint AS meeting_count;


--
-- Name: discussion_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussion_templates (
    discussion_id uuid NOT NULL,
    template_id uuid NOT NULL
);


--
-- Name: discussions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discussions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    description text,
    category text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    due_date date,
    deferred_reason text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    parent_discussion_id uuid,
    workspace_discussion_id character varying(20),
    CONSTRAINT discussions_category_check CHECK ((category = ANY (ARRAY['member_concerns'::text, 'activities'::text, 'service_opportunities'::text, 'callings'::text, 'temple_work'::text, 'budget'::text, 'facilities'::text, 'youth'::text, 'mission_work'::text, 'other'::text]))),
    CONSTRAINT discussions_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT discussions_status_check CHECK ((status = ANY (ARRAY['new'::text, 'active'::text, 'decision_required'::text, 'monitoring'::text, 'resolved'::text, 'deferred'::text])))
);


--
-- Name: COLUMN discussions.parent_discussion_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.discussions.parent_discussion_id IS 'Reference to parent discussion if this is a follow-up discussion';


--
-- Name: dynamic_columns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_columns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid NOT NULL,
    name text NOT NULL,
    type public.column_type_enum DEFAULT 'text'::public.column_type_enum NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    is_required boolean DEFAULT false NOT NULL,
    default_value jsonb,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dynamic_columns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dynamic_columns IS 'Column definitions for dynamic tables with type-specific config';


--
-- Name: COLUMN dynamic_columns.config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dynamic_columns.config IS 'Type-specific configuration: options for select, format for numbers, etc.';


--
-- Name: COLUMN dynamic_columns.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dynamic_columns.deleted_at IS 'Soft delete timestamp for 30-day recovery window';


--
-- Name: dynamic_rows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_rows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    form_submission_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dynamic_rows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dynamic_rows IS 'Row data stored as JSONB with column_id keys';


--
-- Name: COLUMN dynamic_rows.workspace_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dynamic_rows.workspace_id IS 'Denormalized for RLS performance - always matches table.workspace_id';


--
-- Name: COLUMN dynamic_rows.data; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dynamic_rows.data IS 'Row data as { "column_id": value } - values typed per column definition';


--
-- Name: dynamic_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_tables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    icon text,
    slug text NOT NULL,
    linked_form_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dynamic_tables; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dynamic_tables IS 'User-defined tables with custom schema (Notion/Airtable-style)';


--
-- Name: dynamic_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dynamic_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    table_id uuid NOT NULL,
    name text NOT NULL,
    filters jsonb DEFAULT '[]'::jsonb NOT NULL,
    sorts jsonb DEFAULT '[]'::jsonb NOT NULL,
    visible_columns uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    column_widths jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE dynamic_views; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dynamic_views IS 'Saved views with filters, sorts, and column visibility';


--
-- Name: event_designs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_designs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    workspace_id uuid NOT NULL,
    canva_design_id text NOT NULL,
    canva_edit_url text,
    edit_url_expires_at timestamp with time zone,
    title text NOT NULL,
    width integer DEFAULT 480,
    height integer DEFAULT 672,
    export_status text DEFAULT 'pending'::text,
    export_job_id text,
    storage_path text,
    public_url text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT event_designs_export_status_check CHECK ((export_status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE event_designs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.event_designs IS 'Canva designs created for events';


--
-- Name: COLUMN event_designs.canva_design_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.canva_design_id IS 'Canva design ID';


--
-- Name: COLUMN event_designs.canva_edit_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.canva_edit_url IS 'URL to edit the design in Canva';


--
-- Name: COLUMN event_designs.edit_url_expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.edit_url_expires_at IS 'When the edit URL expires';


--
-- Name: COLUMN event_designs.export_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.export_status IS 'Export job status: pending, processing, completed, failed';


--
-- Name: COLUMN event_designs.export_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.export_job_id IS 'Canva export job ID';


--
-- Name: COLUMN event_designs.storage_path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.storage_path IS 'Path in Supabase Storage';


--
-- Name: COLUMN event_designs.public_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.event_designs.public_url IS 'Public URL of exported image';


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    location text,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    is_all_day boolean DEFAULT false,
    workspace_event_id text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    external_source_id text,
    external_source_type text,
    CONSTRAINT events_external_source_type_check CHECK ((external_source_type = ANY (ARRAY['google'::text, 'outlook'::text, 'ics'::text, 'apple'::text, 'other'::text]))),
    CONSTRAINT events_title_check CHECK ((char_length(title) <= 200)),
    CONSTRAINT events_valid_dates CHECK ((end_at >= start_at))
);


--
-- Name: TABLE events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.events IS 'Calendar events for the workspace';


--
-- Name: COLUMN events.title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.title IS 'Event title (max 200 characters)';


--
-- Name: COLUMN events.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.description IS 'Event description/details';


--
-- Name: COLUMN events.location; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.location IS 'Event location';


--
-- Name: COLUMN events.start_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.start_at IS 'Event start timestamp';


--
-- Name: COLUMN events.end_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.end_at IS 'Event end timestamp';


--
-- Name: COLUMN events.is_all_day; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.is_all_day IS 'Whether this is an all-day event';


--
-- Name: COLUMN events.workspace_event_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.workspace_event_id IS 'Human-readable workspace-scoped ID (EVT-0001, etc.)';


--
-- Name: COLUMN events.external_source_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.external_source_id IS 'UID from the external calendar source (for deduplication/shadowing)';


--
-- Name: COLUMN events.external_source_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.events.external_source_type IS 'Type of external source: google, outlook, ics, apple, or other';


--
-- Name: external_calendar_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_calendar_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    subscription_id uuid NOT NULL,
    external_uid text NOT NULL,
    title text NOT NULL,
    description text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    location text,
    is_all_day boolean DEFAULT false,
    raw_ical text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE external_calendar_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_calendar_events IS 'Cached events from external calendar subscriptions';


--
-- Name: COLUMN external_calendar_events.external_uid; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_calendar_events.external_uid IS 'UID from the iCal VEVENT';


--
-- Name: COLUMN external_calendar_events.raw_ical; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.external_calendar_events.raw_ical IS 'Original VEVENT content for debugging';


--
-- Name: external_event_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_event_links (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    external_event_id uuid,
    announcement_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE external_event_links; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.external_event_links IS 'Links between external events and converted announcements';


--
-- Name: form_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    data jsonb DEFAULT '{}'::jsonb NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: form_view_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_view_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    form_id uuid NOT NULL,
    view_date date NOT NULL,
    view_count integer DEFAULT 0 NOT NULL
);


--
-- Name: forms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    schema jsonb DEFAULT '{"id": "", "title": "", "fields": []}'::jsonb NOT NULL,
    slug text NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: hidden_template_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hidden_template_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    category_name character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE hidden_template_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.hidden_template_categories IS 'Tracks which Beespo template categories (calling_type) are hidden per workspace. Admins can hide categories like bishopric, relief_society, etc.';


--
-- Name: hymns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hymns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    book_id text NOT NULL,
    hymn_number integer NOT NULL,
    title text NOT NULL,
    lyrics text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: invite_validation_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invite_validation_attempts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    ip_address text NOT NULL,
    attempted_code text,
    attempted_at timestamp with time zone DEFAULT now(),
    was_successful boolean DEFAULT false
);


--
-- Name: meeting_share_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_share_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    email text NOT NULL,
    permission text NOT NULL,
    token uuid DEFAULT gen_random_uuid() NOT NULL,
    invited_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT meeting_share_invitations_permission_check CHECK ((permission = ANY (ARRAY['viewer'::text, 'editor'::text]))),
    CONSTRAINT meeting_share_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: meeting_share_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_share_settings (
    meeting_id uuid NOT NULL,
    allow_notes_export boolean DEFAULT false,
    show_duration_estimates boolean DEFAULT true,
    show_presenter_names boolean DEFAULT true,
    custom_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: meeting_share_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_share_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meeting_id uuid NOT NULL,
    visitor_fingerprint text NOT NULL,
    first_viewed_at timestamp with time zone DEFAULT now(),
    last_viewed_at timestamp with time zone DEFAULT now(),
    view_count integer DEFAULT 1,
    referrer text,
    user_agent text,
    country_code text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meetings (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid,
    template_id uuid,
    title text NOT NULL,
    scheduled_date timestamp with time zone NOT NULL,
    status text DEFAULT 'scheduled'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_meeting_id character varying(20),
    notes jsonb DEFAULT '{"time": 0, "blocks": [], "version": "2.31.0"}'::jsonb,
    public_share_token text,
    is_publicly_shared boolean DEFAULT false,
    description text,
    share_uuid uuid DEFAULT gen_random_uuid(),
    CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: COLUMN meetings.description; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.meetings.description IS 'Optional description or summary for the meeting';


--
-- Name: note_associations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_associations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    note_id uuid NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT note_associations_entity_type_check CHECK ((entity_type = ANY (ARRAY['discussion'::text, 'meeting'::text, 'task'::text])))
);


--
-- Name: notebooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notebooks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    title text DEFAULT 'Untitled Notebook'::text NOT NULL,
    cover_style text DEFAULT 'gradient-ocean'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notes (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    title text DEFAULT 'Untitled Note'::text NOT NULL,
    content jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_personal boolean DEFAULT false NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    notebook_id uuid
);


--
-- Name: participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: platform_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_invitations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    code text NOT NULL,
    description text,
    max_uses integer DEFAULT 1 NOT NULL,
    uses_count integer DEFAULT 0 NOT NULL,
    expires_at timestamp with time zone,
    status text DEFAULT 'active'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT platform_invitations_status_check CHECK ((status = ANY (ARRAY['active'::text, 'exhausted'::text, 'expired'::text, 'revoked'::text])))
);


--
-- Name: procedural_item_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedural_item_types (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    default_duration_minutes integer DEFAULT 5,
    order_hint integer,
    is_custom boolean DEFAULT false,
    is_hymn boolean DEFAULT false,
    hymn_number integer,
    created_at timestamp with time zone DEFAULT now(),
    workspace_id uuid,
    category text DEFAULT 'other'::text,
    requires_participant boolean DEFAULT false,
    icon_name text DEFAULT 'BookOpen'::text,
    is_deprecated boolean DEFAULT false,
    requires_assignee boolean DEFAULT false,
    requires_resource boolean DEFAULT false,
    has_rich_text boolean DEFAULT false,
    is_core boolean DEFAULT false,
    icon text
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    workspace_id uuid,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_sys_admin boolean DEFAULT false,
    platform_invitation_id uuid,
    role_title text,
    feature_interests jsonb DEFAULT '[]'::jsonb,
    feature_tier text,
    deleted_at timestamp with time zone,
    is_deleted boolean DEFAULT false,
    CONSTRAINT profiles_feature_tier_check CHECK (((feature_tier IS NULL) OR (feature_tier = ANY (ARRAY['bishopric'::text, 'organization'::text, 'support'::text])))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'leader'::text, 'guest'::text])))
);


--
-- Name: COLUMN profiles.role_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.role_title IS 'The user role title within their organization (e.g., "Bishop", "Relief Society President")';


--
-- Name: COLUMN profiles.feature_interests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.feature_interests IS 'Array of feature keys the user is interested in';


--
-- Name: COLUMN profiles.feature_tier; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.feature_tier IS 'Feature tier based on role: bishopric (full), organization (standard), support (limited)';


--
-- Name: speaker_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speaker_templates (
    speaker_id uuid NOT NULL,
    template_id uuid NOT NULL
);


--
-- Name: speakers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.speakers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    topic text NOT NULL,
    is_confirmed boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    workspace_speaker_id character varying(20)
);


--
-- Name: task_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_activities (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid,
    activity_type text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_comments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_label_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_label_assignments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    label_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: task_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task_labels (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    color text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid,
    meeting_id uuid,
    agenda_item_id uuid,
    title text NOT NULL,
    description text,
    assigned_to uuid,
    due_date date,
    status text DEFAULT 'pending'::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    discussion_id uuid,
    business_item_id uuid,
    access_token uuid DEFAULT extensions.uuid_generate_v4(),
    completed_at timestamp with time zone,
    workspace_task_id character varying(20),
    priority text DEFAULT 'medium'::text NOT NULL,
    calling_process_id uuid,
    CONSTRAINT tasks_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text]))),
    CONSTRAINT tasks_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: template_folders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_folders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: TABLE template_folders; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.template_folders IS 'User-created folders for organizing custom templates within a workspace. Limited to one depth level (no nested folders).';


--
-- Name: template_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    template_id uuid,
    title text NOT NULL,
    description text,
    order_index integer NOT NULL,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now(),
    item_type public.agenda_item_type DEFAULT 'procedural'::public.agenda_item_type NOT NULL,
    procedural_item_type_id text,
    hymn_number integer,
    hymn_title text,
    hymn_id uuid
);


--
-- Name: templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid,
    name text NOT NULL,
    description text,
    calling_type text,
    is_shared boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    folder_id uuid,
    tags text[] DEFAULT '{}'::text[],
    slug text
);


--
-- Name: COLUMN templates.folder_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.templates.folder_id IS 'Optional folder assignment for custom templates. Null for root-level templates or Beespo shared templates.';


--
-- Name: COLUMN templates.tags; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.templates.tags IS 'Array of tags for categorizing and filtering templates. Examples: Leadership, Auxiliary, Sacrament, Sunday School, etc.';


--
-- Name: time_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.time_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    meeting_id uuid NOT NULL,
    agenda_item_id uuid,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_announcement_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_announcement_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_apps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_apps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    app_id uuid NOT NULL,
    connected_by uuid,
    status text DEFAULT 'pending'::text,
    settings jsonb DEFAULT '{}'::jsonb,
    connected_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workspace_apps_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'connected'::text, 'disconnected'::text, 'error'::text])))
);


--
-- Name: TABLE workspace_apps; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.workspace_apps IS 'Apps connected to workspaces';


--
-- Name: COLUMN workspace_apps.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_apps.status IS 'Connection status: pending, connected, disconnected, error';


--
-- Name: COLUMN workspace_apps.settings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_apps.settings IS 'App-specific settings for this workspace';


--
-- Name: COLUMN workspace_apps.connected_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspace_apps.connected_at IS 'When the OAuth connection was completed';


--
-- Name: workspace_business_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_business_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_discussion_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_discussion_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_event_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_event_counters (
    workspace_id uuid NOT NULL,
    counter integer DEFAULT 0
);


--
-- Name: workspace_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_invitations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    workspace_id uuid NOT NULL,
    email text NOT NULL,
    role text NOT NULL,
    token uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invited_by uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'leader'::text, 'guest'::text]))),
    CONSTRAINT workspace_invitations_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'revoked'::text, 'expired'::text])))
);


--
-- Name: workspace_meeting_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_meeting_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_speaker_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_speaker_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspace_task_counters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_task_counters (
    workspace_id uuid NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: workspaces; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspaces (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    organization_type text DEFAULT 'bishopric'::text NOT NULL,
    slug text,
    unit_name text,
    CONSTRAINT workspaces_organization_type_check CHECK ((organization_type = ANY (ARRAY['bishopric'::text, 'elders_quorum'::text, 'relief_society'::text, 'young_men'::text, 'young_women'::text, 'primary'::text, 'missionary_work'::text, 'temple_family_history'::text, 'sunday_school'::text]))),
    CONSTRAINT workspaces_type_check CHECK ((type = ANY (ARRAY['group'::text, 'branch'::text, 'ward'::text, 'district'::text, 'stake'::text])))
);


--
-- Name: COLUMN workspaces.unit_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.workspaces.unit_name IS 'The name of the church unit (e.g., "Riverside" for Riverside Ward)';


--
-- Name: agenda_items agenda_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_pkey PRIMARY KEY (id);


--
-- Name: announcement_templates announcement_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_templates
    ADD CONSTRAINT announcement_templates_pkey PRIMARY KEY (announcement_id, template_id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: app_tokens app_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_tokens
    ADD CONSTRAINT app_tokens_pkey PRIMARY KEY (id);


--
-- Name: app_tokens app_tokens_user_id_app_id_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_tokens
    ADD CONSTRAINT app_tokens_user_id_app_id_workspace_id_key UNIQUE (user_id, app_id, workspace_id);


--
-- Name: apps apps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_pkey PRIMARY KEY (id);


--
-- Name: apps apps_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.apps
    ADD CONSTRAINT apps_slug_key UNIQUE (slug);


--
-- Name: business_items business_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_items
    ADD CONSTRAINT business_items_pkey PRIMARY KEY (id);


--
-- Name: business_templates business_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_pkey PRIMARY KEY (business_item_id, template_id);


--
-- Name: calendar_subscriptions calendar_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_subscriptions
    ADD CONSTRAINT calendar_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: calling_candidates calling_candidates_calling_id_candidate_name_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_candidates
    ADD CONSTRAINT calling_candidates_calling_id_candidate_name_id_key UNIQUE (calling_id, candidate_name_id);


--
-- Name: calling_candidates calling_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_candidates
    ADD CONSTRAINT calling_candidates_pkey PRIMARY KEY (id);


--
-- Name: calling_comments calling_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_comments
    ADD CONSTRAINT calling_comments_pkey PRIMARY KEY (id);


--
-- Name: calling_history_log calling_history_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_history_log
    ADD CONSTRAINT calling_history_log_pkey PRIMARY KEY (id);


--
-- Name: calling_processes calling_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_processes
    ADD CONSTRAINT calling_processes_pkey PRIMARY KEY (id);


--
-- Name: callings callings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callings
    ADD CONSTRAINT callings_pkey PRIMARY KEY (id);


--
-- Name: candidate_names candidate_names_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_names
    ADD CONSTRAINT candidate_names_pkey PRIMARY KEY (id);


--
-- Name: candidate_names candidate_names_workspace_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_names
    ADD CONSTRAINT candidate_names_workspace_id_name_key UNIQUE (workspace_id, name);


--
-- Name: discussion_notes discussion_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_notes
    ADD CONSTRAINT discussion_notes_pkey PRIMARY KEY (id);


--
-- Name: discussion_templates discussion_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_templates
    ADD CONSTRAINT discussion_templates_pkey PRIMARY KEY (discussion_id, template_id);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: dynamic_columns dynamic_columns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_columns
    ADD CONSTRAINT dynamic_columns_pkey PRIMARY KEY (id);


--
-- Name: dynamic_rows dynamic_rows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_rows
    ADD CONSTRAINT dynamic_rows_pkey PRIMARY KEY (id);


--
-- Name: dynamic_tables dynamic_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_tables
    ADD CONSTRAINT dynamic_tables_pkey PRIMARY KEY (id);


--
-- Name: dynamic_tables dynamic_tables_workspace_id_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_tables
    ADD CONSTRAINT dynamic_tables_workspace_id_slug_key UNIQUE (workspace_id, slug);


--
-- Name: dynamic_views dynamic_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_views
    ADD CONSTRAINT dynamic_views_pkey PRIMARY KEY (id);


--
-- Name: event_designs event_designs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_designs
    ADD CONSTRAINT event_designs_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: external_calendar_events external_calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_calendar_events
    ADD CONSTRAINT external_calendar_events_pkey PRIMARY KEY (id);


--
-- Name: external_calendar_events external_calendar_events_subscription_id_external_uid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_calendar_events
    ADD CONSTRAINT external_calendar_events_subscription_id_external_uid_key UNIQUE (subscription_id, external_uid);


--
-- Name: external_event_links external_event_links_announcement_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_links
    ADD CONSTRAINT external_event_links_announcement_id_key UNIQUE (announcement_id);


--
-- Name: external_event_links external_event_links_external_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_links
    ADD CONSTRAINT external_event_links_external_event_id_key UNIQUE (external_event_id);


--
-- Name: external_event_links external_event_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_links
    ADD CONSTRAINT external_event_links_pkey PRIMARY KEY (id);


--
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- Name: form_view_analytics form_view_analytics_form_id_view_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_view_analytics
    ADD CONSTRAINT form_view_analytics_form_id_view_date_key UNIQUE (form_id, view_date);


--
-- Name: form_view_analytics form_view_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_view_analytics
    ADD CONSTRAINT form_view_analytics_pkey PRIMARY KEY (id);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: forms forms_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_slug_key UNIQUE (slug);


--
-- Name: hidden_template_categories hidden_template_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_template_categories
    ADD CONSTRAINT hidden_template_categories_pkey PRIMARY KEY (id);


--
-- Name: hymns hymns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hymns
    ADD CONSTRAINT hymns_pkey PRIMARY KEY (id);


--
-- Name: invite_validation_attempts invite_validation_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invite_validation_attempts
    ADD CONSTRAINT invite_validation_attempts_pkey PRIMARY KEY (id);


--
-- Name: meeting_share_invitations meeting_share_invitations_meeting_id_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_invitations
    ADD CONSTRAINT meeting_share_invitations_meeting_id_email_key UNIQUE (meeting_id, email);


--
-- Name: meeting_share_invitations meeting_share_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_invitations
    ADD CONSTRAINT meeting_share_invitations_pkey PRIMARY KEY (id);


--
-- Name: meeting_share_invitations meeting_share_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_invitations
    ADD CONSTRAINT meeting_share_invitations_token_key UNIQUE (token);


--
-- Name: meeting_share_settings meeting_share_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_settings
    ADD CONSTRAINT meeting_share_settings_pkey PRIMARY KEY (meeting_id);


--
-- Name: meeting_share_views meeting_share_views_meeting_id_visitor_fingerprint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_views
    ADD CONSTRAINT meeting_share_views_meeting_id_visitor_fingerprint_key UNIQUE (meeting_id, visitor_fingerprint);


--
-- Name: meeting_share_views meeting_share_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_views
    ADD CONSTRAINT meeting_share_views_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);


--
-- Name: meetings meetings_public_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_public_share_token_key UNIQUE (public_share_token);


--
-- Name: meetings meetings_share_uuid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_share_uuid_key UNIQUE (share_uuid);


--
-- Name: note_associations note_associations_note_id_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_associations
    ADD CONSTRAINT note_associations_note_id_entity_type_entity_id_key UNIQUE (note_id, entity_type, entity_id);


--
-- Name: note_associations note_associations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_associations
    ADD CONSTRAINT note_associations_pkey PRIMARY KEY (id);


--
-- Name: notebooks notebooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notebooks
    ADD CONSTRAINT notebooks_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: workspaces organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: participants participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_pkey PRIMARY KEY (id);


--
-- Name: platform_invitations platform_invitations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_invitations
    ADD CONSTRAINT platform_invitations_code_key UNIQUE (code);


--
-- Name: platform_invitations platform_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_invitations
    ADD CONSTRAINT platform_invitations_pkey PRIMARY KEY (id);


--
-- Name: procedural_item_types procedural_item_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedural_item_types
    ADD CONSTRAINT procedural_item_types_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: speaker_templates speaker_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_templates
    ADD CONSTRAINT speaker_templates_pkey PRIMARY KEY (speaker_id, template_id);


--
-- Name: speakers speakers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_pkey PRIMARY KEY (id);


--
-- Name: task_activities task_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_activities
    ADD CONSTRAINT task_activities_pkey PRIMARY KEY (id);


--
-- Name: task_comments task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_pkey PRIMARY KEY (id);


--
-- Name: task_label_assignments task_label_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT task_label_assignments_pkey PRIMARY KEY (id);


--
-- Name: task_label_assignments task_label_assignments_task_id_label_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT task_label_assignments_task_id_label_id_key UNIQUE (task_id, label_id);


--
-- Name: task_labels task_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_pkey PRIMARY KEY (id);


--
-- Name: task_labels task_labels_workspace_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_workspace_id_name_key UNIQUE (workspace_id, name);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: template_folders template_folders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_folders
    ADD CONSTRAINT template_folders_pkey PRIMARY KEY (id);


--
-- Name: template_items template_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_pkey PRIMARY KEY (id);


--
-- Name: templates templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_pkey PRIMARY KEY (id);


--
-- Name: templates templates_workspace_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_workspace_slug_unique UNIQUE (workspace_id, slug);


--
-- Name: time_logs time_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_pkey PRIMARY KEY (id);


--
-- Name: template_folders unique_folder_name_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_folders
    ADD CONSTRAINT unique_folder_name_per_workspace UNIQUE (workspace_id, name);


--
-- Name: hidden_template_categories unique_hidden_category_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_template_categories
    ADD CONSTRAINT unique_hidden_category_per_workspace UNIQUE (workspace_id, category_name);


--
-- Name: announcements unique_workspace_announcement_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT unique_workspace_announcement_id_per_workspace UNIQUE (workspace_id, workspace_announcement_id);


--
-- Name: business_items unique_workspace_business_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_items
    ADD CONSTRAINT unique_workspace_business_id_per_workspace UNIQUE (workspace_id, workspace_business_id);


--
-- Name: discussions unique_workspace_discussion_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT unique_workspace_discussion_id_per_workspace UNIQUE (workspace_id, workspace_discussion_id);


--
-- Name: meetings unique_workspace_meeting_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT unique_workspace_meeting_id_per_workspace UNIQUE (workspace_id, workspace_meeting_id);


--
-- Name: speakers unique_workspace_speaker_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT unique_workspace_speaker_id_per_workspace UNIQUE (workspace_id, workspace_speaker_id);


--
-- Name: tasks unique_workspace_task_id_per_workspace; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT unique_workspace_task_id_per_workspace UNIQUE (workspace_id, workspace_task_id);


--
-- Name: workspace_announcement_counters workspace_announcement_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_announcement_counters
    ADD CONSTRAINT workspace_announcement_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_apps workspace_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_apps
    ADD CONSTRAINT workspace_apps_pkey PRIMARY KEY (id);


--
-- Name: workspace_apps workspace_apps_workspace_id_app_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_apps
    ADD CONSTRAINT workspace_apps_workspace_id_app_id_key UNIQUE (workspace_id, app_id);


--
-- Name: workspace_business_counters workspace_business_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_business_counters
    ADD CONSTRAINT workspace_business_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_discussion_counters workspace_discussion_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_discussion_counters
    ADD CONSTRAINT workspace_discussion_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_event_counters workspace_event_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_event_counters
    ADD CONSTRAINT workspace_event_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_invitations workspace_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_pkey PRIMARY KEY (id);


--
-- Name: workspace_invitations workspace_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_token_key UNIQUE (token);


--
-- Name: workspace_meeting_counters workspace_meeting_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_meeting_counters
    ADD CONSTRAINT workspace_meeting_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_speaker_counters workspace_speaker_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_speaker_counters
    ADD CONSTRAINT workspace_speaker_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspace_task_counters workspace_task_counters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_task_counters
    ADD CONSTRAINT workspace_task_counters_pkey PRIMARY KEY (workspace_id);


--
-- Name: workspaces workspaces_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_slug_key UNIQUE (slug);


--
-- Name: idx_agenda_items_announcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_announcement ON public.agenda_items USING btree (announcement_id);


--
-- Name: idx_agenda_items_business_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_business_item ON public.agenda_items USING btree (business_item_id);


--
-- Name: idx_agenda_items_discussion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_discussion ON public.agenda_items USING btree (discussion_id);


--
-- Name: idx_agenda_items_hymn_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_hymn_id ON public.agenda_items USING btree (hymn_id);


--
-- Name: idx_agenda_items_meeting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_meeting ON public.agenda_items USING btree (meeting_id);


--
-- Name: idx_agenda_items_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_participant ON public.agenda_items USING btree (participant_id);


--
-- Name: idx_agenda_items_speaker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_speaker ON public.agenda_items USING btree (speaker_id);


--
-- Name: idx_agenda_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agenda_items_type ON public.agenda_items USING btree (item_type);


--
-- Name: idx_announcement_templates_announcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcement_templates_announcement ON public.announcement_templates USING btree (announcement_id);


--
-- Name: idx_announcement_templates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcement_templates_template ON public.announcement_templates USING btree (template_id);


--
-- Name: idx_announcements_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_created_at ON public.announcements USING btree (created_at DESC);


--
-- Name: idx_announcements_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_deadline ON public.announcements USING btree (deadline);


--
-- Name: idx_announcements_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_event_id ON public.announcements USING btree (event_id) WHERE (event_id IS NOT NULL);


--
-- Name: idx_announcements_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_organization ON public.announcements USING btree (workspace_id);


--
-- Name: idx_announcements_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_priority ON public.announcements USING btree (priority);


--
-- Name: idx_announcements_schedule_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_schedule_date ON public.announcements USING btree (schedule_date) WHERE (schedule_date IS NOT NULL);


--
-- Name: idx_announcements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_status ON public.announcements USING btree (status);


--
-- Name: idx_announcements_workspace_announcement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_workspace_announcement_id ON public.announcements USING btree (workspace_announcement_id);


--
-- Name: idx_announcements_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_workspace_created ON public.announcements USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: INDEX idx_announcements_workspace_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_announcements_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';


--
-- Name: idx_announcements_workspace_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_workspace_schedule ON public.announcements USING btree (workspace_id, schedule_date);


--
-- Name: idx_announcements_workspace_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_announcements_workspace_status_created ON public.announcements USING btree (workspace_id, status, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_app_tokens_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_tokens_expires ON public.app_tokens USING btree (expires_at);


--
-- Name: idx_app_tokens_user_app; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_tokens_user_app ON public.app_tokens USING btree (user_id, app_id);


--
-- Name: idx_app_tokens_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_tokens_workspace ON public.app_tokens USING btree (workspace_id);


--
-- Name: idx_apps_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_active ON public.apps USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_apps_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_category ON public.apps USING btree (category);


--
-- Name: idx_apps_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_slug ON public.apps USING btree (slug);


--
-- Name: idx_business_items_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_category ON public.business_items USING btree (category);


--
-- Name: idx_business_items_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_created_at ON public.business_items USING btree (created_at DESC);


--
-- Name: idx_business_items_details; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_details ON public.business_items USING gin (details);


--
-- Name: idx_business_items_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_organization ON public.business_items USING btree (workspace_id);


--
-- Name: idx_business_items_person_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_person_name ON public.business_items USING btree (person_name);


--
-- Name: idx_business_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_status ON public.business_items USING btree (status);


--
-- Name: idx_business_items_workspace_business_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_workspace_business_id ON public.business_items USING btree (workspace_business_id);


--
-- Name: idx_business_items_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_items_workspace_created ON public.business_items USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: INDEX idx_business_items_workspace_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_business_items_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';


--
-- Name: idx_business_templates_business; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_templates_business ON public.business_templates USING btree (business_item_id);


--
-- Name: idx_business_templates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_business_templates_template ON public.business_templates USING btree (template_id);


--
-- Name: idx_calendar_subscriptions_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calendar_subscriptions_workspace ON public.calendar_subscriptions USING btree (workspace_id);


--
-- Name: idx_calling_candidates_calling; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_candidates_calling ON public.calling_candidates USING btree (calling_id);


--
-- Name: idx_calling_candidates_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_candidates_candidate ON public.calling_candidates USING btree (candidate_name_id);


--
-- Name: idx_calling_candidates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_candidates_status ON public.calling_candidates USING btree (status);


--
-- Name: idx_calling_comments_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_comments_process ON public.calling_comments USING btree (calling_process_id);


--
-- Name: idx_calling_history_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_history_log_action ON public.calling_history_log USING btree (action);


--
-- Name: idx_calling_history_log_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_history_log_process ON public.calling_history_log USING btree (calling_process_id);


--
-- Name: idx_calling_processes_calling; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_processes_calling ON public.calling_processes USING btree (calling_id);


--
-- Name: idx_calling_processes_candidate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_processes_candidate ON public.calling_processes USING btree (candidate_name_id);


--
-- Name: idx_calling_processes_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_processes_stage ON public.calling_processes USING btree (current_stage);


--
-- Name: idx_calling_processes_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_calling_processes_status ON public.calling_processes USING btree (status);


--
-- Name: idx_callings_is_filled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_callings_is_filled ON public.callings USING btree (is_filled);


--
-- Name: idx_callings_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_callings_organization ON public.callings USING btree (organization);


--
-- Name: idx_callings_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_callings_workspace ON public.callings USING btree (workspace_id);


--
-- Name: idx_candidate_names_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_names_name ON public.candidate_names USING btree (name);


--
-- Name: idx_candidate_names_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_candidate_names_workspace ON public.candidate_names USING btree (workspace_id);


--
-- Name: idx_discussion_notes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_notes_created_by ON public.discussion_notes USING btree (created_by);


--
-- Name: idx_discussion_notes_discussion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_notes_discussion ON public.discussion_notes USING btree (discussion_id);


--
-- Name: idx_discussion_notes_meeting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_notes_meeting ON public.discussion_notes USING btree (meeting_id);


--
-- Name: idx_discussion_templates_discussion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_templates_discussion ON public.discussion_templates USING btree (discussion_id);


--
-- Name: idx_discussion_templates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussion_templates_template ON public.discussion_templates USING btree (template_id);


--
-- Name: idx_discussions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_category ON public.discussions USING btree (category);


--
-- Name: idx_discussions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_created_at ON public.discussions USING btree (created_at DESC);


--
-- Name: idx_discussions_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_due_date ON public.discussions USING btree (due_date);


--
-- Name: idx_discussions_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_organization ON public.discussions USING btree (workspace_id);


--
-- Name: idx_discussions_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_parent ON public.discussions USING btree (parent_discussion_id);


--
-- Name: idx_discussions_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_priority ON public.discussions USING btree (priority);


--
-- Name: idx_discussions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_status ON public.discussions USING btree (status);


--
-- Name: idx_discussions_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_workspace_created ON public.discussions USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: INDEX idx_discussions_workspace_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_discussions_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';


--
-- Name: idx_discussions_workspace_discussion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_workspace_discussion_id ON public.discussions USING btree (workspace_discussion_id);


--
-- Name: idx_discussions_workspace_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discussions_workspace_status_created ON public.discussions USING btree (workspace_id, status, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_dynamic_columns_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_columns_active ON public.dynamic_columns USING btree (table_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_dynamic_columns_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_columns_deleted ON public.dynamic_columns USING btree (table_id, deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_dynamic_columns_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_columns_position ON public.dynamic_columns USING btree (table_id, "position");


--
-- Name: idx_dynamic_columns_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_columns_table_id ON public.dynamic_columns USING btree (table_id);


--
-- Name: idx_dynamic_rows_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_rows_data ON public.dynamic_rows USING gin (data);


--
-- Name: idx_dynamic_rows_form_submission; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_rows_form_submission ON public.dynamic_rows USING btree (form_submission_id) WHERE (form_submission_id IS NOT NULL);


--
-- Name: idx_dynamic_rows_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_rows_position ON public.dynamic_rows USING btree (table_id, "position");


--
-- Name: idx_dynamic_rows_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_rows_table_id ON public.dynamic_rows USING btree (table_id);


--
-- Name: idx_dynamic_rows_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_rows_workspace_id ON public.dynamic_rows USING btree (workspace_id);


--
-- Name: idx_dynamic_tables_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_tables_created_at ON public.dynamic_tables USING btree (created_at DESC);


--
-- Name: idx_dynamic_tables_linked_form; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_tables_linked_form ON public.dynamic_tables USING btree (linked_form_id) WHERE (linked_form_id IS NOT NULL);


--
-- Name: idx_dynamic_tables_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_tables_slug ON public.dynamic_tables USING btree (workspace_id, slug);


--
-- Name: idx_dynamic_tables_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_tables_workspace_id ON public.dynamic_tables USING btree (workspace_id);


--
-- Name: idx_dynamic_views_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_views_default ON public.dynamic_views USING btree (table_id, is_default) WHERE (is_default = true);


--
-- Name: idx_dynamic_views_table_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dynamic_views_table_id ON public.dynamic_views USING btree (table_id);


--
-- Name: idx_event_designs_canva_design_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_designs_canva_design_id ON public.event_designs USING btree (canva_design_id);


--
-- Name: idx_event_designs_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_designs_event_id ON public.event_designs USING btree (event_id);


--
-- Name: idx_event_designs_export_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_designs_export_status ON public.event_designs USING btree (export_status);


--
-- Name: idx_event_designs_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_event_designs_workspace_id ON public.event_designs USING btree (workspace_id);


--
-- Name: idx_events_external_source_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_external_source_id ON public.events USING btree (external_source_id) WHERE (external_source_id IS NOT NULL);


--
-- Name: idx_events_is_all_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_is_all_day ON public.events USING btree (workspace_id, is_all_day) WHERE (is_all_day = true);


--
-- Name: idx_events_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_start_at ON public.events USING btree (start_at);


--
-- Name: idx_events_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_workspace_id ON public.events USING btree (workspace_id);


--
-- Name: idx_events_workspace_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_workspace_start ON public.events USING btree (workspace_id, start_at);


--
-- Name: idx_external_event_links_announcement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_event_links_announcement ON public.external_event_links USING btree (announcement_id);


--
-- Name: idx_external_event_links_external; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_event_links_external ON public.external_event_links USING btree (external_event_id);


--
-- Name: idx_external_events_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_events_start_date ON public.external_calendar_events USING btree (start_date);


--
-- Name: idx_external_events_subscription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_events_subscription ON public.external_calendar_events USING btree (subscription_id);


--
-- Name: idx_form_submissions_form_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_submissions_form_id ON public.form_submissions USING btree (form_id);


--
-- Name: idx_form_submissions_submitted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_submissions_submitted_at ON public.form_submissions USING btree (submitted_at DESC);


--
-- Name: idx_form_view_analytics_form_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_view_analytics_form_id ON public.form_view_analytics USING btree (form_id);


--
-- Name: idx_form_view_analytics_view_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_view_analytics_view_date ON public.form_view_analytics USING btree (view_date DESC);


--
-- Name: idx_forms_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_created_at ON public.forms USING btree (created_at DESC);


--
-- Name: idx_forms_is_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_is_published ON public.forms USING btree (is_published);


--
-- Name: idx_forms_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_slug ON public.forms USING btree (slug);


--
-- Name: idx_forms_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_forms_workspace_id ON public.forms USING btree (workspace_id);


--
-- Name: idx_hidden_categories_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hidden_categories_workspace ON public.hidden_template_categories USING btree (workspace_id);


--
-- Name: idx_hymns_book_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_hymns_book_number ON public.hymns USING btree (book_id, hymn_number);


--
-- Name: idx_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_email ON public.workspace_invitations USING btree (email);


--
-- Name: idx_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_status ON public.workspace_invitations USING btree (status);


--
-- Name: idx_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_token ON public.workspace_invitations USING btree (token);


--
-- Name: idx_invitations_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invitations_workspace ON public.workspace_invitations USING btree (workspace_id);


--
-- Name: idx_invite_attempts_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_attempts_ip ON public.invite_validation_attempts USING btree (ip_address);


--
-- Name: idx_invite_attempts_ip_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_attempts_ip_time ON public.invite_validation_attempts USING btree (ip_address, attempted_at);


--
-- Name: idx_invite_attempts_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_invite_attempts_time ON public.invite_validation_attempts USING btree (attempted_at);


--
-- Name: idx_meeting_share_invitations_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_invitations_email ON public.meeting_share_invitations USING btree (email);


--
-- Name: idx_meeting_share_invitations_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_invitations_meeting_id ON public.meeting_share_invitations USING btree (meeting_id);


--
-- Name: idx_meeting_share_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_invitations_status ON public.meeting_share_invitations USING btree (status);


--
-- Name: idx_meeting_share_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_invitations_token ON public.meeting_share_invitations USING btree (token);


--
-- Name: idx_meeting_share_views_fingerprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_views_fingerprint ON public.meeting_share_views USING btree (visitor_fingerprint);


--
-- Name: idx_meeting_share_views_first_viewed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_views_first_viewed ON public.meeting_share_views USING btree (first_viewed_at);


--
-- Name: idx_meeting_share_views_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_share_views_meeting_id ON public.meeting_share_views USING btree (meeting_id);


--
-- Name: idx_meetings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_created_at ON public.meetings USING btree (created_at DESC);


--
-- Name: idx_meetings_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_date ON public.meetings USING btree (scheduled_date);


--
-- Name: idx_meetings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_status ON public.meetings USING btree (status);


--
-- Name: idx_meetings_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_workspace ON public.meetings USING btree (workspace_id);


--
-- Name: idx_meetings_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_workspace_created ON public.meetings USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_meetings_workspace_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meetings_workspace_meeting_id ON public.meetings USING btree (workspace_meeting_id);


--
-- Name: idx_note_associations_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_associations_entity ON public.note_associations USING btree (entity_type, entity_id);


--
-- Name: idx_note_associations_note_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_associations_note_id ON public.note_associations USING btree (note_id);


--
-- Name: idx_notebooks_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notebooks_created_by ON public.notebooks USING btree (created_by);


--
-- Name: idx_notebooks_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notebooks_workspace ON public.notebooks USING btree (workspace_id);


--
-- Name: idx_notes_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_created_by ON public.notes USING btree (created_by);


--
-- Name: idx_notes_is_personal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_is_personal ON public.notes USING btree (is_personal);


--
-- Name: idx_notes_notebook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_notebook ON public.notes USING btree (notebook_id);


--
-- Name: idx_notes_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notes_workspace ON public.notes USING btree (workspace_id);


--
-- Name: idx_participants_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_name ON public.participants USING btree (workspace_id, name);


--
-- Name: idx_participants_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_workspace ON public.participants USING btree (workspace_id);


--
-- Name: idx_platform_invitations_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_platform_invitations_code ON public.platform_invitations USING btree (code);


--
-- Name: idx_platform_invitations_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_invitations_created_by ON public.platform_invitations USING btree (created_by);


--
-- Name: idx_platform_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_invitations_status ON public.platform_invitations USING btree (status);


--
-- Name: idx_procedural_item_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_active ON public.procedural_item_types USING btree (is_deprecated) WHERE (is_deprecated = false);


--
-- Name: idx_procedural_item_types_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_category ON public.procedural_item_types USING btree (category);


--
-- Name: idx_procedural_item_types_is_core; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_is_core ON public.procedural_item_types USING btree (is_core);


--
-- Name: idx_procedural_item_types_is_custom_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_is_custom_workspace ON public.procedural_item_types USING btree (is_custom, workspace_id);


--
-- Name: idx_procedural_item_types_requires_participant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_requires_participant ON public.procedural_item_types USING btree (requires_participant);


--
-- Name: idx_procedural_item_types_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_item_types_workspace ON public.procedural_item_types USING btree (workspace_id);


--
-- Name: idx_procedural_items_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_procedural_items_workspace ON public.procedural_item_types USING btree (workspace_id) WHERE (is_custom = true);


--
-- Name: idx_profiles_feature_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_feature_tier ON public.profiles USING btree (feature_tier);


--
-- Name: idx_profiles_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_is_deleted ON public.profiles USING btree (is_deleted) WHERE (is_deleted = false);


--
-- Name: idx_profiles_platform_invitation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_platform_invitation ON public.profiles USING btree (platform_invitation_id);


--
-- Name: idx_profiles_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_workspace ON public.profiles USING btree (workspace_id);


--
-- Name: idx_profiles_workspace_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_workspace_role ON public.profiles USING btree (workspace_id, role) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_speaker_templates_speaker; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speaker_templates_speaker ON public.speaker_templates USING btree (speaker_id);


--
-- Name: idx_speaker_templates_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speaker_templates_template ON public.speaker_templates USING btree (template_id);


--
-- Name: idx_speakers_confirmed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_confirmed ON public.speakers USING btree (is_confirmed);


--
-- Name: idx_speakers_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_created_at ON public.speakers USING btree (created_at DESC);


--
-- Name: idx_speakers_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_name ON public.speakers USING btree (name);


--
-- Name: idx_speakers_organization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_organization ON public.speakers USING btree (workspace_id);


--
-- Name: idx_speakers_workspace_speaker_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_speakers_workspace_speaker_id ON public.speakers USING btree (workspace_speaker_id);


--
-- Name: idx_task_comments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_comments_task ON public.task_comments USING btree (task_id);


--
-- Name: idx_task_label_assignments_label; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_label_assignments_label ON public.task_label_assignments USING btree (label_id);


--
-- Name: idx_task_label_assignments_task; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_label_assignments_task ON public.task_label_assignments USING btree (task_id);


--
-- Name: idx_task_labels_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_labels_workspace ON public.task_labels USING btree (workspace_id);


--
-- Name: idx_tasks_access_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_access_token ON public.tasks USING btree (access_token);


--
-- Name: idx_tasks_assigned_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_created ON public.tasks USING btree (assigned_to, created_at DESC) WHERE (assigned_to IS NOT NULL);


--
-- Name: idx_tasks_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_calling_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_calling_process ON public.tasks USING btree (calling_process_id);


--
-- Name: idx_tasks_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_completed_at ON public.tasks USING btree (completed_at);


--
-- Name: idx_tasks_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_created_at ON public.tasks USING btree (created_at DESC);


--
-- Name: idx_tasks_discussion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_discussion ON public.tasks USING btree (discussion_id);


--
-- Name: idx_tasks_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);


--
-- Name: idx_tasks_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_priority ON public.tasks USING btree (priority);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_tasks_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_workspace ON public.tasks USING btree (workspace_id);


--
-- Name: idx_tasks_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_workspace_created ON public.tasks USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: INDEX idx_tasks_workspace_created; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_tasks_workspace_created IS 'Optimizes list queries filtering by workspace and sorting by created_at';


--
-- Name: idx_tasks_workspace_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_workspace_status_created ON public.tasks USING btree (workspace_id, status, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_tasks_workspace_task_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tasks_workspace_task_id ON public.tasks USING btree (workspace_task_id);


--
-- Name: idx_template_announcement_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_template_announcement_singleton ON public.template_items USING btree (template_id) WHERE (item_type = 'announcement'::public.agenda_item_type);


--
-- Name: idx_template_business_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_template_business_singleton ON public.template_items USING btree (template_id) WHERE (item_type = 'business'::public.agenda_item_type);


--
-- Name: idx_template_discussion_singleton; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_template_discussion_singleton ON public.template_items USING btree (template_id) WHERE (item_type = 'discussion'::public.agenda_item_type);


--
-- Name: idx_template_folders_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_folders_order ON public.template_folders USING btree (workspace_id, order_index);


--
-- Name: idx_template_folders_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_folders_workspace ON public.template_folders USING btree (workspace_id);


--
-- Name: idx_template_items_template; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_items_template ON public.template_items USING btree (template_id);


--
-- Name: idx_template_items_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_items_type ON public.template_items USING btree (item_type);


--
-- Name: idx_templates_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_created_at ON public.templates USING btree (created_at DESC);


--
-- Name: idx_templates_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_folder ON public.templates USING btree (folder_id);


--
-- Name: idx_templates_shared; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_shared ON public.templates USING btree (is_shared);


--
-- Name: idx_templates_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_slug ON public.templates USING btree (slug);


--
-- Name: idx_templates_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_tags ON public.templates USING gin (tags);


--
-- Name: idx_templates_workspace; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_workspace ON public.templates USING btree (workspace_id);


--
-- Name: idx_templates_workspace_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_templates_workspace_created ON public.templates USING btree (workspace_id, created_at DESC) WHERE (workspace_id IS NOT NULL);


--
-- Name: idx_time_logs_agenda_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_agenda_item ON public.time_logs USING btree (agenda_item_id);


--
-- Name: idx_time_logs_meeting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_time_logs_meeting ON public.time_logs USING btree (meeting_id);


--
-- Name: idx_workspace_apps_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_apps_app_id ON public.workspace_apps USING btree (app_id);


--
-- Name: idx_workspace_apps_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_apps_status ON public.workspace_apps USING btree (status);


--
-- Name: idx_workspace_apps_workspace_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_apps_workspace_id ON public.workspace_apps USING btree (workspace_id);


--
-- Name: idx_workspaces_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspaces_slug ON public.workspaces USING btree (slug);


--
-- Name: calling_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.calling_summary AS
 SELECT c.id,
    c.workspace_id,
    c.title,
    c.organization,
    c.is_filled,
    c.filled_by,
    c.filled_at,
    c.created_by,
    c.created_at,
    c.updated_at,
    cn.name AS filled_by_name,
    count(DISTINCT cc.id) AS candidate_count,
    count(DISTINCT cp.id) FILTER (WHERE (cp.status = 'active'::text)) AS active_process_count
   FROM (((public.callings c
     LEFT JOIN public.candidate_names cn ON ((c.filled_by = cn.id)))
     LEFT JOIN public.calling_candidates cc ON ((c.id = cc.calling_id)))
     LEFT JOIN public.calling_processes cp ON ((c.id = cp.calling_id)))
  GROUP BY c.id, cn.name;


--
-- Name: discussion_summary _RETURN; Type: RULE; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.discussion_summary AS
 SELECT d.id,
    d.workspace_id AS organization_id,
    d.title,
    d.description,
    d.category,
    d.status,
    d.priority,
    d.due_date,
    d.deferred_reason,
    d.created_by,
    d.created_at,
    d.updated_at,
    count(DISTINCT dn.id) AS note_count,
    count(DISTINCT t.id) AS task_count,
    count(DISTINCT ai.meeting_id) AS meeting_count
   FROM (((public.discussions d
     LEFT JOIN public.discussion_notes dn ON ((d.id = dn.discussion_id)))
     LEFT JOIN public.tasks t ON ((d.id = t.discussion_id)))
     LEFT JOIN public.agenda_items ai ON ((d.id = ai.discussion_id)))
  GROUP BY d.id;


--
-- Name: announcements auto_expire_announcement_on_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER auto_expire_announcement_on_update BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.auto_expire_announcements();


--
-- Name: calling_processes calling_process_stage_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calling_process_stage_change_trigger AFTER UPDATE ON public.calling_processes FOR EACH ROW EXECUTE FUNCTION public.log_calling_stage_change();


--
-- Name: calling_processes calling_process_started_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calling_process_started_trigger AFTER INSERT ON public.calling_processes FOR EACH ROW EXECUTE FUNCTION public.log_calling_process_started();


--
-- Name: dynamic_views ensure_single_default_view_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER ensure_single_default_view_trigger BEFORE INSERT OR UPDATE ON public.dynamic_views FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION public.ensure_single_default_view();


--
-- Name: dynamic_tables generate_dynamic_table_slug_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_dynamic_table_slug_trigger BEFORE INSERT ON public.dynamic_tables FOR EACH ROW EXECUTE FUNCTION public.generate_dynamic_table_slug();


--
-- Name: forms generate_form_slug_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER generate_form_slug_trigger BEFORE INSERT ON public.forms FOR EACH ROW EXECUTE FUNCTION public.generate_form_slug();


--
-- Name: business_items set_business_action_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_business_action_date BEFORE UPDATE ON public.business_items FOR EACH ROW EXECUTE FUNCTION public.set_business_item_action_date();


--
-- Name: dynamic_columns set_column_position_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_column_position_trigger BEFORE INSERT ON public.dynamic_columns FOR EACH ROW EXECUTE FUNCTION public.set_column_position();


--
-- Name: dynamic_rows set_row_position_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_row_position_trigger BEFORE INSERT ON public.dynamic_rows FOR EACH ROW EXECUTE FUNCTION public.set_row_position();


--
-- Name: templates template_slug_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER template_slug_trigger BEFORE INSERT ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_template_slug();


--
-- Name: app_tokens trigger_app_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_app_tokens_updated_at BEFORE UPDATE ON public.app_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_designs trigger_event_designs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_event_designs_updated_at BEFORE UPDATE ON public.event_designs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events trigger_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_events_updated_at BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: announcements trigger_generate_workspace_announcement_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_announcement_id BEFORE INSERT ON public.announcements FOR EACH ROW WHEN ((new.workspace_announcement_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_announcement_id();


--
-- Name: business_items trigger_generate_workspace_business_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_business_id BEFORE INSERT ON public.business_items FOR EACH ROW WHEN ((new.workspace_business_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_business_id();


--
-- Name: discussions trigger_generate_workspace_discussion_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_discussion_id BEFORE INSERT ON public.discussions FOR EACH ROW WHEN ((new.workspace_discussion_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_discussion_id();


--
-- Name: events trigger_generate_workspace_event_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_event_id BEFORE INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION public.generate_workspace_event_id();


--
-- Name: meetings trigger_generate_workspace_meeting_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_meeting_id BEFORE INSERT ON public.meetings FOR EACH ROW WHEN ((new.workspace_meeting_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_meeting_id();


--
-- Name: speakers trigger_generate_workspace_speaker_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_speaker_id BEFORE INSERT ON public.speakers FOR EACH ROW WHEN ((new.workspace_speaker_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_speaker_id();


--
-- Name: tasks trigger_generate_workspace_task_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_workspace_task_id BEFORE INSERT ON public.tasks FOR EACH ROW WHEN ((new.workspace_task_id IS NULL)) EXECUTE FUNCTION public.generate_workspace_task_id();


--
-- Name: workspace_apps trigger_workspace_apps_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_workspace_apps_updated_at BEFORE UPDATE ON public.workspace_apps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agenda_items update_agenda_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_agenda_items_updated_at BEFORE UPDATE ON public.agenda_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: announcements update_announcements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: business_items update_business_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_business_items_updated_at BEFORE UPDATE ON public.business_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calendar_subscriptions update_calendar_subscriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calendar_subscriptions_updated_at BEFORE UPDATE ON public.calendar_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calling_candidates update_calling_candidates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calling_candidates_updated_at BEFORE UPDATE ON public.calling_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calling_comments update_calling_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calling_comments_updated_at BEFORE UPDATE ON public.calling_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: calling_processes update_calling_processes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_calling_processes_updated_at BEFORE UPDATE ON public.calling_processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: callings update_callings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_callings_updated_at BEFORE UPDATE ON public.callings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: candidate_names update_candidate_names_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_candidate_names_updated_at BEFORE UPDATE ON public.candidate_names FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussion_notes update_discussion_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussion_notes_updated_at BEFORE UPDATE ON public.discussion_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discussions update_discussions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_columns update_dynamic_columns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_columns_updated_at BEFORE UPDATE ON public.dynamic_columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_rows update_dynamic_rows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_rows_updated_at BEFORE UPDATE ON public.dynamic_rows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_tables update_dynamic_tables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_tables_updated_at BEFORE UPDATE ON public.dynamic_tables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dynamic_views update_dynamic_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dynamic_views_updated_at BEFORE UPDATE ON public.dynamic_views FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: external_calendar_events update_external_calendar_events_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_external_calendar_events_updated_at BEFORE UPDATE ON public.external_calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: forms update_forms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: meeting_share_invitations update_meeting_share_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meeting_share_invitations_updated_at BEFORE UPDATE ON public.meeting_share_invitations FOR EACH ROW EXECUTE FUNCTION public.update_share_updated_at();


--
-- Name: meeting_share_settings update_meeting_share_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meeting_share_settings_updated_at BEFORE UPDATE ON public.meeting_share_settings FOR EACH ROW EXECUTE FUNCTION public.update_share_updated_at();


--
-- Name: meetings update_meetings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notebooks update_notebooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON public.notebooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: notes update_notes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces update_organizations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: participants update_participants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_participants_updated_at BEFORE UPDATE ON public.participants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_invitations update_platform_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_invitations_updated_at BEFORE UPDATE ON public.platform_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: speakers update_speakers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_speakers_updated_at BEFORE UPDATE ON public.speakers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: task_labels update_task_labels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_task_labels_updated_at BEFORE UPDATE ON public.task_labels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tasks update_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: template_folders update_template_folders_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_template_folders_updated_at BEFORE UPDATE ON public.template_folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: templates update_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_invitations update_workspace_invitations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspace_invitations_updated_at BEFORE UPDATE ON public.workspace_invitations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspace_task_counters update_workspace_task_counters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_workspace_task_counters_updated_at BEFORE UPDATE ON public.workspace_task_counters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: workspaces workspace_slug_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER workspace_slug_trigger BEFORE INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_workspace_slug();


--
-- Name: agenda_items agenda_items_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE SET NULL;


--
-- Name: agenda_items agenda_items_business_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_business_item_id_fkey FOREIGN KEY (business_item_id) REFERENCES public.business_items(id) ON DELETE SET NULL;


--
-- Name: agenda_items agenda_items_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE SET NULL;


--
-- Name: agenda_items agenda_items_hymn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_hymn_id_fkey FOREIGN KEY (hymn_id) REFERENCES public.hymns(id) ON DELETE SET NULL;


--
-- Name: agenda_items agenda_items_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: agenda_items agenda_items_participant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES public.participants(id) ON DELETE SET NULL;


--
-- Name: agenda_items agenda_items_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_items
    ADD CONSTRAINT agenda_items_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE SET NULL;


--
-- Name: announcement_templates announcement_templates_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_templates
    ADD CONSTRAINT announcement_templates_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: announcement_templates announcement_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcement_templates
    ADD CONSTRAINT announcement_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: announcements announcements_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;


--
-- Name: announcements announcements_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: app_tokens app_tokens_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_tokens
    ADD CONSTRAINT app_tokens_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;


--
-- Name: app_tokens app_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_tokens
    ADD CONSTRAINT app_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: app_tokens app_tokens_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_tokens
    ADD CONSTRAINT app_tokens_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: business_items business_items_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_items
    ADD CONSTRAINT business_items_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: business_items business_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_items
    ADD CONSTRAINT business_items_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: business_templates business_templates_business_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_business_item_id_fkey FOREIGN KEY (business_item_id) REFERENCES public.business_items(id) ON DELETE CASCADE;


--
-- Name: business_templates business_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.business_templates
    ADD CONSTRAINT business_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: calendar_subscriptions calendar_subscriptions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_subscriptions
    ADD CONSTRAINT calendar_subscriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: calendar_subscriptions calendar_subscriptions_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendar_subscriptions
    ADD CONSTRAINT calendar_subscriptions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: calling_candidates calling_candidates_calling_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_candidates
    ADD CONSTRAINT calling_candidates_calling_id_fkey FOREIGN KEY (calling_id) REFERENCES public.callings(id) ON DELETE CASCADE;


--
-- Name: calling_candidates calling_candidates_candidate_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_candidates
    ADD CONSTRAINT calling_candidates_candidate_name_id_fkey FOREIGN KEY (candidate_name_id) REFERENCES public.candidate_names(id) ON DELETE CASCADE;


--
-- Name: calling_candidates calling_candidates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_candidates
    ADD CONSTRAINT calling_candidates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: calling_comments calling_comments_calling_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_comments
    ADD CONSTRAINT calling_comments_calling_process_id_fkey FOREIGN KEY (calling_process_id) REFERENCES public.calling_processes(id) ON DELETE CASCADE;


--
-- Name: calling_comments calling_comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_comments
    ADD CONSTRAINT calling_comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: calling_history_log calling_history_log_calling_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_history_log
    ADD CONSTRAINT calling_history_log_calling_process_id_fkey FOREIGN KEY (calling_process_id) REFERENCES public.calling_processes(id) ON DELETE CASCADE;


--
-- Name: calling_history_log calling_history_log_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_history_log
    ADD CONSTRAINT calling_history_log_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: calling_processes calling_processes_calling_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_processes
    ADD CONSTRAINT calling_processes_calling_candidate_id_fkey FOREIGN KEY (calling_candidate_id) REFERENCES public.calling_candidates(id) ON DELETE SET NULL;


--
-- Name: calling_processes calling_processes_calling_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_processes
    ADD CONSTRAINT calling_processes_calling_id_fkey FOREIGN KEY (calling_id) REFERENCES public.callings(id) ON DELETE CASCADE;


--
-- Name: calling_processes calling_processes_candidate_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_processes
    ADD CONSTRAINT calling_processes_candidate_name_id_fkey FOREIGN KEY (candidate_name_id) REFERENCES public.candidate_names(id) ON DELETE CASCADE;


--
-- Name: calling_processes calling_processes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calling_processes
    ADD CONSTRAINT calling_processes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: callings callings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callings
    ADD CONSTRAINT callings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: callings callings_filled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callings
    ADD CONSTRAINT callings_filled_by_fkey FOREIGN KEY (filled_by) REFERENCES public.candidate_names(id) ON DELETE SET NULL;


--
-- Name: callings callings_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.callings
    ADD CONSTRAINT callings_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: candidate_names candidate_names_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_names
    ADD CONSTRAINT candidate_names_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: candidate_names candidate_names_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.candidate_names
    ADD CONSTRAINT candidate_names_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: discussion_notes discussion_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_notes
    ADD CONSTRAINT discussion_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: discussion_notes discussion_notes_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_notes
    ADD CONSTRAINT discussion_notes_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_notes discussion_notes_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_notes
    ADD CONSTRAINT discussion_notes_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;


--
-- Name: discussion_templates discussion_templates_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_templates
    ADD CONSTRAINT discussion_templates_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE CASCADE;


--
-- Name: discussion_templates discussion_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussion_templates
    ADD CONSTRAINT discussion_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: discussions discussions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_parent_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_parent_discussion_id_fkey FOREIGN KEY (parent_discussion_id) REFERENCES public.discussions(id) ON DELETE SET NULL;


--
-- Name: dynamic_columns dynamic_columns_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_columns
    ADD CONSTRAINT dynamic_columns_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.dynamic_tables(id) ON DELETE CASCADE;


--
-- Name: dynamic_rows dynamic_rows_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_rows
    ADD CONSTRAINT dynamic_rows_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: dynamic_rows dynamic_rows_form_submission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_rows
    ADD CONSTRAINT dynamic_rows_form_submission_id_fkey FOREIGN KEY (form_submission_id) REFERENCES public.form_submissions(id) ON DELETE SET NULL;


--
-- Name: dynamic_rows dynamic_rows_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_rows
    ADD CONSTRAINT dynamic_rows_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.dynamic_tables(id) ON DELETE CASCADE;


--
-- Name: dynamic_rows dynamic_rows_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_rows
    ADD CONSTRAINT dynamic_rows_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: dynamic_tables dynamic_tables_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_tables
    ADD CONSTRAINT dynamic_tables_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: dynamic_tables dynamic_tables_linked_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_tables
    ADD CONSTRAINT dynamic_tables_linked_form_id_fkey FOREIGN KEY (linked_form_id) REFERENCES public.forms(id) ON DELETE SET NULL;


--
-- Name: dynamic_tables dynamic_tables_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_tables
    ADD CONSTRAINT dynamic_tables_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: dynamic_views dynamic_views_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_views
    ADD CONSTRAINT dynamic_views_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: dynamic_views dynamic_views_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dynamic_views
    ADD CONSTRAINT dynamic_views_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.dynamic_tables(id) ON DELETE CASCADE;


--
-- Name: event_designs event_designs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_designs
    ADD CONSTRAINT event_designs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: event_designs event_designs_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_designs
    ADD CONSTRAINT event_designs_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_designs event_designs_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_designs
    ADD CONSTRAINT event_designs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: events events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: events events_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: external_calendar_events external_calendar_events_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_calendar_events
    ADD CONSTRAINT external_calendar_events_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.calendar_subscriptions(id) ON DELETE CASCADE;


--
-- Name: external_event_links external_event_links_announcement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_links
    ADD CONSTRAINT external_event_links_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.announcements(id) ON DELETE CASCADE;


--
-- Name: external_event_links external_event_links_external_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_event_links
    ADD CONSTRAINT external_event_links_external_event_id_fkey FOREIGN KEY (external_event_id) REFERENCES public.external_calendar_events(id) ON DELETE CASCADE;


--
-- Name: form_submissions form_submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: form_view_analytics form_view_analytics_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_view_analytics
    ADD CONSTRAINT form_view_analytics_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: forms forms_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: forms forms_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: hidden_template_categories hidden_template_categories_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hidden_template_categories
    ADD CONSTRAINT hidden_template_categories_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: meeting_share_invitations meeting_share_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_invitations
    ADD CONSTRAINT meeting_share_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: meeting_share_invitations meeting_share_invitations_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_invitations
    ADD CONSTRAINT meeting_share_invitations_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_share_settings meeting_share_settings_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_settings
    ADD CONSTRAINT meeting_share_settings_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: meeting_share_views meeting_share_views_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_share_views
    ADD CONSTRAINT meeting_share_views_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: meetings meetings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: meetings meetings_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE SET NULL;


--
-- Name: note_associations note_associations_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_associations
    ADD CONSTRAINT note_associations_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.notes(id) ON DELETE CASCADE;


--
-- Name: notebooks notebooks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notebooks
    ADD CONSTRAINT notebooks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notebooks notebooks_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notebooks
    ADD CONSTRAINT notebooks_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notes notes_notebook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_notebook_id_fkey FOREIGN KEY (notebook_id) REFERENCES public.notebooks(id) ON DELETE CASCADE;


--
-- Name: notes notes_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: participants participants_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: participants participants_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.participants
    ADD CONSTRAINT participants_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: platform_invitations platform_invitations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_invitations
    ADD CONSTRAINT platform_invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: procedural_item_types procedural_item_types_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedural_item_types
    ADD CONSTRAINT procedural_item_types_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: profiles profiles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_platform_invitation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_platform_invitation_id_fkey FOREIGN KEY (platform_invitation_id) REFERENCES public.platform_invitations(id) ON DELETE SET NULL;


--
-- Name: speaker_templates speaker_templates_speaker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_templates
    ADD CONSTRAINT speaker_templates_speaker_id_fkey FOREIGN KEY (speaker_id) REFERENCES public.speakers(id) ON DELETE CASCADE;


--
-- Name: speaker_templates speaker_templates_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speaker_templates
    ADD CONSTRAINT speaker_templates_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: speakers speakers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: speakers speakers_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.speakers
    ADD CONSTRAINT speakers_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: task_activities task_activities_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_activities
    ADD CONSTRAINT task_activities_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_activities task_activities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_activities
    ADD CONSTRAINT task_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: task_comments task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_comments task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_comments
    ADD CONSTRAINT task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: task_label_assignments task_label_assignments_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT task_label_assignments_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.task_labels(id) ON DELETE CASCADE;


--
-- Name: task_label_assignments task_label_assignments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_label_assignments
    ADD CONSTRAINT task_label_assignments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE;


--
-- Name: task_labels task_labels_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task_labels
    ADD CONSTRAINT task_labels_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: tasks tasks_agenda_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_agenda_item_id_fkey FOREIGN KEY (agenda_item_id) REFERENCES public.agenda_items(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_business_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_business_item_id_fkey FOREIGN KEY (business_item_id) REFERENCES public.business_items(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_calling_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_calling_process_id_fkey FOREIGN KEY (calling_process_id) REFERENCES public.calling_processes(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_discussion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_discussion_id_fkey FOREIGN KEY (discussion_id) REFERENCES public.discussions(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE SET NULL;


--
-- Name: tasks tasks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: template_folders template_folders_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_folders
    ADD CONSTRAINT template_folders_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: template_items template_items_hymn_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_hymn_id_fkey FOREIGN KEY (hymn_id) REFERENCES public.hymns(id) ON DELETE SET NULL;


--
-- Name: template_items template_items_procedural_item_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_procedural_item_type_id_fkey FOREIGN KEY (procedural_item_type_id) REFERENCES public.procedural_item_types(id) ON DELETE SET NULL;


--
-- Name: template_items template_items_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template_items
    ADD CONSTRAINT template_items_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id) ON DELETE CASCADE;


--
-- Name: templates templates_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: templates templates_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.template_folders(id) ON DELETE SET NULL;


--
-- Name: templates templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_organization_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_agenda_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_agenda_item_id_fkey FOREIGN KEY (agenda_item_id) REFERENCES public.agenda_items(id) ON DELETE CASCADE;


--
-- Name: time_logs time_logs_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.time_logs
    ADD CONSTRAINT time_logs_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON DELETE CASCADE;


--
-- Name: workspace_announcement_counters workspace_announcement_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_announcement_counters
    ADD CONSTRAINT workspace_announcement_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_apps workspace_apps_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_apps
    ADD CONSTRAINT workspace_apps_app_id_fkey FOREIGN KEY (app_id) REFERENCES public.apps(id) ON DELETE CASCADE;


--
-- Name: workspace_apps workspace_apps_connected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_apps
    ADD CONSTRAINT workspace_apps_connected_by_fkey FOREIGN KEY (connected_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: workspace_apps workspace_apps_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_apps
    ADD CONSTRAINT workspace_apps_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_business_counters workspace_business_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_business_counters
    ADD CONSTRAINT workspace_business_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_discussion_counters workspace_discussion_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_discussion_counters
    ADD CONSTRAINT workspace_discussion_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_event_counters workspace_event_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_event_counters
    ADD CONSTRAINT workspace_event_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_invitations workspace_invitations_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: workspace_invitations workspace_invitations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_invitations
    ADD CONSTRAINT workspace_invitations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_meeting_counters workspace_meeting_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_meeting_counters
    ADD CONSTRAINT workspace_meeting_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_speaker_counters workspace_speaker_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_speaker_counters
    ADD CONSTRAINT workspace_speaker_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: workspace_task_counters workspace_task_counters_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_task_counters
    ADD CONSTRAINT workspace_task_counters_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;


--
-- Name: external_event_links Admins and leaders can create external event links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and leaders can create external event links" ON public.external_event_links FOR INSERT WITH CHECK ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])));


--
-- Name: external_event_links Admins and leaders can delete external event links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and leaders can delete external event links" ON public.external_event_links FOR DELETE USING ((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])));


--
-- Name: calendar_subscriptions Admins can create calendar subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create calendar subscriptions" ON public.calendar_subscriptions FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: hidden_template_categories Admins can create hidden categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can create hidden categories" ON public.hidden_template_categories FOR INSERT WITH CHECK (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)));


--
-- Name: calendar_subscriptions Admins can delete calendar subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete calendar subscriptions" ON public.calendar_subscriptions FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: hidden_template_categories Admins can delete hidden categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete hidden categories" ON public.hidden_template_categories FOR DELETE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)));


--
-- Name: profiles Admins can delete profiles from their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete profiles from their workspace" ON public.profiles FOR DELETE USING (((workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = 'admin'::text) AND (id <> auth.uid())));


--
-- Name: workspace_invitations Admins can manage invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage invitations" ON public.workspace_invitations USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)));


--
-- Name: workspace_apps Admins can manage workspace apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage workspace apps" ON public.workspace_apps USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: calendar_subscriptions Admins can update calendar subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update calendar subscriptions" ON public.calendar_subscriptions FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: profiles Admins can update profiles in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update profiles in their workspace" ON public.profiles FOR UPDATE USING (((workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = 'admin'::text)));


--
-- Name: workspaces Admins can update their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update their workspace" ON public.workspaces FOR UPDATE USING (((id = public.get_auth_workspace_id()) AND (public.get_auth_role() = 'admin'::text)));


--
-- Name: invite_validation_attempts Allow insert for rate limiting; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow insert for rate limiting" ON public.invite_validation_attempts FOR INSERT WITH CHECK (true);


--
-- Name: meeting_share_views Anyone can track views on public meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can track views on public meetings" ON public.meeting_share_views FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_views.meeting_id) AND (m.is_publicly_shared = true)))));


--
-- Name: meeting_share_views Anyone can update view tracking on public meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can update view tracking on public meetings" ON public.meeting_share_views FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_views.meeting_id) AND (m.is_publicly_shared = true)))));


--
-- Name: platform_invitations Anyone can validate invitation codes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can validate invitation codes" ON public.platform_invitations FOR SELECT USING (true);


--
-- Name: apps Anyone can view active apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active apps" ON public.apps FOR SELECT USING ((is_active = true));


--
-- Name: meeting_share_invitations Anyone can view invitation by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invitation by token" ON public.meeting_share_invitations FOR SELECT USING (true);


--
-- Name: workspace_invitations Anyone can view invitation by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view invitation by token" ON public.workspace_invitations FOR SELECT USING (true);


--
-- Name: workspaces Authenticated users can create organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create organizations" ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: workspaces Authenticated users can create workspaces; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create workspaces" ON public.workspaces FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: hymns Authenticated users can view hymns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view hymns" ON public.hymns FOR SELECT TO authenticated USING (true);


--
-- Name: calling_comments Creators and admins can delete calling comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and admins can delete calling comments" ON public.calling_comments FOR DELETE USING ((((created_by = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'admin'::text)) AND (EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_comments.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: discussion_notes Creators and leaders can delete discussion notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and leaders can delete discussion notes" ON public.discussion_notes FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.discussions
  WHERE ((discussions.id = discussion_notes.discussion_id) AND (discussions.workspace_id = ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))) AND ((created_by = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text))));


--
-- Name: discussion_notes Creators and leaders can update discussion notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators and leaders can update discussion notes" ON public.discussion_notes FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.discussions
  WHERE ((discussions.id = discussion_notes.discussion_id) AND (discussions.workspace_id = ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))) AND ((created_by = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text))));


--
-- Name: calling_comments Creators can update their own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Creators can update their own comments" ON public.calling_comments FOR UPDATE USING (((created_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_comments.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: announcements Leaders and admins can create announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create announcements" ON public.announcements FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: business_items Leaders and admins can create business items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create business items" ON public.business_items FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: calling_candidates Leaders and admins can create calling candidates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create calling candidates" ON public.calling_candidates FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_candidates.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: calling_comments Leaders and admins can create calling comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create calling comments" ON public.calling_comments FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_comments.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: calling_history_log Leaders and admins can create calling history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create calling history" ON public.calling_history_log FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_history_log.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: calling_processes Leaders and admins can create calling processes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create calling processes" ON public.calling_processes FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_processes.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: callings Leaders and admins can create callings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create callings" ON public.callings FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: candidate_names Leaders and admins can create candidate names; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create candidate names" ON public.candidate_names FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: discussions Leaders and admins can create discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create discussions" ON public.discussions FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: event_designs Leaders and admins can create event designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create event designs" ON public.event_designs FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: events Leaders and admins can create events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create events" ON public.events FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: template_folders Leaders and admins can create folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create folders" ON public.template_folders FOR INSERT WITH CHECK (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text]))));


--
-- Name: meetings Leaders and admins can create meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create meetings" ON public.meetings FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: speakers Leaders and admins can create speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create speakers" ON public.speakers FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: tasks Leaders and admins can create tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create tasks" ON public.tasks FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: templates Leaders and admins can create templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can create templates" ON public.templates FOR INSERT WITH CHECK (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: agenda_items Leaders and admins can delete agenda items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete agenda items" ON public.agenda_items FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.meetings
  WHERE ((meetings.id = agenda_items.meeting_id) AND (meetings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: announcements Leaders and admins can delete announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete announcements" ON public.announcements FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: business_items Leaders and admins can delete business items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete business items" ON public.business_items FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: calling_candidates Leaders and admins can delete calling candidates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete calling candidates" ON public.calling_candidates FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_candidates.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: calling_processes Leaders and admins can delete calling processes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete calling processes" ON public.calling_processes FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_processes.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: callings Leaders and admins can delete callings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete callings" ON public.callings FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: candidate_names Leaders and admins can delete candidate names; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete candidate names" ON public.candidate_names FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: discussions Leaders and admins can delete discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete discussions" ON public.discussions FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: event_designs Leaders and admins can delete event designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete event designs" ON public.event_designs FOR DELETE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: events Leaders and admins can delete events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete events" ON public.events FOR DELETE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: template_folders Leaders and admins can delete folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete folders" ON public.template_folders FOR DELETE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text]))));


--
-- Name: meetings Leaders and admins can delete meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete meetings" ON public.meetings FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: speakers Leaders and admins can delete speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete speakers" ON public.speakers FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: tasks Leaders and admins can delete tasks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete tasks" ON public.tasks FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: templates Leaders and admins can delete their workspace templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can delete their workspace templates" ON public.templates FOR DELETE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: agenda_items Leaders and admins can insert agenda items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can insert agenda items" ON public.agenda_items FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.meetings
  WHERE ((meetings.id = agenda_items.meeting_id) AND (meetings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: agenda_items Leaders and admins can manage agenda items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can manage agenda items" ON public.agenda_items USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = agenda_items.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()))))));


--
-- Name: workspace_event_counters Leaders and admins can manage counters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can manage counters" ON public.workspace_event_counters USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: participants Leaders and admins can manage participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can manage participants" ON public.participants USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: template_items Leaders and admins can manage template items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can manage template items" ON public.template_items USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.templates
  WHERE ((templates.id = template_items.template_id) AND (templates.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))))) WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.templates
  WHERE ((templates.id = template_items.template_id) AND (templates.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: agenda_items Leaders and admins can update agenda items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update agenda items" ON public.agenda_items FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.meetings
  WHERE ((meetings.id = agenda_items.meeting_id) AND (meetings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: tasks Leaders and admins can update all tasks, assigned users can upd; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update all tasks, assigned users can upd" ON public.tasks FOR UPDATE USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id()) AND ((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) OR (assigned_to = auth.uid()))));


--
-- Name: announcements Leaders and admins can update announcements; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update announcements" ON public.announcements FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: business_items Leaders and admins can update business items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update business items" ON public.business_items FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: calling_candidates Leaders and admins can update calling candidates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update calling candidates" ON public.calling_candidates FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_candidates.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: calling_processes Leaders and admins can update calling processes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update calling processes" ON public.calling_processes FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_processes.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: callings Leaders and admins can update callings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update callings" ON public.callings FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: candidate_names Leaders and admins can update candidate names; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update candidate names" ON public.candidate_names FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: discussions Leaders and admins can update discussions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update discussions" ON public.discussions FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: event_designs Leaders and admins can update event designs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update event designs" ON public.event_designs FOR UPDATE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: events Leaders and admins can update events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update events" ON public.events FOR UPDATE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: template_folders Leaders and admins can update folders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update folders" ON public.template_folders FOR UPDATE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text]))));


--
-- Name: meetings Leaders and admins can update meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update meetings" ON public.meetings FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: speakers Leaders and admins can update speakers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update speakers" ON public.speakers FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: templates Leaders and admins can update templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update templates" ON public.templates FOR UPDATE USING (((is_shared = false) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text]))));


--
-- Name: templates Leaders and admins can update their workspace templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders and admins can update their workspace templates" ON public.templates FOR UPDATE USING (((public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])) AND (public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: workspace_apps Leaders can add workspace apps; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can add workspace apps" ON public.workspace_apps FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: procedural_item_types Leaders can create custom procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create custom procedural items" ON public.procedural_item_types FOR INSERT WITH CHECK (((is_custom = true) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text]))));


--
-- Name: discussion_notes Leaders can create discussion notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create discussion notes" ON public.discussion_notes FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.discussions
  WHERE ((discussions.id = discussion_notes.discussion_id) AND (discussions.workspace_id = ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: task_labels Leaders can create labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create labels" ON public.task_labels FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: participants Leaders can create participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create participants" ON public.participants FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: task_label_assignments Leaders can create task label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create task label assignments" ON public.task_label_assignments FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_label_assignments.task_id) AND (tasks.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: procedural_item_types Leaders can create workspace procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can create workspace procedural items" ON public.procedural_item_types FOR INSERT WITH CHECK (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: task_labels Leaders can delete labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can delete labels" ON public.task_labels FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: participants Leaders can delete participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can delete participants" ON public.participants FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: task_label_assignments Leaders can delete task label assignments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can delete task label assignments" ON public.task_label_assignments FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_label_assignments.task_id) AND (tasks.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: procedural_item_types Leaders can delete workspace procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can delete workspace procedural items" ON public.procedural_item_types FOR DELETE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: announcement_templates Leaders can manage announcement templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can manage announcement templates" ON public.announcement_templates USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.announcements a
  WHERE ((a.id = announcement_templates.announcement_id) AND (a.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: business_templates Leaders can manage business templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can manage business templates" ON public.business_templates USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.business_items b
  WHERE ((b.id = business_templates.business_item_id) AND (b.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: discussion_templates Leaders can manage discussion templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can manage discussion templates" ON public.discussion_templates USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.discussions d
  WHERE ((d.id = discussion_templates.discussion_id) AND (d.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: speaker_templates Leaders can manage speaker templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can manage speaker templates" ON public.speaker_templates USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (EXISTS ( SELECT 1
   FROM public.speakers s
  WHERE ((s.id = speaker_templates.speaker_id) AND (s.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: task_labels Leaders can update labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can update labels" ON public.task_labels FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: participants Leaders can update participants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can update participants" ON public.participants FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: procedural_item_types Leaders can update workspace procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can update workspace procedural items" ON public.procedural_item_types FOR UPDATE USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['leader'::text, 'admin'::text])) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: announcements Leaders can view announcements in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can view announcements in their organization" ON public.announcements FOR SELECT USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (workspace_id = ( SELECT profiles.workspace_id AS organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: discussion_notes Leaders can view discussion notes in their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can view discussion notes in their organization" ON public.discussion_notes FOR SELECT USING (((( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = 'leader'::text) AND (EXISTS ( SELECT 1
   FROM public.discussions
  WHERE ((discussions.id = discussion_notes.discussion_id) AND (discussions.workspace_id = ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: workspace_invitations Leaders can view invitations in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Leaders can view invitations in their workspace" ON public.workspace_invitations FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: agenda_items Public can view agenda items of shared meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view agenda items of shared meetings" ON public.agenda_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = agenda_items.meeting_id) AND (m.is_publicly_shared = true) AND (m.public_share_token IS NOT NULL)))));


--
-- Name: meeting_share_settings Public can view share settings for shared meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view share settings for shared meetings" ON public.meeting_share_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_settings.meeting_id) AND (m.is_publicly_shared = true)))));


--
-- Name: meetings Public can view shared meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view shared meetings" ON public.meetings FOR SELECT USING (((is_publicly_shared = true) AND (public_share_token IS NOT NULL)));


--
-- Name: external_calendar_events Service can manage external calendar events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service can manage external calendar events" ON public.external_calendar_events USING (true) WITH CHECK (true);


--
-- Name: platform_invitations Sys admins can manage platform invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sys admins can manage platform invitations" ON public.platform_invitations USING ((( SELECT profiles.is_sys_admin
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = true));


--
-- Name: invite_validation_attempts Sys admins can view validation attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sys admins can view validation attempts" ON public.invite_validation_attempts FOR SELECT USING ((( SELECT profiles.is_sys_admin
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = true));


--
-- Name: notebooks Users can create notebooks in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create notebooks in their workspace" ON public.notebooks FOR INSERT WITH CHECK (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (created_by = auth.uid())));


--
-- Name: notes Users can create notes in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create notes in their workspace" ON public.notes FOR INSERT WITH CHECK (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (created_by = auth.uid())));


--
-- Name: procedural_item_types Users can delete custom procedural_item_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete custom procedural_item_types" ON public.procedural_item_types FOR DELETE TO authenticated USING (((is_custom = true) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: notebooks Users can delete notebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete notebooks" ON public.notebooks FOR DELETE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((created_by = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])))));


--
-- Name: notes Users can delete their notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their notes" ON public.notes FOR DELETE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (((is_personal = false) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text]))) OR (created_by = auth.uid()))));


--
-- Name: task_comments Users can insert comments on tasks they can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert comments on tasks they can view" ON public.task_comments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_comments.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: procedural_item_types Users can insert custom procedural_item_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert custom procedural_item_types" ON public.procedural_item_types FOR INSERT TO authenticated WITH CHECK (((is_custom = true) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK ((id = auth.uid()));


--
-- Name: note_associations Users can manage associations for their editable notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage associations for their editable notes" ON public.note_associations USING ((EXISTS ( SELECT 1
   FROM public.notes
  WHERE ((notes.id = note_associations.note_id) AND ((notes.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))) AND (((notes.is_personal = false) AND (( SELECT profiles.role
           FROM public.profiles
          WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text]))) OR (notes.created_by = auth.uid())))))));


--
-- Name: app_tokens Users can manage their own app tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own app tokens" ON public.app_tokens USING ((user_id = auth.uid()));


--
-- Name: time_logs Users can manage time logs for their workspace meetings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage time logs for their workspace meetings" ON public.time_logs USING ((EXISTS ( SELECT 1
   FROM (public.meetings m
     JOIN public.profiles p ON ((p.workspace_id = m.workspace_id)))
  WHERE ((m.id = time_logs.meeting_id) AND (p.id = auth.uid())))));


--
-- Name: procedural_item_types Users can read procedural_item_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read procedural_item_types" ON public.procedural_item_types FOR SELECT TO authenticated USING (((is_core = true) OR (workspace_id IS NULL) OR (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: procedural_item_types Users can update custom procedural_item_types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update custom procedural_item_types" ON public.procedural_item_types FOR UPDATE TO authenticated USING (((is_custom = true) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: notebooks Users can update notebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update notebooks" ON public.notebooks FOR UPDATE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((created_by = auth.uid()) OR (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text])))));


--
-- Name: notes Users can update their notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their notes" ON public.notes FOR UPDATE USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (((is_personal = false) AND (( SELECT profiles.role
   FROM public.profiles
  WHERE (profiles.id = auth.uid())) = ANY (ARRAY['admin'::text, 'leader'::text]))) OR (created_by = auth.uid()))));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING ((id = auth.uid()));


--
-- Name: notes Users can view accessible notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view accessible notes" ON public.notes FOR SELECT USING (((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND ((is_personal = false) OR ((is_personal = true) AND (created_by = auth.uid())))));


--
-- Name: agenda_items Users can view agenda items in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view agenda items in their workspace" ON public.agenda_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = agenda_items.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id())))));


--
-- Name: announcement_templates Users can view announcement templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view announcement templates" ON public.announcement_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.announcements a
  WHERE ((a.id = announcement_templates.announcement_id) AND (a.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: announcement_templates Users can view announcement templates in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view announcement templates in their workspace" ON public.announcement_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.announcements a
  WHERE ((a.id = announcement_templates.announcement_id) AND (a.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: announcements Users can view announcements in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view announcements in their workspace" ON public.announcements FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: note_associations Users can view associations for accessible notes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view associations for accessible notes" ON public.note_associations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.notes
  WHERE ((notes.id = note_associations.note_id) AND ((notes.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))) AND ((notes.is_personal = false) OR ((notes.is_personal = true) AND (notes.created_by = auth.uid()))))))));


--
-- Name: business_items Users can view business items in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view business items in their workspace" ON public.business_items FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: business_templates Users can view business templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view business templates" ON public.business_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.business_items b
  WHERE ((b.id = business_templates.business_item_id) AND (b.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: business_templates Users can view business templates in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view business templates in their workspace" ON public.business_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.business_items b
  WHERE ((b.id = business_templates.business_item_id) AND (b.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: calling_candidates Users can view calling candidates in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calling candidates in their workspace" ON public.calling_candidates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_candidates.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: calling_comments Users can view calling comments in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calling comments in their workspace" ON public.calling_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_comments.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: calling_history_log Users can view calling history in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calling history in their workspace" ON public.calling_history_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.calling_processes cp
     JOIN public.callings c ON ((cp.calling_id = c.id)))
  WHERE ((cp.id = calling_history_log.calling_process_id) AND (c.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: calling_processes Users can view calling processes in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view calling processes in their workspace" ON public.calling_processes FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.callings
  WHERE ((callings.id = calling_processes.calling_id) AND (callings.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: callings Users can view callings in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view callings in their workspace" ON public.callings FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: candidate_names Users can view candidate names in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view candidate names in their workspace" ON public.candidate_names FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: task_comments Users can view comments on tasks they can view; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on tasks they can view" ON public.task_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_comments.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: workspace_event_counters Users can view counters in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view counters in their workspace" ON public.workspace_event_counters FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: discussion_templates Users can view discussion templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view discussion templates" ON public.discussion_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.discussions d
  WHERE ((d.id = discussion_templates.discussion_id) AND (d.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: discussion_templates Users can view discussion templates in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view discussion templates in their workspace" ON public.discussion_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.discussions d
  WHERE ((d.id = discussion_templates.discussion_id) AND (d.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: discussions Users can view discussions in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view discussions in their workspace" ON public.discussions FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: event_designs Users can view event designs in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view event designs in their workspace" ON public.event_designs FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: events Users can view events in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view events in their workspace" ON public.events FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: template_folders Users can view folders in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view folders in their workspace" ON public.template_folders FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: procedural_item_types Users can view global procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view global procedural items" ON public.procedural_item_types FOR SELECT USING ((workspace_id IS NULL));


--
-- Name: hidden_template_categories Users can view hidden categories in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view hidden categories in their workspace" ON public.hidden_template_categories FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: task_labels Users can view labels in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view labels in their workspace" ON public.task_labels FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: meetings Users can view meetings in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view meetings in their workspace" ON public.meetings FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: workspaces Users can view organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view organizations" ON public.workspaces FOR SELECT USING (((id IN ( SELECT profiles.workspace_id AS organization_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR ((auth.uid() IS NOT NULL) AND (NOT (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))))));


--
-- Name: participants Users can view participants in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view participants in their workspace" ON public.participants FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: procedural_item_types Users can view procedural item types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view procedural item types" ON public.procedural_item_types FOR SELECT USING ((((is_custom = false) AND (workspace_id IS NULL)) OR ((is_custom = true) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))))));


--
-- Name: profiles Users can view profiles in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view profiles in their workspace" ON public.profiles FOR SELECT USING (((workspace_id = public.get_auth_workspace_id()) OR (id = auth.uid())));


--
-- Name: speaker_templates Users can view speaker templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view speaker templates" ON public.speaker_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.speakers s
  WHERE ((s.id = speaker_templates.speaker_id) AND (s.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: speaker_templates Users can view speaker templates in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view speaker templates in their workspace" ON public.speaker_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.speakers s
  WHERE ((s.id = speaker_templates.speaker_id) AND (s.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: speakers Users can view speakers in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view speakers in their workspace" ON public.speakers FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: task_label_assignments Users can view task label assignments in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view task label assignments in their workspace" ON public.task_label_assignments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_label_assignments.task_id) AND (tasks.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: tasks Users can view tasks in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view tasks in their workspace" ON public.tasks FOR SELECT USING (((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id())));


--
-- Name: template_items Users can view template items for accessible templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view template items for accessible templates" ON public.template_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.templates
  WHERE ((templates.id = template_items.template_id) AND ((templates.is_shared = true) OR (templates.workspace_id = ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))))));


--
-- Name: templates Users can view templates in their workspace or shared templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view templates in their workspace or shared templates" ON public.templates FOR SELECT USING (((is_shared = true) OR ((public.get_auth_workspace_id() IS NOT NULL) AND (workspace_id = public.get_auth_workspace_id()))));


--
-- Name: app_tokens Users can view their own app tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own app tokens" ON public.app_tokens FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING ((id = auth.uid()));


--
-- Name: workspaces Users can view their own workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own workspace" ON public.workspaces FOR SELECT USING ((id = public.get_auth_workspace_id()));


--
-- Name: workspace_announcement_counters Users can view their workspace announcement counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace announcement counter" ON public.workspace_announcement_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_business_counters Users can view their workspace business counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace business counter" ON public.workspace_business_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_discussion_counters Users can view their workspace discussion counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace discussion counter" ON public.workspace_discussion_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_meeting_counters Users can view their workspace meeting counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace meeting counter" ON public.workspace_meeting_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_speaker_counters Users can view their workspace speaker counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace speaker counter" ON public.workspace_speaker_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_task_counters Users can view their workspace task counter; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their workspace task counter" ON public.workspace_task_counters FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: workspace_apps Users can view workspace apps in their workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace apps in their workspace" ON public.workspace_apps FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: procedural_item_types Users can view workspace custom procedural items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace custom procedural items" ON public.procedural_item_types FOR SELECT USING (((workspace_id IS NOT NULL) AND (workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- Name: notebooks Users can view workspace notebooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view workspace notebooks" ON public.notebooks FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: task_activities View activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View activities" ON public.task_activities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_activities.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: task_comments View comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View comments" ON public.task_comments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_comments.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: meeting_share_invitations Workspace leaders can create meeting invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can create meeting invitations" ON public.meeting_share_invitations FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_invitations.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: meeting_share_invitations Workspace leaders can delete meeting invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can delete meeting invitations" ON public.meeting_share_invitations FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_invitations.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: meeting_share_settings Workspace leaders can delete share settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can delete share settings" ON public.meeting_share_settings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_settings.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: meeting_share_settings Workspace leaders can insert share settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can insert share settings" ON public.meeting_share_settings FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_settings.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: meeting_share_invitations Workspace leaders can update meeting invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can update meeting invitations" ON public.meeting_share_invitations FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_invitations.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: meeting_share_settings Workspace leaders can update share settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace leaders can update share settings" ON public.meeting_share_settings FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_settings.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id()) AND (public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text]))))));


--
-- Name: calendar_subscriptions Workspace members can view calendar subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view calendar subscriptions" ON public.calendar_subscriptions FOR SELECT USING ((workspace_id = ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: external_calendar_events Workspace members can view external calendar events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view external calendar events" ON public.external_calendar_events FOR SELECT USING ((subscription_id IN ( SELECT calendar_subscriptions.id
   FROM public.calendar_subscriptions
  WHERE (calendar_subscriptions.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: external_event_links Workspace members can view external event links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view external event links" ON public.external_event_links FOR SELECT USING ((external_event_id IN ( SELECT ece.id
   FROM (public.external_calendar_events ece
     JOIN public.calendar_subscriptions cs ON ((ece.subscription_id = cs.id)))
  WHERE (cs.workspace_id = ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: meeting_share_invitations Workspace members can view meeting invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view meeting invitations" ON public.meeting_share_invitations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_invitations.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id())))));


--
-- Name: meeting_share_views Workspace members can view share analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view share analytics" ON public.meeting_share_views FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_views.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id())))));


--
-- Name: meeting_share_settings Workspace members can view share settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Workspace members can view share settings" ON public.meeting_share_settings FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.meetings m
  WHERE ((m.id = meeting_share_settings.meeting_id) AND (public.get_auth_workspace_id() IS NOT NULL) AND (m.workspace_id = public.get_auth_workspace_id())))));


--
-- Name: agenda_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agenda_items ENABLE ROW LEVEL SECURITY;

--
-- Name: announcement_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcement_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: announcements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

--
-- Name: app_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: apps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

--
-- Name: business_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_items ENABLE ROW LEVEL SECURITY;

--
-- Name: business_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.business_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: calendar_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calendar_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: calling_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calling_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: calling_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calling_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: calling_history_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calling_history_log ENABLE ROW LEVEL SECURITY;

--
-- Name: calling_processes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.calling_processes ENABLE ROW LEVEL SECURITY;

--
-- Name: callings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.callings ENABLE ROW LEVEL SECURITY;

--
-- Name: candidate_names; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.candidate_names ENABLE ROW LEVEL SECURITY;

--
-- Name: task_activities create activities; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "create activities" ON public.task_activities FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_activities.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: task_comments create comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "create comments" ON public.task_comments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.tasks
  WHERE ((tasks.id = task_comments.task_id) AND (tasks.workspace_id IN ( SELECT profiles.workspace_id AS organization_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid())))))));


--
-- Name: discussion_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: discussion_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussion_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: discussions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_columns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_columns ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_columns dynamic_columns_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_columns_delete ON public.dynamic_columns FOR DELETE USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_columns dynamic_columns_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_columns_insert ON public.dynamic_columns FOR INSERT WITH CHECK ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_columns dynamic_columns_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_columns_select ON public.dynamic_columns FOR SELECT USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_columns dynamic_columns_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_columns_update ON public.dynamic_columns FOR UPDATE USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_rows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_rows ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_rows dynamic_rows_delete_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_rows_delete_workspace ON public.dynamic_rows FOR DELETE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_rows dynamic_rows_insert_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_rows_insert_workspace ON public.dynamic_rows FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_rows dynamic_rows_select_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_rows_select_workspace ON public.dynamic_rows FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_rows dynamic_rows_update_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_rows_update_workspace ON public.dynamic_rows FOR UPDATE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_tables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_tables dynamic_tables_delete_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_tables_delete_workspace ON public.dynamic_tables FOR DELETE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_tables dynamic_tables_insert_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_tables_insert_workspace ON public.dynamic_tables FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_tables dynamic_tables_select_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_tables_select_workspace ON public.dynamic_tables FOR SELECT USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_tables dynamic_tables_update_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_tables_update_workspace ON public.dynamic_tables FOR UPDATE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: dynamic_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dynamic_views ENABLE ROW LEVEL SECURITY;

--
-- Name: dynamic_views dynamic_views_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_views_delete ON public.dynamic_views FOR DELETE USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_views dynamic_views_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_views_insert ON public.dynamic_views FOR INSERT WITH CHECK ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_views dynamic_views_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_views_select ON public.dynamic_views FOR SELECT USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: dynamic_views dynamic_views_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dynamic_views_update ON public.dynamic_views FOR UPDATE USING ((table_id IN ( SELECT dynamic_tables.id
   FROM public.dynamic_tables
  WHERE (dynamic_tables.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: event_designs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.event_designs ENABLE ROW LEVEL SECURITY;

--
-- Name: events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

--
-- Name: external_calendar_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_calendar_events ENABLE ROW LEVEL SECURITY;

--
-- Name: external_event_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_event_links ENABLE ROW LEVEL SECURITY;

--
-- Name: form_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: form_view_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.form_view_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: forms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;

--
-- Name: forms forms_delete_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY forms_delete_workspace ON public.forms FOR DELETE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: forms forms_insert_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY forms_insert_workspace ON public.forms FOR INSERT WITH CHECK ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: forms forms_select_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY forms_select_workspace ON public.forms FOR SELECT USING (((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (is_published = true)));


--
-- Name: forms forms_update_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY forms_update_workspace ON public.forms FOR UPDATE USING ((workspace_id IN ( SELECT profiles.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: hidden_template_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hidden_template_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: hymns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hymns ENABLE ROW LEVEL SECURITY;

--
-- Name: invite_validation_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.invite_validation_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_share_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_share_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_share_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_share_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: meeting_share_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meeting_share_views ENABLE ROW LEVEL SECURITY;

--
-- Name: meetings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

--
-- Name: note_associations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.note_associations ENABLE ROW LEVEL SECURITY;

--
-- Name: notebooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

--
-- Name: notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

--
-- Name: participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: procedural_item_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedural_item_types ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: speaker_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speaker_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: speakers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

--
-- Name: form_submissions submissions_delete_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_delete_workspace ON public.form_submissions FOR DELETE USING ((form_id IN ( SELECT forms.id
   FROM public.forms
  WHERE (forms.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: form_submissions submissions_insert_published; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_insert_published ON public.form_submissions FOR INSERT WITH CHECK ((form_id IN ( SELECT forms.id
   FROM public.forms
  WHERE (forms.is_published = true))));


--
-- Name: form_submissions submissions_select_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY submissions_select_workspace ON public.form_submissions FOR SELECT USING ((form_id IN ( SELECT forms.id
   FROM public.forms
  WHERE (forms.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: task_activities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

--
-- Name: task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_label_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_label_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: task_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: template_folders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_folders ENABLE ROW LEVEL SECURITY;

--
-- Name: template_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.template_items ENABLE ROW LEVEL SECURITY;

--
-- Name: templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

--
-- Name: time_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: form_view_analytics view_analytics_insert_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_analytics_insert_all ON public.form_view_analytics FOR INSERT WITH CHECK (true);


--
-- Name: form_view_analytics view_analytics_select_workspace; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_analytics_select_workspace ON public.form_view_analytics FOR SELECT USING ((form_id IN ( SELECT forms.id
   FROM public.forms
  WHERE (forms.workspace_id IN ( SELECT profiles.workspace_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: form_view_analytics view_analytics_update_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY view_analytics_update_all ON public.form_view_analytics FOR UPDATE USING (true);


--
-- Name: workspace_announcement_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_announcement_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_apps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_apps ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_business_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_business_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_discussion_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_discussion_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_event_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_event_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_meeting_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_meeting_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_speaker_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_speaker_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_task_counters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_task_counters ENABLE ROW LEVEL SECURITY;

--
-- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--



-- ============================================
-- SEED DATA FOR REFERENCE TABLES
-- ============================================

INSERT INTO public.apps VALUES ('308319ba-ab8a-41e1-9cc9-a61a2c3353d6', 'canva', 'Canva', 'Create beautiful event invitations, flyers, and graphics with Canva''s powerful design tools.', '/icons/canva.png', 'design', true, true, '{design:content:write,design:content:read}', '{event_invitations,design_studio}', '2026-02-05 15:15:03.134168+00');
INSERT INTO public.hymns VALUES ('b49ee7ad-62a3-4ffd-b19b-29958df7f7eb', 'hymns_church', 1, 'The Morning Breaks', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('41bec326-97ae-4cfc-b3b6-f872cbba1eec', 'hymns_church', 2, 'The Spirit of God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0876a177-9254-48c5-bb06-a9ebeb412407', 'hymns_church', 3, 'Now Let Us Rejoice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('63866661-4f60-4dd5-901a-7b8137375933', 'hymns_church', 4, 'Truth Eternal', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('075507cf-9987-4481-8271-75d7cd4130e4', 'hymns_church', 5, 'High on the Mountain Top', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7e2f2c10-c166-45d2-a041-47c53ddaeffe', 'hymns_church', 6, 'Redeemer of Israel', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('88574f68-3d4e-43d1-8aed-923aa1d78eb5', 'hymns_church', 7, 'Israel, Israel, God Is Calling', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('25bce78f-f7da-4e19-9e09-adc985c1b13f', 'hymns_church', 8, 'Awake and Arise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('723a9210-d4ec-4cdb-a7a7-495b51c82dac', 'hymns_church', 9, 'Come, Rejoice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4e859cb2-bf4e-41cf-baa9-5a8836e03393', 'hymns_church', 10, 'Come, Sing to the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('20ef4955-6e28-491c-9399-7f2d7f677a97', 'hymns_church', 11, 'What Was Witnessed in the Heavens?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('931b6619-44ac-4020-926a-298433889d4d', 'hymns_church', 12, '’Twas Witnessed in the Morning Sky', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('85921d6f-3c49-43f6-989e-3b4bba2ad2fc', 'hymns_church', 13, 'An Angel from on High', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('43407a35-d2a5-4fa0-befe-c0c89a03a476', 'hymns_church', 14, 'Sweet Is the Peace the Gospel Brings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('95b717b2-7e9d-4158-b95e-5cdd2b7b3e9d', 'hymns_church', 15, 'I Saw a Mighty Angel Fly', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('65ff5c34-a1ed-48d2-8fef-1c7832acdac5', 'hymns_church', 16, 'What Glorious Scenes Mine Eyes Behold', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('738cc4fb-2c0b-45db-ae7a-60353bd8fcdb', 'hymns_church', 17, 'Awake, Ye Saints of God, Awake!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('059d9a25-0e22-43de-9b88-4ff25a3bf66f', 'hymns_church', 18, 'The Voice of God Again Is Heard', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('98d31a9e-9737-4756-80cd-8b4d6f32ce90', 'hymns_church', 19, 'We Thank Thee, O God, for a Prophet', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('68fa4a79-ed18-46fd-ad0b-208c2974d4c1', 'hymns_church', 20, 'God of Power, God of Right', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('939c5026-971e-4459-aa9d-d27e96b57ecc', 'hymns_church', 21, 'Come, Listen to a Prophet’s Voice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c32e714a-4eb4-4615-b228-5fb00d32f5f1', 'hymns_church', 22, 'We Listen to a Prophet’s Voice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('07ff4e89-bd81-4b0f-9cf5-b3567c6155d0', 'hymns_church', 23, 'We Ever Pray for Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e53632f8-6ffd-4283-8fc1-83c5d17414d1', 'hymns_church', 24, 'God Bless Our Prophet Dear', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('70ebeccc-e398-43ac-ae45-f45996277b8e', 'hymns_church', 25, 'Now We’ll Sing with One Accord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dafe7a6d-a222-4fbc-b10f-b10ad1bb6d40', 'hymns_church', 26, 'Joseph Smith’s First Prayer', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('095e59e6-8c78-495f-a1d1-ebe2da98de9e', 'hymns_church', 27, 'Praise to the Man', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f0e8b891-03bb-4cd4-a51d-c309f0d97864', 'hymns_church', 28, 'Saints, Behold How Great Jehovah', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cb0f3e24-1bf8-4aec-9db0-e7ad820bb997', 'hymns_church', 29, 'A Poor Wayfaring Man of Grief', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('90643435-8f17-4152-898c-48fe064fe8b2', 'hymns_church', 30, 'Come, Come, Ye Saints', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d8135edd-dcad-4103-87b3-4692fee30068', 'hymns_church', 31, 'O God, Our Help in Ages Past', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('691f03ca-a100-4a48-8d27-808636da2885', 'hymns_church', 32, 'The Happy Day at Last Has Come', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6873782e-3fc7-41f2-b18a-c79fc00ea093', 'hymns_church', 33, 'Our Mountain Home So Dear', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('287a2e11-a085-4bfe-a470-c6d1be559765', 'hymns_church', 34, 'O Ye Mountains High', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('04edebac-c014-4326-afd9-be0f30b691ff', 'hymns_church', 35, 'For the Strength of the Hills', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('70287026-aef1-494c-8d32-3f185587c91b', 'hymns_church', 36, 'They, the Builders of the Nation', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('df726699-e31e-4d3a-8395-a522e16af23d', 'hymns_church', 37, 'The Wintry Day, Descending to Its Close', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6e499ee1-3a94-4424-8ebb-877a4d7affd0', 'hymns_church', 38, 'Come, All Ye Saints of Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d3965c64-b85b-4495-bfc8-78996b8813d0', 'hymns_church', 39, 'O Saints of Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4be8f352-7bab-4e02-a2a7-220965ca8edd', 'hymns_church', 40, 'Arise, O Glorious Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a7fa0c04-646d-4f1d-9ea6-40bce459bf9b', 'hymns_church', 41, 'Let Zion in Her Beauty Rise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('43406ba2-1695-4b06-ab3d-12a11dde8ff5', 'hymns_church', 42, 'Hail to the Brightness of Zion’s Glad Morning!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6921879a-a7e9-4cf2-ba44-2e0e757ab3dd', 'hymns_church', 43, 'Zion Stands with Hills Surrounded', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ad49171e-e5bc-4c95-9c6b-bf56a0a60564', 'hymns_church', 44, 'Beautiful Zion, Built Above', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c6e3b5d2-32f1-4723-a416-054977ab3ef5', 'hymns_church', 45, 'Lead Me into Life Eternal', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f99a32d6-af92-4023-a8dc-e05655e04ef9', 'hymns_church', 46, 'Glorious Things of Thee Are Spoken', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('de4348e5-385f-4fe7-a6a0-93b13583f446', 'hymns_church', 47, 'We Will Sing of Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6a5e5fcd-b808-4255-954d-6706527a0209', 'hymns_church', 48, 'Glorious Things Are Sung of Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3d822d10-34ed-4fd0-9c5a-e32614cc5182', 'hymns_church', 49, 'Adam-ondi-Ahman', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('787429dd-53b9-4de4-80df-41ea58fc23f2', 'hymns_church', 50, 'Come, Thou Glorious Day of Promise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8f022721-9331-450f-aacf-73e8423dee47', 'hymns_church', 51, 'Sons of Michael, He Approaches', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2031d048-1db3-422b-8804-5db5d279ca28', 'hymns_church', 52, 'The Day Dawn Is Breaking', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4ee0d8a7-1e19-4732-9ee6-2cb05ed37ff3', 'hymns_church', 53, 'Let Earth’s Inhabitants Rejoice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6686bf7e-a4f1-42f9-91ca-748b6e696f9a', 'hymns_church', 54, 'Behold, the Mountain of the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('05891125-eec5-49f9-a6a4-cf7d44a104a7', 'hymns_church', 55, 'Lo, the Mighty God Appearing!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('918be9a9-980c-4e45-8324-78f27396a3b4', 'hymns_church', 56, 'Softly Beams the Sacred Dawning', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c47069c3-dbb4-4928-b7dd-9ede8d097760', 'hymns_church', 57, 'We’re Not Ashamed to Own Our Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9ce42d5b-1ffa-49ed-a56c-fefecac655cb', 'hymns_church', 58, 'Come, Ye Children of the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('04aa1fe5-8a54-446d-a79e-c934bb6bd5d7', 'hymns_church', 59, 'Come, O Thou King of Kings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cf8ab2ce-51cf-41ac-9710-80bb9b64860e', 'hymns_church', 60, 'Battle Hymn of the Republic', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('612a1fe6-2185-4c5f-b9ca-486b2c312475', 'hymns_church', 61, 'Raise Your Voices to the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('58962024-4216-4817-9f88-507d095a2ebe', 'hymns_church', 62, 'All Creatures of Our God and King', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d5245f5a-a138-46f2-b023-8aa13b93ccda', 'hymns_church', 63, 'Great King of Heaven', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('38f39a94-fc4d-4e65-bbcd-f0f31aa473d7', 'hymns_church', 64, 'On This Day of Joy and Gladness', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e9e469bd-fea6-46ae-98f6-df8b9cb4b283', 'hymns_church', 65, 'Come, All Ye Saints Who Dwell on Earth', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1d1882d5-c844-4eb7-8400-bc3b5433a894', 'hymns_church', 66, 'Rejoice, the Lord Is King!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cbd14808-95f5-4e2d-a121-bf674ec4f929', 'hymns_church', 67, 'Glory to God on High', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('bf9d529a-154e-491e-857b-435657fcce47', 'hymns_church', 68, 'A Mighty Fortress Is Our God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('08133d42-70fe-4dc9-a0fe-aaaed0682a97', 'hymns_church', 69, 'All Glory, Laud, and Honor', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ec47cc3c-3a61-495f-a71e-da747aab2fc8', 'hymns_church', 70, 'Sing Praise to Him', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8a22423e-b162-4637-898f-fed6aaebbef7', 'hymns_church', 71, 'With Songs of Praise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('86255276-e229-4dc8-ab64-c135ae908912', 'hymns_church', 72, 'Praise to the Lord, the Almighty', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b9cc06f6-1105-476d-aa0f-4b88048f880b', 'hymns_church', 73, 'Praise the Lord with Heart and Voice', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8f264d1e-fd9e-44cc-9b0e-7641612d480c', 'hymns_church', 74, 'Praise Ye the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e150d3a8-88da-472a-84d0-e91016c97f6c', 'hymns_church', 75, 'In Hymns of Praise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6a5c3844-c392-439e-8307-72d840455374', 'hymns_church', 76, 'God of Our Fathers, We Come unto Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('99d14483-05e1-4be9-811a-c9dada023c21', 'hymns_church', 77, 'Great Is the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6b3b066d-bfdf-44de-ae4c-61c7574c3ca4', 'hymns_church', 78, 'God of Our Fathers, Whose Almighty Hand', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3176a556-c915-4212-a655-4aae763b07b5', 'hymns_church', 79, 'With All the Power of Heart and Tongue', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9975e009-caea-45c7-8c26-f80ca7bb3d04', 'hymns_church', 80, 'God of Our Fathers, Known of Old', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('be6e4a29-0844-43a8-bfb0-46c85f6a20db', 'hymns_church', 81, 'Press Forward, Saints', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a73161d7-b83d-460b-80b9-0c37fbfea8e8', 'hymns_church', 82, 'For All the Saints', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d82bb5c4-bd1a-4107-80ba-813d1f00f3fe', 'hymns_church', 83, 'Guide Us, O Thou Great Jehovah', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9352bd32-82a8-40a0-b3ea-52ab6e31820a', 'hymns_church', 84, 'Faith of Our Fathers', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('83e58ef7-a0c2-4932-944b-589aa67e2201', 'hymns_church', 85, 'How Firm a Foundation', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('478d3267-2a03-40b0-b3ce-87586bf57d63', 'hymns_church', 87, 'God Is Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('680c961d-f3e8-4ed9-be00-dc09158747a7', 'hymns_church', 88, 'Great God, Attend While Zion Sings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c1d6125f-86b6-44dd-aca2-521acdf98051', 'hymns_church', 89, 'The Lord Is My Light', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5f531cbd-551c-4445-98b6-6decede93201', 'hymns_church', 90, 'From All That Dwell below the Skies', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dd1ea976-0cf9-4141-9191-0f80cc5933fb', 'hymns_church', 91, 'Father, Thy Children to Thee Now Raise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4897b993-1016-46d9-9f98-0d3c1a6c73e2', 'hymns_church', 92, 'For the Beauty of the Earth', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('531a4dc4-3fa2-464f-9394-4c7b189ad64f', 'hymns_church', 93, 'Prayer of Thanksgiving', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2555ec7e-9505-4d32-85f6-8cb9d5bff071', 'hymns_church', 94, 'Come, Ye Thankful People', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e51e04ee-e6a9-4297-990d-7c41525b1bda', 'hymns_church', 95, 'Now Thank We All Our God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8e4bcd62-b05e-4432-9017-78f05bf1bc3c', 'hymns_church', 96, 'Dearest Children, God Is Near You', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('819ff278-0ac5-477e-ab46-539bda13acab', 'hymns_church', 97, 'Lead, Kindly Light', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('07c285a5-bf07-4d00-b847-8e471c2a564b', 'hymns_church', 98, 'I Need Thee Every Hour', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('20253bd8-c8b2-47ac-baef-271c8282bbbd', 'hymns_church', 99, 'Nearer, Dear Savior, to Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('428c8ee4-db64-45f5-9ab2-20f1d4862944', 'hymns_church', 100, 'Nearer, My God, to Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f4c2ef7d-d391-4d7c-9daa-4841d3256b50', 'hymns_church', 101, 'Guide Me to Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d8b02403-7f81-43ca-bf73-641410c393d7', 'hymns_church', 102, 'Jesus, Lover of My Soul', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6b396459-b31f-43c6-9bf7-fb66b7e1131e', 'hymns_church', 103, 'Precious Savior, Dear Redeemer', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6e3dc2a7-b4cb-4737-b426-90988002a400', 'hymns_church', 104, 'Jesus, Savior, Pilot Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('fe9aaa4e-66cb-4a1c-9000-ca87dde96b34', 'hymns_church', 105, 'Master, the Tempest Is Raging', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('71833564-c76d-4a81-96e0-787fd8960f59', 'hymns_church', 106, 'God Speed the Right', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6b856237-52c7-4400-9866-79deeb05fe59', 'hymns_church', 107, 'Lord, Accept Our True Devotion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('27e58d1b-56c9-4e45-a044-d8c1de11384c', 'hymns_church', 108, 'The Lord Is My Shepherd', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('856e9c0e-7dd1-430b-961b-d283492fa15b', 'hymns_church', 109, 'The Lord My Pasture Will Prepare', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f6fb599c-bfd2-497f-a43b-305280c6d0a9', 'hymns_church', 110, 'Cast Thy Burden upon the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('10531fe5-e608-4d54-a037-677d3915c40f', 'hymns_church', 111, 'Rock of Ages', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('132a9498-16ac-4213-938b-ecea276e8940', 'hymns_church', 112, 'Savior, Redeemer of My Soul', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4079a1e1-3e12-481c-aeb8-fc0a47dc1fff', 'hymns_church', 113, 'Our Savior’s Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0e135573-fbc0-4bf2-88c8-6ef770649bfa', 'hymns_church', 114, 'Come unto Him', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3730cf7c-9afa-4aa1-ac80-4628192f580a', 'hymns_church', 115, 'Come, Ye Disconsolate', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('22afc3b1-d43c-43b6-9698-b30090da13e0', 'hymns_church', 116, 'Come, Follow Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0cc7ebc0-2332-4f5c-95d6-b31019bd8f8e', 'hymns_church', 117, 'Come unto Jesus', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('88b7e025-0f0a-438a-8eff-3ad84394b802', 'hymns_church', 118, 'Ye Simple Souls Who Stray', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dccbbff9-6b73-4024-969a-55f00e599f6d', 'hymns_church', 119, 'Come, We That Love the Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2d2c8a97-592c-41f5-b93f-84b01bef79da', 'hymns_church', 120, 'Lean on My Ample Arm', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6108a99e-ccac-4874-8d73-41c1231b0148', 'hymns_church', 121, 'I’m a Pilgrim, I’m a Stranger', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6a85f7c8-2af4-4e3c-8d21-8959b5cc95e8', 'hymns_church', 122, 'Though Deepening Trials', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4ff15bff-9956-47c8-b493-0c83938a72ee', 'hymns_church', 123, 'Oh, May My Soul Commune with Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ac74c0ce-ceba-445d-9abd-588685aa3ca0', 'hymns_church', 124, 'Be Still, My Soul', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('870b8529-e361-4149-8361-db1951a81b8d', 'hymns_church', 125, 'How Gentle God’s Commands', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0aa0513b-7f14-42a2-b95c-2e788881e942', 'hymns_church', 126, 'How Long, O Lord Most Holy and True', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('be6b7c7c-1e26-40fc-a633-24ce3b9f7462', 'hymns_church', 127, 'Does the Journey Seem Long?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1fce184c-30db-4bb5-9205-82f7a68949ee', 'hymns_church', 128, 'When Faith Endures', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4e0f435d-3adb-4ee8-80eb-7897d6fe0122', 'hymns_church', 129, 'Where Can I Turn for Peace?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('671cf1d3-b9d5-4999-9b9e-a6ce92a91d02', 'hymns_church', 130, 'Be Thou Humble', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c5a15eb9-8720-4666-b8f5-01b13c89d634', 'hymns_church', 131, 'More Holiness Give Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0e29a45f-6b8c-4f39-8ec3-5719ef44b71b', 'hymns_church', 132, 'God Is in His Holy Temple', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a5ea9431-72f9-47bf-bcfc-c05957809fa0', 'hymns_church', 133, 'Father in Heaven', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6dc4415c-6a4b-4f1e-8456-aba03d597ba7', 'hymns_church', 134, 'I Believe in Christ', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ee854945-75f2-4e41-8ff8-f7b85fccb1b9', 'hymns_church', 135, 'My Redeemer Lives', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f5a53a34-99b9-4399-82dd-764cb95bd8ab', 'hymns_church', 136, 'I Know That My Redeemer Lives', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('14c2b7cd-ba71-4a7e-817f-562ce4ce5db4', 'hymns_church', 137, 'Testimony', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2bace214-563e-47cd-859d-deaa2f961577', 'hymns_church', 138, 'Bless Our Fast, We Pray', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e072dd6b-b6b6-4429-9862-d5a12ede7961', 'hymns_church', 139, 'In Fasting We Approach Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5ed7e1b0-bcf5-4621-8ade-aee0528d07b6', 'hymns_church', 140, 'Did You Think to Pray?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('996da8b5-28b3-4159-93b4-4297e40db124', 'hymns_church', 141, 'Jesus, the Very Thought of Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('61a6870c-9503-40f1-aaf7-ce43f1c49acf', 'hymns_church', 142, 'Sweet Hour of Prayer', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d746811e-d4d5-47a1-ace9-3254ef72a2db', 'hymns_church', 143, 'Let the Holy Spirit Guide', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d9430d80-3f3c-4554-81f2-9fe63c04473f', 'hymns_church', 144, 'Secret Prayer', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1e267cf4-2745-48c0-a770-8b53dece17c3', 'hymns_church', 145, 'Prayer Is the Soul’s Sincere Desire', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d420a048-42b3-4692-930d-b6301aea9d69', 'hymns_church', 146, 'Gently Raise the Sacred Strain', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3fcbf960-a556-46f6-87e5-0932308c98fd', 'hymns_church', 147, 'Sweet Is the Work', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('78c2008d-5790-407a-b40e-cc480208884c', 'hymns_church', 148, 'Sabbath Day', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('52765222-020b-4967-88b2-4c3bf4033c76', 'hymns_church', 149, 'As the Dew from Heaven Distilling', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('60d390d8-6ac1-4256-94e7-f5f5340c8e32', 'hymns_church', 150, 'O Thou Kind and Gracious Father', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('24ff0652-3c4d-4228-8d6f-a323b79a17f0', 'hymns_church', 151, 'We Meet, Dear Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('930efab3-7939-4217-b21e-7f1d2b25f65e', 'hymns_church', 152, 'God Be with You Till We Meet Again', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dfb6ec9e-2bef-4df1-a96b-fa4293017d7b', 'hymns_church', 153, 'Lord, We Ask Thee Ere We Part', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2b29ed2c-5237-45b7-b250-27cc8faca7d0', 'hymns_church', 154, 'Father, This Hour Has Been One of Joy', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7b947eba-b46d-4450-89ff-e349825234ac', 'hymns_church', 155, 'We Have Partaken of Thy Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('629e9a35-15ba-4f50-b082-66b5390c977b', 'hymns_church', 156, 'Sing We Now at Parting', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('32cad15e-005c-4298-bcc6-5475073a8434', 'hymns_church', 157, 'Thy Spirit, Lord, Has Stirred Our Souls', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('96e62f70-0992-4804-8774-27bae3acf7e1', 'hymns_church', 158, 'Before Thee, Lord, I Bow My Head', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b9050260-1c1e-4449-b014-4ba0b5feaa37', 'hymns_church', 159, 'Now the Day Is Over', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('60e3b877-b953-461b-ab8e-49726f1a3855', 'hymns_church', 160, 'Softly Now the Light of Day', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f77406f-c7ca-44af-9195-f36acb93177e', 'hymns_church', 161, 'The Lord Be with Us', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9975fb90-fd84-496e-a9ed-44b74cf5dc71', 'hymns_church', 162, 'Lord, We Come before Thee Now', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d9eba318-8cbe-4440-b97d-2a1aed6a1631', 'hymns_church', 163, 'Lord, Dismiss Us with Thy Blessing', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b2a7c048-1d12-482e-8fe6-a9f9f843a2e0', 'hymns_church', 164, 'Great God, to Thee My Evening Song', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8f1167ff-3bf5-4f45-a3e9-22462b21f675', 'hymns_church', 165, 'Abide with Me; ’Tis Eventide', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('22752493-e2f0-4822-ae2f-851071adceb0', 'hymns_church', 166, 'Abide with Me!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c7125bb3-ce63-4f83-95bc-6efb7abdaaf8', 'hymns_church', 167, 'Come, Let Us Sing an Evening Hymn', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('33a154ec-d8af-475b-8cbc-7b093657608c', 'hymns_church', 168, 'As the Shadows Fall', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d6783ca3-ec83-4cb5-95f6-807985a4f8ed', 'hymns_church', 169, 'As Now We Take the Sacrament', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ef8459c9-a06f-435d-b8da-ee709ecabc97', 'hymns_church', 170, 'God, Our Father, Hear Us Pray', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('27d7c0f1-6628-4ea8-a460-568640586226', 'hymns_church', 171, 'With Humble Heart', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a0b2b36e-4b88-48cd-a353-a8a7195bab87', 'hymns_church', 172, 'In Humility, Our Savior', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8fc59efb-13ae-4f69-aad3-0aad0e26d259', 'hymns_church', 173, 'While of These Emblems We Partake', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('275f9bf3-af4f-45dc-b359-bb1d73885628', 'hymns_church', 174, 'While of These Emblems We Partake', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('944d197a-5aeb-4e8d-abf0-981b188e478b', 'hymns_church', 175, 'O God, the Eternal Father', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7e6e3f75-3f26-431d-b6f5-a296b1280f23', 'hymns_church', 176, '’Tis Sweet to Sing the Matchless Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('608735f2-a4d4-490a-9308-99c4f31f1b54', 'hymns_church', 177, '’Tis Sweet to Sing the Matchless Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ae8c30fa-2379-42aa-b827-0a7eccc29b8d', 'hymns_church', 178, 'O Lord of Hosts', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('06b24bdf-02d7-4175-8f77-fafb1f700410', 'hymns_church', 179, 'Again, Our Dear Redeeming Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('64310174-d14e-4977-aef2-28392e5b9408', 'hymns_church', 180, 'Father in Heaven, We Do Believe', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a136a865-3d10-4fe6-bb18-4f82631f89af', 'hymns_church', 181, 'Jesus of Nazareth, Savior and King', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ea0a8427-8e25-4b1d-acec-0399dc179990', 'hymns_church', 182, 'We’ll Sing All Hail to Jesus’ Name', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3780c904-c740-4a74-acc1-d35f71cc3fe7', 'hymns_church', 183, 'In Remembrance of Thy Suffering', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c7d60c47-c661-4b7f-a18b-b240f00f1beb', 'hymns_church', 184, 'Upon the Cross of Calvary', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e53ff46d-4622-4773-a394-6b13760a9619', 'hymns_church', 185, 'Reverently and Meekly Now', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ed240f49-16ab-4058-8c5e-224a3567cb57', 'hymns_church', 186, 'Again We Meet around the Board', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cec50293-862b-419d-914f-f703cf523b7a', 'hymns_church', 187, 'God Loved Us, So He Sent His Son', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('87bb7124-129e-4d49-bdad-f61cdad9cea3', 'hymns_church', 188, 'Thy Will, O Lord, Be Done', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d1a0c94d-e927-4197-bc2d-4a599e90b65c', 'hymns_church', 189, 'O Thou, Before the World Began', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dc564145-ec49-4238-bb73-57a08a08fc6b', 'hymns_church', 190, 'In Memory of the Crucified', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8bd1411a-9a6e-4359-b096-b096e2b39b3d', 'hymns_church', 191, 'Behold the Great Redeemer Die', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a36176f6-6dd0-4449-b041-fb667a63371f', 'hymns_church', 192, 'He Died! The Great Redeemer Died', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8f34d32c-a0d8-42d7-84ad-c3505714c2c4', 'hymns_church', 193, 'I Stand All Amazed', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7fecb68e-42d5-45c8-b3a8-64777d599578', 'hymns_church', 194, 'There Is a Green Hill Far Away', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('26ed60d5-701d-4f8e-b094-6ba8d18a4f81', 'hymns_church', 195, 'How Great the Wisdom and the Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a8b6893a-6b5a-4858-befa-d37435fdb273', 'hymns_church', 196, 'Jesus, Once of Humble Birth', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('75bc13fb-b0b5-4650-a389-fa2eda27ce0a', 'hymns_church', 197, 'O Savior, Thou Who Wearest a Crown', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f585110e-9c08-437d-ad9d-e7de77bf3ef6', 'hymns_church', 198, 'That Easter Morn', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f32f0d12-ddba-43f8-9617-1936dd65cfd3', 'hymns_church', 199, 'He Is Risen!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5af1991c-e419-485c-90fa-fa4aa931c91c', 'hymns_church', 200, 'Christ the Lord Is Risen Today', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('357d38a9-f307-46b8-98e6-b684c504984b', 'hymns_church', 201, 'Joy to the World', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0388ba54-f09e-45fb-bf1a-d3ea279d29e6', 'hymns_church', 202, 'Oh, Come, All Ye Faithful', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e785ffe5-d727-4b54-8768-77778c5479b5', 'hymns_church', 203, 'Angels We Have Heard on High', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e122e911-0b2f-484a-9169-c6833a3f897d', 'hymns_church', 204, 'Silent Night', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9bc29593-cad0-480f-99dc-39d832982ad4', 'hymns_church', 205, 'Once in Royal David’s City', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4efaa244-3244-4bbb-ace2-c4d8ba8c419e', 'hymns_church', 206, 'Away in a Manger', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9e28140a-7ac6-47d5-b05c-506c50e88003', 'hymns_church', 207, 'It Came upon the Midnight Clear', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('049a88a3-8021-464d-b912-864b66f383f6', 'hymns_church', 208, 'O Little Town of Bethlehem', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6652a522-9964-4666-bdc5-d6f3fa2f4e19', 'hymns_church', 209, 'Hark! The Herald Angels Sing', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0b8fef76-c400-4c44-a2b5-f8e09f695274', 'hymns_church', 210, 'With Wondering Awe', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a241023c-3b41-436f-a180-4a4538e3abb6', 'hymns_church', 211, 'While Shepherds Watched Their Flocks', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c6b370c9-212b-4bd4-b0c2-1f1e48fcb127', 'hymns_church', 212, 'Far, Far Away on Judea’s Plains', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6aef23ad-f69f-4e87-9c31-4831afc7d7cc', 'hymns_church', 213, 'The First Noel', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d723243e-ae2b-4783-813f-bf17a759618f', 'hymns_church', 214, 'I Heard the Bells on Christmas Day', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7454c3b8-cb90-4252-ad08-1069534efc01', 'hymns_church', 215, 'Ring Out, Wild Bells', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('838214cc-695e-4ff8-a4a1-8bcc12113284', 'hymns_church', 216, 'We Are Sowing', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('13297dc1-d8f3-45ee-a148-e73409fd62b9', 'hymns_church', 217, 'Come, Let Us Anew', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3033263c-c142-4dda-856a-fa4f110ecbee', 'hymns_church', 218, 'We Give Thee But Thine Own', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('432f84e2-9c3a-468d-bdd1-fb391dae744c', 'hymns_church', 220, 'Lord, I Would Follow Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cc9100fc-a334-4af1-8932-654fff558d88', 'hymns_church', 221, 'Dear to the Heart of the Shepherd', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('05e1ad88-fab0-412b-b5ca-abf40ec7ad6a', 'hymns_church', 222, 'Hear Thou Our Hymn, O Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('64c311fd-b8b4-4951-9871-1cacd6f8147e', 'hymns_church', 223, 'Have I Done Any Good?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('09e64167-9cc0-4ede-b10d-98534aeb3598', 'hymns_church', 224, 'I Have Work Enough to Do', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('02ce4a59-9ed0-4843-a259-848fce2c70f7', 'hymns_church', 225, 'We Are Marching On to Glory', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0767dbcd-d8c5-44e9-967d-572d2001984c', 'hymns_church', 226, 'Improve the Shining Moments', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b5a90abc-4e96-4585-82df-ec9b0be7dc14', 'hymns_church', 227, 'There Is Sunshine in My Soul Today', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('96fec827-abe7-46f1-8e29-8c2c7eae0b74', 'hymns_church', 228, 'You Can Make the Pathway Bright', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f04cdffa-cb41-4caf-b114-0f87874bdbaa', 'hymns_church', 229, 'Today, While the Sun Shines', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('afbe31a9-f5e6-44da-ba33-64018c6f3ec5', 'hymns_church', 230, 'Scatter Sunshine', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e00de090-f2c4-4785-a7af-4aecbb66741f', 'hymns_church', 231, 'Father, Cheer Our Souls Tonight', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('98e237b1-447e-4dfa-bc2b-b99e0121216d', 'hymns_church', 232, 'Let Us Oft Speak Kind Words', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('da9211d3-c89f-4ace-a0a3-bae490785814', 'hymns_church', 233, 'Nay, Speak No Ill', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('18b488a7-5762-4160-9baa-c648a282062e', 'hymns_church', 234, 'Jesus, Mighty King in Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a8a5e52a-f402-4dad-99b1-f99d9e15ab57', 'hymns_church', 235, 'Should You Feel Inclined to Censure', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9ad5545f-45d7-47f0-a803-9b81e7e820e6', 'hymns_church', 236, 'Lord, Accept into Thy Kingdom', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8247110b-4d52-4af1-9639-d67321d286f9', 'hymns_church', 237, 'Do What Is Right', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c8552384-3e89-4fde-af41-a913ad4ad001', 'hymns_church', 238, 'Behold Thy Sons and Daughters, Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('712b54c2-c3be-4eb3-aa01-33e8483887a1', 'hymns_church', 239, 'Choose the Right', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('20b5fffe-b772-4a5c-90d4-1ddddb89c723', 'hymns_church', 240, 'Know This, That Every Soul Is Free', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('30463ddb-c197-495e-8ce8-8ddf1c81b27c', 'hymns_church', 241, 'Count Your Blessings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9e6343fb-f64b-461b-a4d2-4c2395fca1f8', 'hymns_church', 242, 'Praise God, from Whom All Blessings Flow', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('27b66129-5ff8-4750-ada7-0f71d9d2d9bc', 'hymns_church', 243, 'Let Us All Press On', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('69dee5b7-400c-4d0f-8766-35152976850e', 'hymns_church', 244, 'Come Along, Come Along', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e668af47-68b7-44bf-bcaa-f6dfc82b91c6', 'hymns_church', 245, 'This House We Dedicate to Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('025053f1-22f1-4fff-a2df-036d1c9c2a78', 'hymns_church', 246, 'Onward, Christian Soldiers', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('64a5ba55-7351-4187-aa06-35a366a1d387', 'hymns_church', 247, 'We Love Thy House, O God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d4104f46-25bd-4835-aa88-3f00362f048b', 'hymns_church', 248, 'Up, Awake, Ye Defenders of Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3071c15e-33f4-42a0-b887-30b9e4a7f042', 'hymns_church', 249, 'Called to Serve', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1396b307-d896-4045-bfa4-48a0ba9c1ea8', 'hymns_church', 250, 'We Are All Enlisted', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ab3d8507-d5c3-4db2-82ce-dcfcf2bd8756', 'hymns_church', 251, 'Behold! A Royal Army', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9578ee71-6e58-4ecb-aa50-9e4711cc094a', 'hymns_church', 252, 'Put Your Shoulder to the Wheel', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('606f5989-516d-4692-bcf3-ffb754faa919', 'hymns_church', 253, 'Like Ten Thousand Legions Marching', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('00219f80-dc60-4cff-9463-1d3dbe0bcd62', 'hymns_church', 254, 'True to the Faith', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ed67e75f-0de2-4c85-b8ad-b5b2deecac81', 'hymns_church', 255, 'Carry On', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d9433320-6f12-48e0-b1d7-cf9396e9fb1e', 'hymns_church', 256, 'As Zion’s Youth in Latter Days', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e2915ab4-3a62-4ae1-9632-5c8308c64582', 'hymns_church', 257, 'Rejoice! A Glorious Sound Is Heard', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b03f07ea-1356-44b1-b568-73932ab20b05', 'hymns_church', 258, 'O Thou Rock of Our Salvation', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9d3fbe89-c6e4-412b-9f31-1dc39fc814fb', 'hymns_church', 259, 'Hope of Israel', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5d751b99-7970-48c0-8d79-3c203d086f54', 'hymns_church', 260, 'Who’s on the Lord’s Side?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6aaed822-f749-4c0b-b9aa-135c8b4de7c4', 'hymns_church', 261, 'Thy Servants Are Prepared', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('603e3dce-556b-4b3e-9c56-70b0b56d8daf', 'hymns_church', 262, 'Go, Ye Messengers of Glory', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3b5f939d-7dcc-4b32-963a-389c233dc6d1', 'hymns_church', 263, 'Go Forth with Faith', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('60cafa54-4abe-4411-ba99-cd38e5846626', 'hymns_church', 264, 'Hark, All Ye Nations!', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('20a35857-ec51-454e-9ff3-b4439e15cb0f', 'hymns_church', 265, 'Arise, O God, and Shine', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4365b494-8ce4-41fe-9ad3-e8c62b09b9b3', 'hymns_church', 266, 'The Time Is Far Spent', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('15f9bab2-0649-4a95-b48c-5058fc7637ee', 'hymns_church', 267, 'How Wondrous and Great', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('21a991be-be44-4990-b9c5-c875713a71e6', 'hymns_church', 268, 'Come, All Whose Souls Are Lighted', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('357a36ca-f747-4c29-bf2d-244b29d85739', 'hymns_church', 269, 'Jehovah, Lord of Heaven and Earth', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('44381256-94ba-47bd-aed0-f9e2befb6a49', 'hymns_church', 270, 'I’ll Go Where You Want Me to Go', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b3b03bda-16d0-4868-8994-6dc06a0c2d10', 'hymns_church', 271, 'Oh, Holy Words of Truth and Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1ec656fe-cc0e-431a-88d3-f583d6e0130e', 'hymns_church', 272, 'Oh Say, What Is Truth?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('3a3b33cb-3274-47cd-a17a-70eb970aaabf', 'hymns_church', 273, 'Truth Reflects upon Our Senses', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d8d53e5d-9c29-4ce0-a1d0-674ea71139b5', 'hymns_church', 274, 'The Iron Rod', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('91cad0a5-ed36-4d55-b55e-f72e8f261d73', 'hymns_church', 275, 'Men Are That They Might Have Joy', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e88d7d71-d7de-481f-bae8-fe71fa5a941b', 'hymns_church', 276, 'Come Away to the Sunday School', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b36d344d-69a5-4643-9358-1c123f5ea82c', 'hymns_church', 277, 'As I Search the Holy Scriptures', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7c4d7643-c65c-46cf-b90d-b3e032ded039', 'hymns_church', 278, 'Thanks for the Sabbath School', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('026b783f-0624-4a2f-b8d8-c23342b26b2e', 'hymns_church', 279, 'Thy Holy Word', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f24f24a-3aae-4664-a1f9-6577ab9c9694', 'hymns_church', 280, 'Welcome, Welcome, Sabbath Morning', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f82a22f5-7bdd-43f9-850f-334b381a5d59', 'hymns_church', 281, 'Help Me Teach with Inspiration', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('af5c2426-491b-400c-b346-cf3496c5f8de', 'hymns_church', 282, 'We Meet Again in Sabbath School', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('73a2ceeb-795e-4e8a-ab9b-e1f21a0ec2e4', 'hymns_church', 283, 'The Glorious Gospel Light Has Shone', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ccf405ab-fd3b-4275-93b9-393e0647ae63', 'hymns_church', 284, 'If You Could Hie to Kolob', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('fca4d6f7-7c57-425f-9077-8d002df80143', 'hymns_church', 285, 'God Moves in a Mysterious Way', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a0ff9964-a3b7-4350-9faa-c58eeb1b1d40', 'hymns_church', 286, 'Oh, What Songs of the Heart', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d28a383e-cb38-4ae3-a605-608a12c1fe17', 'hymns_church', 287, 'Rise, Ye Saints, and Temples Enter', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f1be9518-01ac-4fcb-a08a-c2e74952387f', 'hymns_church', 288, 'How Beautiful Thy Temples, Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dde648d5-8ac1-4842-a368-6c176b749449', 'hymns_church', 289, 'Holy Temples on Mount Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f7de6500-dd47-4b60-9c69-350a1a9e87a6', 'hymns_church', 290, 'Rejoice, Ye Saints of Latter Days', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7025a373-3e47-41a8-aaa7-69847ba17fdf', 'hymns_church', 291, 'Turn Your Hearts', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('390f092e-7ccd-4f6d-a331-c7d526517c99', 'hymns_church', 292, 'O My Father', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c5b2d262-b162-423d-87b0-3002a1171852', 'hymns_church', 293, 'Each Life That Touches Ours for Good', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('89756b64-82cb-40a8-b1fe-3e9500fd3322', 'hymns_church', 294, 'Love at Home', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('09b3c2f0-7e9f-4b05-8626-ac1821d9783a', 'hymns_church', 295, 'O Love That Glorifies the Son', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('229411a8-7c02-4c71-8398-0e06c9c97538', 'hymns_church', 296, 'Our Father, by Whose Name', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f1b9e98-8607-40c3-9a76-2ad8aaebc7e1', 'hymns_church', 297, 'From Homes of Saints Glad Songs Arise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('558c32f7-65ac-49ea-b86e-d24e4029bf71', 'hymns_church', 298, 'Home Can Be a Heaven on Earth', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d3918603-28fb-4b48-8c31-1a62bda2291d', 'hymns_church', 300, 'Families Can Be Together Forever', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e9a1fcf6-17db-46b0-8ddb-959ec93de2ae', 'hymns_church', 301, 'I Am a Child of God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('fe197e46-fcea-41cc-95bb-db9c6714113c', 'hymns_church', 302, 'I Know My Father Lives', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4302e433-bbaa-41c7-b14e-77b15ea054d5', 'hymns_church', 303, 'Keep the Commandments', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('567c9633-5bc1-43a2-9ffa-4c3b2a8c1939', 'hymns_church', 304, 'Teach Me to Walk in the Light', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f4ebadd8-61d8-4fef-8f71-63a5d32ac35b', 'hymns_church', 305, 'The Light Divine', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('272603ec-a094-48d2-b410-04416d050f0f', 'hymns_church', 306, 'God’s Daily Care', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('21f13822-0080-42cd-aaa7-fb6a3bf6d73f', 'hymns_church', 307, 'In Our Lovely Deseret', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cb9db259-f7e9-4eff-a0de-8705984004b8', 'hymns_church', 308, 'Love One Another', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('81ace1cc-9230-4f35-885c-42870ddea618', 'hymns_church', 309, 'As Sisters in Zion', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5a669a10-a5fe-43e5-8167-3b04e9323ad5', 'hymns_church', 310, 'A Key Was Turned in Latter Days', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e1b43981-c3d5-4451-96fd-3f13cf58704c', 'hymns_church', 311, 'We Meet Again as Sisters', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dbb87ac8-e0d8-4b77-84ca-8d3ca7476a5b', 'hymns_church', 312, 'We Ever Pray for Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('345edfe0-c928-4aec-9b4a-7382d84f7962', 'hymns_church', 313, 'God Is Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('69600eca-39f3-48be-a192-3e9891a3da07', 'hymns_church', 314, 'How Gentle God’s Commands', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('dfabf6bd-1ff7-4451-b831-47792d764234', 'hymns_church', 315, 'Jesus, the Very Thought of Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('677cf5c3-9982-4424-93b0-77297dc0c14a', 'hymns_church', 316, 'The Lord Is My Shepherd', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f06aa473-105e-4a24-be3b-7b4cf905b5bd', 'hymns_church', 317, 'Sweet Is the Work', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f0f4de6-46d1-4be3-a422-350088a3de19', 'hymns_church', 318, 'Love at Home', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('fedf24f4-0f0a-4973-9e0b-cdac4b715e36', 'hymns_church', 319, 'Ye Elders of Israel', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f16964a7-d037-4332-a0c9-fe00843f140a', 'hymns_church', 320, 'The Priesthood of Our Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('ae241e3d-2a37-4b50-8be7-8cf16221979c', 'hymns_church', 321, 'Ye Who Are Called to Labor', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('95a912e0-7a98-4aec-b4c8-42fe67bde717', 'hymns_church', 322, 'Come, All Ye Sons of God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2be30caf-7e80-4645-a48a-16af4872a40a', 'hymns_church', 323, 'Rise Up, O Men of God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('7db02f06-35f7-480e-bc93-0492abba1d9c', 'hymns_church', 324, 'Rise Up, O Men of God', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d6e9b9ed-da1a-40e7-af3f-2d102002863c', 'hymns_church', 325, 'See the Mighty Priesthood Gathered', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a3947f55-c333-4b19-8f7b-0e34367d10f5', 'hymns_church', 326, 'Come, Come, Ye Saints', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4968b823-741f-44ea-9b1c-b4bda8a230b7', 'hymns_church', 327, 'Go, Ye Messengers of Heaven', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1c5d8910-c88d-4510-aa86-ab3aadd04729', 'hymns_church', 328, 'An Angel from on High', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('539d37ea-2edc-4335-9300-f7be243f631c', 'hymns_church', 329, 'Thy Servants Are Prepared', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a9d04364-1b01-4ae3-bb00-4428a0d0fc53', 'hymns_church', 330, 'See, the Mighty Angel Flying', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('46f330cf-05d3-4859-bdf4-7437c1fdb6af', 'hymns_church', 331, 'Oh Say, What Is Truth?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('96f0bde1-c060-4bdc-929e-4eca30f9fbec', 'hymns_church', 332, 'Come, O Thou King of Kings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6aa9ee8d-4765-4b87-9563-ba3c3f97e2bb', 'hymns_church', 333, 'High on the Mountain Top', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('04e93c75-5723-4f3c-8046-11d727699492', 'hymns_church', 334, 'I Need Thee Every Hour', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d3d7b283-ce73-4c83-98a5-3a75d9371276', 'hymns_church', 335, 'Brightly Beams Our Father’s Mercy', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('29a96368-2e8c-4da2-ae9a-dceeed2987c4', 'hymns_church', 336, 'School Thy Feelings', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('db2ff9cd-a916-4790-964d-ddf8c5b7dd1d', 'hymns_church', 337, 'O Home Beloved', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('583621cf-f01d-4f74-82ea-5f33e96404fb', 'hymns_church', 338, 'America the Beautiful', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('357355e4-e0fb-4549-85e8-1633c528dc1f', 'hymns_church', 339, 'My Country, ’Tis of Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5d00cca9-03a1-4785-a4c6-ee8eb02060ea', 'hymns_church', 340, 'The Star-Spangled Banner', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4985c8f2-9f95-421b-92d3-cc8628c5a11a', 'hymns_church', 341, 'God Save the King', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f1b3a153-c08f-46b3-bf32-a8639ab80b97', 'hymns_home_church', 1001, 'Come, Thou Fount of Every Blessing', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('409ddbe8-89ed-4b05-9935-bbf65c16324c', 'hymns_home_church', 1002, 'When the Savior Comes Again', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f971dc07-84d2-4ec0-a606-ed84f948298e', 'hymns_home_church', 1003, 'It Is Well with My Soul', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('fc588f3b-00bb-41b8-99bb-49292217611a', 'hymns_home_church', 1004, 'I Will Walk with Jesus', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9ea2dd73-0fa8-4893-89bb-3069021be5b4', 'hymns_home_church', 1005, 'His Eye Is on the Sparrow', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('37999d12-86d1-49ca-a2a0-4a9cf8a3f41e', 'hymns_home_church', 1006, 'Think a Sacred Song', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f3b754e-812a-4992-b1f4-a05bc5e6b030', 'hymns_home_church', 1007, 'As Bread Is Broken', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('798d07ae-d254-4fb2-a6a7-41d4b79d1ac9', 'hymns_home_church', 1008, 'Bread of Life, Living Water', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9d91adf2-dc90-453c-9bb0-8be10495dc4c', 'hymns_home_church', 1009, 'Gethsemane', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('c9453cb4-19e8-455f-8ddd-5ad2b1856382', 'hymns_home_church', 1010, 'Amazing Grace', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('69dd1d01-9823-473a-aafa-621df2b07176', 'hymns_home_church', 1011, 'Holding Hands Around the World', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('a43578c2-821c-4f89-a4ac-792a22724196', 'hymns_home_church', 1012, 'Anytime, Anywhere', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('bdfec85e-c051-4f64-af70-9b691c209bdb', 'hymns_home_church', 1013, 'God’s Gracious Love', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9e64d00b-6d61-44b1-b75f-fcd05f07a020', 'hymns_home_church', 1014, 'My Shepherd Will Supply My Need', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0d4c0d7c-2166-4c36-a3d2-dea2a786a1af', 'hymns_home_church', 1015, 'Oh, the Deep, Deep Love of Jesus', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('62e05493-99dc-4363-9b98-0712f1f730a5', 'hymns_home_church', 1016, 'Behold the Wounds in Jesus’ Hands', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('98f0ef6b-8212-4cc2-9a59-7064d60b55da', 'hymns_home_church', 1017, 'This Is the Christ', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('9567fa61-19b0-413f-a1ed-cc0a276627d0', 'hymns_home_church', 1018, 'Come, Lord Jesus', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('74f7c0cb-1252-4e72-b9ba-747abd132ed5', 'hymns_home_church', 1019, 'To Love like Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d55ad99d-cf7c-4032-8e4a-41998a94e290', 'hymns_home_church', 1020, 'Softly and Tenderly Jesus Is Calling', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1f9c6242-8125-4f49-926b-84e600fecd73', 'hymns_home_church', 1021, 'I Know That My Savior Loves Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('4f7d084f-0202-4877-8fec-452790d11baf', 'hymns_home_church', 1022, 'Faith in Every Footstep', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('6c99b0af-0b62-4d19-8852-f15320c8b0f0', 'hymns_home_church', 1023, 'Standing on the Promises', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5117877c-569d-43ae-8444-8294756701a3', 'hymns_home_church', 1024, 'I Have Faith in the Lord Jesus Christ', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('029c4cfc-fabc-4085-af46-2df7935fc299', 'hymns_home_church', 1025, 'Take My Heart and Let It Be Consecrated', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('84838462-9c2d-4254-97fd-1d5ff34906e2', 'hymns_home_church', 1026, 'Holy Places', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('18a9f0fb-81ea-46a7-b8bb-d391a08b4826', 'hymns_home_church', 1027, 'Welcome Home', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('42f889b0-f4c0-41cb-8d9b-37579a03bd6f', 'hymns_home_church', 1028, 'This Little Light of Mine', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('17905a92-c08f-4021-9fc3-8b5f93892027', 'hymns_home_church', 1029, 'I Can’t Count Them All', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('df427d04-5758-415f-bf2f-f248f42a18b4', 'hymns_home_church', 1030, 'Close as a Quiet Prayer', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('8fb30796-2f7f-4d91-a793-3de9f320d26c', 'hymns_home_church', 1031, 'Come, Hear the Word the Lord Has Spoken', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('2125aa29-7aa1-4796-ae6e-4bc1523eac89', 'hymns_home_church', 1032, 'Look unto Christ', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b7aa9197-b9bb-4af8-bedf-e4c97a4d14db', 'hymns_home_church', 1033, 'Oh, How Great Is Our Joy', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1fde2d0f-e647-4251-aacb-c1641ddd334c', 'hymns_home_church', 1034, 'I’m a Pioneer Too', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f84553d6-7e74-432f-bdb0-34f3a3e5577c', 'hymns_home_church', 1035, 'As I Keep the Sabbath Day', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e6d9c70d-2857-4cb6-a902-0e769fdb34bb', 'hymns_home_church', 1036, 'Read the Book of Mormon and Pray', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d4968ff0-8926-4201-b6c9-5f110bbf4a33', 'hymns_home_church', 1037, 'I’m Gonna Live So God Can Use Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('974cf001-d5cd-4ed8-b1d0-c896ba6b4f20', 'hymns_home_church', 1038, 'The Lord’s My Shepherd', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('49b4ccf5-3880-465e-95bc-253951d94b6d', 'hymns_home_church', 1039, 'Because', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('b2212889-7364-4735-8f99-fdafaf499aa3', 'hymns_home_church', 1040, 'His Voice as the Sound', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1e0d3d66-ebb4-4dc7-a07f-00b33fd3545a', 'hymns_home_church', 1041, 'O Lord, Who Gave Thy Life for Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('88b43204-0ca9-4a37-a21f-1514fa3af02e', 'hymns_home_church', 1042, 'Thou Gracious God, Whose Mercy Lends', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('21c65ddb-db11-4b42-b8d6-e2a135fde679', 'hymns_home_church', 1043, 'Help Us Remember', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('48fdf79d-63a3-4278-8e6f-864b5732c921', 'hymns_home_church', 1044, 'How Did the Savior Minister?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('82f2327f-8565-414d-b89b-ed85cb774e46', 'hymns_home_church', 1045, 'Jesus Is the Way', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('41826748-fdd3-456d-b881-2c94014aeeae', 'hymns_home_church', 1046, 'Can You Count the Stars in Heaven?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e950f069-a3f0-4dd0-bee7-319e6bcd71d6', 'hymns_home_church', 1047, 'He Cares for Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('f7891e96-9d28-4f5d-8006-c7e49d6ad241', 'hymns_home_church', 1048, 'Our Prayer to Thee', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('5c4f357a-9650-40ee-b587-a66b6e2c4895', 'hymns_home_church', 1049, 'Joseph Prayed in Faith', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('12b4aed1-8a92-4fa9-867f-df8ed666299a', 'hymns_home_church', 1050, 'Stand by Me', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('cb9063c8-cd20-4d67-8a1d-9cf92ae7b040', 'hymns_home_church', 1051, 'This Day Is a Good Day, Lord', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('0563057e-9a3d-48af-8405-b85f93270bbe', 'hymns_home_church', 1201, 'Hail the Day That Sees Him Rise', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('58e817c8-e47f-4972-b46a-cbb5e0b38fb3', 'hymns_home_church', 1202, 'He Is Born, the Divine Christ Child', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('14a6b84f-bc3c-463f-9706-a2c965f05a57', 'hymns_home_church', 1203, 'What Child Is This?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('77b8cd7a-f7cd-4d48-9225-f0f853be308b', 'hymns_home_church', 1204, 'Star Bright', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('33fa6ba9-91bd-4b21-be4c-30b6e46e11b6', 'hymns_home_church', 1205, 'Let Easter Anthems Ring', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('d2faab80-8a26-45ee-b73d-114cdda6d2c0', 'hymns_home_church', 1206, 'Were You There?', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('577f506e-1845-4be2-b1f4-9e6b7569a8be', 'hymns_home_church', 1207, 'Still, Still, Still', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('1cfac36e-595b-482c-aa4b-74910786f73e', 'hymns_home_church', 1208, 'Go Tell It on the Mountain', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.hymns VALUES ('e412133f-a4b9-4825-9e22-171860c83b67', 'hymns_home_church', 1209, 'Little Baby in a Manger', NULL, '2026-01-13 18:02:52.790349+00');
INSERT INTO public.procedural_item_types VALUES ('global_discussions', 'Discussions', 'Council discussions and deliberations', 15, 40, false, false, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', false, 'MessageSquare', false, false, false, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('global_business', 'Ward Business', 'Sustainings, releases, and other ward business', 10, 50, false, false, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', false, 'Briefcase', false, false, false, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('global_announcements', 'Announcements', 'Ward announcements and upcoming events', 5, 60, false, false, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', false, 'Megaphone', false, false, false, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('global_prayer', 'Prayer', 'Assign someone to offer a prayer', 2, 20, false, false, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', true, 'BookOpen', false, true, false, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('global_speaker', 'Speaker', 'Assign a speaker to give a talk', 10, 30, false, false, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', true, 'Mic', false, true, false, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('global_hymn', 'Hymn', 'Select a hymn from the hymnbook', 3, 10, false, true, NULL, '2026-01-24 02:50:35.026799+00', NULL, 'other', false, 'Music', false, false, true, false, false, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-prayer', 'Prayer', 'Opening or closing prayer', 3, 10, false, false, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, true, false, false, true, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-speaker', 'Speaker', 'Meeting speaker with topic', 10, 20, false, false, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, true, false, true, true, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-hymn', 'Hymn', 'Congregational hymn', 4, 30, false, true, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, false, true, false, true, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-discussions', 'Discussions', 'Container for discussion items', 15, 40, false, false, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, false, false, false, true, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-ward-business', 'Ward Business', 'Container for ward business items', 10, 50, false, false, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, false, false, false, true, NULL);
INSERT INTO public.procedural_item_types VALUES ('core-announcements', 'Announcements', 'Container for announcements', 5, 60, false, false, NULL, '2026-02-02 00:52:50.539624+00', NULL, 'other', false, 'BookOpen', false, false, false, false, true, NULL);

-- ============================================
-- STORAGE BUCKET CONFIGURATION
-- ============================================

-- Storage bucket for event invitations (Canva exports)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-invitations',
  'event-invitations',
  true,
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;
