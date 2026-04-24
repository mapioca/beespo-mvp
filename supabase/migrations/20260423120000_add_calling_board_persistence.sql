-- Persist the callings board layer separately from the lifecycle pipeline.

CREATE TABLE IF NOT EXISTS public.calling_vacancies (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    calling_id uuid NOT NULL REFERENCES public.callings(id) ON DELETE CASCADE,
    notes text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calling_vacancies_workspace_calling_key UNIQUE (workspace_id, calling_id)
);

CREATE TABLE IF NOT EXISTS public.calling_considerations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    directory_id uuid,
    candidate_name_id uuid NOT NULL REFERENCES public.candidate_names(id) ON DELETE CASCADE,
    member_name text NOT NULL,
    notes text,
    created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calling_considerations_workspace_candidate_key UNIQUE (workspace_id, candidate_name_id)
);

CREATE TABLE IF NOT EXISTS public.calling_consideration_options (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    consideration_id uuid NOT NULL REFERENCES public.calling_considerations(id) ON DELETE CASCADE,
    calling_candidate_id uuid NOT NULL REFERENCES public.calling_candidates(id) ON DELETE CASCADE,
    calling_process_id uuid REFERENCES public.calling_processes(id) ON DELETE SET NULL,
    status text DEFAULT 'possible'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT calling_consideration_options_status_check CHECK (status = ANY (ARRAY['possible'::text, 'in_pipeline'::text])),
    CONSTRAINT calling_consideration_options_unique_candidate UNIQUE (consideration_id, calling_candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_calling_vacancies_workspace ON public.calling_vacancies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calling_vacancies_calling ON public.calling_vacancies(calling_id);
CREATE INDEX IF NOT EXISTS idx_calling_considerations_workspace ON public.calling_considerations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calling_considerations_candidate ON public.calling_considerations(candidate_name_id);
CREATE INDEX IF NOT EXISTS idx_calling_consideration_options_consideration ON public.calling_consideration_options(consideration_id);
CREATE INDEX IF NOT EXISTS idx_calling_consideration_options_candidate ON public.calling_consideration_options(calling_candidate_id);

CREATE TRIGGER update_calling_vacancies_updated_at
    BEFORE UPDATE ON public.calling_vacancies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calling_considerations_updated_at
    BEFORE UPDATE ON public.calling_considerations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calling_consideration_options_updated_at
    BEFORE UPDATE ON public.calling_consideration_options
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.calling_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_considerations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_consideration_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view calling vacancies in their workspace"
    ON public.calling_vacancies FOR SELECT
    USING (workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Leaders and admins can create calling vacancies"
    ON public.calling_vacancies FOR INSERT
    WITH CHECK (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can update calling vacancies"
    ON public.calling_vacancies FOR UPDATE
    USING (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can delete calling vacancies"
    ON public.calling_vacancies FOR DELETE
    USING (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Users can view calling considerations in their workspace"
    ON public.calling_considerations FOR SELECT
    USING (workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Leaders and admins can create calling considerations"
    ON public.calling_considerations FOR INSERT
    WITH CHECK (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can update calling considerations"
    ON public.calling_considerations FOR UPDATE
    USING (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can delete calling considerations"
    ON public.calling_considerations FOR DELETE
    USING (
        workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Users can view calling consideration options in their workspace"
    ON public.calling_consideration_options FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM public.calling_considerations cmc
            WHERE cmc.id = calling_consideration_options.consideration_id
            AND cmc.workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        )
    );

CREATE POLICY "Leaders and admins can create calling consideration options"
    ON public.calling_consideration_options FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.calling_considerations cmc
            WHERE cmc.id = calling_consideration_options.consideration_id
            AND cmc.workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        )
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can update calling consideration options"
    ON public.calling_consideration_options FOR UPDATE
    USING (
        EXISTS (
            SELECT 1
            FROM public.calling_considerations cmc
            WHERE cmc.id = calling_consideration_options.consideration_id
            AND cmc.workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        )
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );

CREATE POLICY "Leaders and admins can delete calling consideration options"
    ON public.calling_consideration_options FOR DELETE
    USING (
        EXISTS (
            SELECT 1
            FROM public.calling_considerations cmc
            WHERE cmc.id = calling_consideration_options.consideration_id
            AND cmc.workspace_id = (SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid())
        )
        AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) = ANY (ARRAY['admin'::text, 'leader'::text])
    );
