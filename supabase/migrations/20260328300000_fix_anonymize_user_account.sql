-- Fix anonymize_user_account: remove reference to non-existent oauth_tokens table
CREATE OR REPLACE FUNCTION public.anonymize_user_account(target_user_id uuid) RETURNS jsonb
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
    full_name = 'Former User',
    email = v_anonymized_email,
    role_title = NULL,
    feature_interests = NULL,
    workspace_id = NULL,
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
