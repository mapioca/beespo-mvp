CREATE TABLE IF NOT EXISTS public.user_favorites (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('meeting', 'table', 'form', 'discussion', 'notebook', 'note')),
  entity_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  parent_title TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS public.user_recent_items (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('meeting', 'table', 'form', 'discussion', 'notebook', 'note')),
  entity_id UUID NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  parent_title TEXT,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_workspace_position
  ON public.user_favorites (user_id, workspace_id, position, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_recent_items_user_workspace_last_viewed
  ON public.user_recent_items (user_id, workspace_id, last_viewed_at DESC);

CREATE TRIGGER set_user_favorites_updated_at
  BEFORE UPDATE ON public.user_favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_favorites"
  ON public.user_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_favorites"
  ON public.user_favorites FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "users_update_own_favorites"
  ON public.user_favorites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "users_delete_own_favorites"
  ON public.user_favorites FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "users_select_own_recent_items"
  ON public.user_recent_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_recent_items"
  ON public.user_recent_items FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "users_update_own_recent_items"
  ON public.user_recent_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "users_delete_own_recent_items"
  ON public.user_recent_items FOR DELETE
  USING (auth.uid() = user_id);
