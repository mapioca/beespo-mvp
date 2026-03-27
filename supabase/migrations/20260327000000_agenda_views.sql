-- Create agenda_views table
-- Stores user-created filtered views for the Agendas page, scoped per workspace.
-- Any workspace member can see views created within their workspace.

CREATE TABLE public.agenda_views (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    name         text NOT NULL,
    -- filters stores filter criteria as JSONB:
    -- {
    --   "category":    "mine" | "shared" | "all",
    --   "statuses":    string[],       -- e.g. ["scheduled","in_progress"]
    --   "templateIds": string[],       -- array of template UUIDs, or ["no-template"]
    --   "hasZoom":     boolean
    -- }
    filters      jsonb NOT NULL DEFAULT '{}',
    created_at   timestamptz DEFAULT now() NOT NULL,
    updated_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_agenda_views_workspace ON public.agenda_views(workspace_id);
CREATE INDEX idx_agenda_views_created_by ON public.agenda_views(created_by);

CREATE TRIGGER set_agenda_views_updated_at
    BEFORE UPDATE ON public.agenda_views FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.agenda_views ENABLE ROW LEVEL SECURITY;

-- Any workspace member can see views from their workspace
CREATE POLICY "Workspace members can view agenda views"
    ON public.agenda_views FOR SELECT
    USING (workspace_id = public.get_auth_workspace_id());

-- Any workspace member can create views (scoped to their own workspace)
CREATE POLICY "Workspace members can create agenda views"
    ON public.agenda_views FOR INSERT
    WITH CHECK (
        workspace_id = public.get_auth_workspace_id()
        AND created_by = auth.uid()
    );

-- Creators, leaders, and admins can delete views
CREATE POLICY "Creators and leaders can delete agenda views"
    ON public.agenda_views FOR DELETE
    USING (
        created_by = auth.uid()
        OR public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    );
