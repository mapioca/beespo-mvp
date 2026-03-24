-- ============================================================
-- Sharing Groups Migration
-- Creates workspace-level sharing groups, individual share
-- records, and an audit trail for all sharing activity.
-- ============================================================

-- ============================================================
-- 1. sharing_groups
-- Workspace-level named groups of email addresses
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sharing_groups (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  updated_at  timestamptz DEFAULT now() NOT NULL,
  UNIQUE (workspace_id, name)
);

CREATE INDEX idx_sharing_groups_workspace ON public.sharing_groups(workspace_id);

ALTER TABLE public.sharing_groups ENABLE ROW LEVEL SECURITY;

-- Any workspace member can view groups
CREATE POLICY "Workspace members can view sharing groups"
  ON public.sharing_groups FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

-- Admins and leaders can create groups
CREATE POLICY "Leaders and admins can create sharing groups"
  ON public.sharing_groups FOR INSERT
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );

-- Admins and leaders can update groups in their workspace
CREATE POLICY "Leaders and admins can update sharing groups"
  ON public.sharing_groups FOR UPDATE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );

-- Admins and leaders can delete groups in their workspace
CREATE POLICY "Leaders and admins can delete sharing groups"
  ON public.sharing_groups FOR DELETE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );


-- ============================================================
-- 2. sharing_group_members
-- Email-based group membership
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sharing_group_members (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.sharing_groups(id) ON DELETE CASCADE,
  email    text NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (group_id, email)
);

CREATE INDEX idx_sharing_group_members_group ON public.sharing_group_members(group_id);
CREATE INDEX idx_sharing_group_members_email ON public.sharing_group_members(email);

ALTER TABLE public.sharing_group_members ENABLE ROW LEVEL SECURITY;

-- Workspace members can view group members (join through sharing_groups)
CREATE POLICY "Workspace members can view sharing group members"
  ON public.sharing_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sharing_groups sg
      WHERE sg.id = group_id
        AND sg.workspace_id = public.get_auth_workspace_id()
    )
  );

-- Admins and leaders can add members
CREATE POLICY "Leaders and admins can add sharing group members"
  ON public.sharing_group_members FOR INSERT
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1 FROM public.sharing_groups sg
      WHERE sg.id = group_id
        AND sg.workspace_id = public.get_auth_workspace_id()
    )
  );

-- Admins and leaders can remove members
CREATE POLICY "Leaders and admins can delete sharing group members"
  ON public.sharing_group_members FOR DELETE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1 FROM public.sharing_groups sg
      WHERE sg.id = group_id
        AND sg.workspace_id = public.get_auth_workspace_id()
    )
  );


-- ============================================================
-- 3. meeting_shares
-- Individual share records — source of truth for access control.
-- One record per (meeting_id, recipient_email) pair.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.meeting_shares (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id        uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  recipient_email   text NOT NULL,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  permission        text NOT NULL CHECK (permission IN ('viewer', 'editor')),
  shared_by         uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  sharing_group_id  uuid REFERENCES public.sharing_groups(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  token             uuid DEFAULT gen_random_uuid() NOT NULL,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  UNIQUE (meeting_id, recipient_email)
);

CREATE INDEX idx_meeting_shares_meeting      ON public.meeting_shares(meeting_id);
CREATE INDEX idx_meeting_shares_recipient    ON public.meeting_shares(recipient_user_id);
CREATE INDEX idx_meeting_shares_email        ON public.meeting_shares(recipient_email);
CREATE INDEX idx_meeting_shares_group        ON public.meeting_shares(sharing_group_id);
CREATE INDEX idx_meeting_shares_token        ON public.meeting_shares(token);
CREATE INDEX idx_meeting_shares_status       ON public.meeting_shares(status);

ALTER TABLE public.meeting_shares ENABLE ROW LEVEL SECURITY;

-- Workspace members can view shares for meetings in their workspace
CREATE POLICY "Workspace members can view meeting shares"
  ON public.meeting_shares FOR SELECT
  USING (
    -- Sharer's workspace owns the meeting
    EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND m.workspace_id = public.get_auth_workspace_id()
    )
    OR
    -- Recipient viewing their own active shares
    recipient_user_id = auth.uid()
  );

-- Leaders and admins can create shares for their workspace's meetings
CREATE POLICY "Leaders and admins can create meeting shares"
  ON public.meeting_shares FOR INSERT
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND m.workspace_id = public.get_auth_workspace_id()
    )
  );

-- Leaders and admins can update shares (e.g. revoke) for their workspace's meetings
CREATE POLICY "Leaders and admins can update meeting shares"
  ON public.meeting_shares FOR UPDATE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND EXISTS (
      SELECT 1 FROM public.meetings m
      WHERE m.id = meeting_id
        AND m.workspace_id = public.get_auth_workspace_id()
    )
  );

-- Anyone can read a share by token (for external access)
CREATE POLICY "Anyone can view meeting share by token"
  ON public.meeting_shares FOR SELECT
  USING (token IS NOT NULL);


-- ============================================================
-- 4. share_activity_log
-- Audit trail for all sharing-related actions.
-- Extensible entity_type supports future sharing of forms, tables, etc.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.share_activity_log (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id     uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  action           text NOT NULL CHECK (action IN (
                     'shared', 'revoked',
                     'group_created', 'group_updated',
                     'member_added', 'member_removed'
                   )),
  entity_type      text NOT NULL DEFAULT 'meeting', -- future: 'form', 'table'
  entity_id        uuid,
  target_email     text,
  sharing_group_id uuid REFERENCES public.sharing_groups(id) ON DELETE SET NULL,
  performed_by     uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  details          jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_share_activity_workspace  ON public.share_activity_log(workspace_id);
CREATE INDEX idx_share_activity_entity     ON public.share_activity_log(entity_id);
CREATE INDEX idx_share_activity_group      ON public.share_activity_log(sharing_group_id);
CREATE INDEX idx_share_activity_created    ON public.share_activity_log(created_at DESC);

ALTER TABLE public.share_activity_log ENABLE ROW LEVEL SECURITY;

-- Workspace members can view the log for their workspace
CREATE POLICY "Workspace members can view share activity log"
  ON public.share_activity_log FOR SELECT
  USING (workspace_id = public.get_auth_workspace_id());

-- Leaders and admins can insert log entries
CREATE POLICY "Leaders and admins can insert share activity log"
  ON public.share_activity_log FOR INSERT
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );


-- ============================================================
-- 5. RPC: link_shares_to_new_user
-- Called after signup to backfill recipient_user_id on any
-- existing meeting_shares whose recipient_email matches.
-- ============================================================
CREATE OR REPLACE FUNCTION public.link_shares_to_new_user(
  p_user_id    uuid,
  p_user_email text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE public.meeting_shares
  SET
    recipient_user_id = p_user_id,
    updated_at = now()
  WHERE
    lower(recipient_email) = lower(p_user_email)
    AND recipient_user_id IS NULL
    AND status = 'active';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;
