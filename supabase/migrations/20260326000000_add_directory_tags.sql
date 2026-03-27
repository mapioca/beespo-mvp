-- Create directory_tags table
CREATE TABLE public.directory_tags (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name         text NOT NULL,
    color        text NOT NULL DEFAULT '#6366f1',
    created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   timestamptz DEFAULT now() NOT NULL,
    updated_at   timestamptz DEFAULT now() NOT NULL,
    UNIQUE (workspace_id, name)
);

CREATE INDEX idx_directory_tags_workspace ON public.directory_tags(workspace_id);

CREATE TRIGGER set_directory_tags_updated_at
    BEFORE UPDATE ON public.directory_tags FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.directory_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for directory_tags
CREATE POLICY "Users can view directory tags in their workspace"
    ON public.directory_tags FOR SELECT USING (workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can create directory tags"
    ON public.directory_tags FOR INSERT
    WITH CHECK (public.get_auth_role() = ANY (ARRAY['admin','leader']) AND workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can update directory tags"
    ON public.directory_tags FOR UPDATE
    USING (public.get_auth_role() = ANY (ARRAY['admin','leader']) AND workspace_id = public.get_auth_workspace_id());

CREATE POLICY "Leaders and admins can delete directory tags"
    ON public.directory_tags FOR DELETE
    USING (public.get_auth_role() = ANY (ARRAY['admin','leader']) AND workspace_id = public.get_auth_workspace_id());

-- Create directory_tag_assignments table
CREATE TABLE public.directory_tag_assignments (
    id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    directory_id uuid NOT NULL REFERENCES public.directory(id) ON DELETE CASCADE,
    tag_id       uuid NOT NULL REFERENCES public.directory_tags(id) ON DELETE CASCADE,
    created_at   timestamptz DEFAULT now() NOT NULL,
    UNIQUE (directory_id, tag_id)
);

CREATE INDEX idx_dir_tag_assignments_directory ON public.directory_tag_assignments(directory_id);
CREATE INDEX idx_dir_tag_assignments_tag       ON public.directory_tag_assignments(tag_id);

ALTER TABLE public.directory_tag_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for directory_tag_assignments
CREATE POLICY "Users can view directory tag assignments in their workspace"
    ON public.directory_tag_assignments FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.directory_tags dt WHERE dt.id = tag_id AND dt.workspace_id = public.get_auth_workspace_id()));

CREATE POLICY "Leaders and admins can assign directory tags"
    ON public.directory_tag_assignments FOR INSERT
    WITH CHECK (
        public.get_auth_role() = ANY (ARRAY['admin','leader'])
        AND EXISTS (SELECT 1 FROM public.directory_tags dt WHERE dt.id = tag_id AND dt.workspace_id = public.get_auth_workspace_id())
        AND EXISTS (SELECT 1 FROM public.directory d WHERE d.id = directory_id AND d.workspace_id = public.get_auth_workspace_id())
    );

CREATE POLICY "Leaders and admins can remove directory tag assignments"
    ON public.directory_tag_assignments FOR DELETE
    USING (
        public.get_auth_role() = ANY (ARRAY['admin','leader'])
        AND EXISTS (SELECT 1 FROM public.directory_tags dt WHERE dt.id = tag_id AND dt.workspace_id = public.get_auth_workspace_id())
    );
