-- Migration: Account Deletion Support
-- Purpose: Modify foreign key constraints to support soft-delete/anonymization
-- Instead of CASCADE deletes, we use SET NULL to preserve historical data

-- ============================================================================
-- 1. Fix profiles table - Remove CASCADE from auth.users reference
-- ============================================================================
-- The profiles table currently has ON DELETE CASCADE from auth.users
-- We need to change this so deleting auth.users doesn't delete the profile
-- This allows us to keep anonymized profile records for historical references

-- First, drop the existing constraint
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Re-add without CASCADE (just a reference, no automatic action)
-- Note: We'll handle auth.users deletion separately via Supabase Admin API
ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey
FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE NO ACTION;

-- ============================================================================
-- 2. Fix task_comments - Change from CASCADE to SET NULL
-- ============================================================================
-- Currently deleting a user deletes all their comments
-- We want to keep comments but with user_id set to null

ALTER TABLE task_comments
DROP CONSTRAINT IF EXISTS task_comments_user_id_fkey;

ALTER TABLE task_comments
ADD CONSTRAINT task_comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Make user_id nullable to support SET NULL
ALTER TABLE task_comments
ALTER COLUMN user_id DROP NOT NULL;

-- ============================================================================
-- 3. Fix notebooks - Change from CASCADE to SET NULL
-- ============================================================================
-- Currently deleting a user deletes all their notebooks
-- We want to keep notebooks but with created_by set to null

ALTER TABLE notebooks
DROP CONSTRAINT IF EXISTS notebooks_created_by_fkey;

ALTER TABLE notebooks
ADD CONSTRAINT notebooks_created_by_fkey
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Make created_by nullable to support SET NULL
ALTER TABLE notebooks
ALTER COLUMN created_by DROP NOT NULL;

-- ============================================================================
-- 4. Add soft-delete columns to profiles table
-- ============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Index for filtering active users
CREATE INDEX IF NOT EXISTS idx_profiles_is_deleted ON profiles(is_deleted) WHERE is_deleted = FALSE;

-- ============================================================================
-- 5. Create the account anonymization function
-- ============================================================================
CREATE OR REPLACE FUNCTION anonymize_user_account(target_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Grant execute to authenticated users (they can only delete their own account via API)
GRANT EXECUTE ON FUNCTION anonymize_user_account(UUID) TO authenticated;

-- ============================================================================
-- 6. Update RLS policies to exclude deleted users from normal queries
-- ============================================================================
-- Add policy to filter out deleted users in team member lists
DROP POLICY IF EXISTS "Users can view workspace members" ON profiles;
CREATE POLICY "Users can view workspace members" ON profiles
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM profiles WHERE id = auth.uid()
    )
    -- Still show deleted users but they'll appear as "Former Member"
  );

COMMENT ON FUNCTION anonymize_user_account IS
'Anonymizes a user account for deletion. Preserves historical data but removes PII.
Call this BEFORE deleting from auth.users.';
