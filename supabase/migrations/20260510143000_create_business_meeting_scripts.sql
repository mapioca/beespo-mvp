ALTER TABLE public.conduct_script_templates
  DROP CONSTRAINT IF EXISTS conduct_script_templates_key_check;

ALTER TABLE public.conduct_script_templates
  ADD CONSTRAINT conduct_script_templates_key_check
  CHECK (
    script_key = ANY (
      ARRAY[
        'welcome'::text,
        'sacrament-preparation'::text,
        'ward-business.sustaining'::text,
        'ward-business.sustaining_multiple'::text,
        'ward-business.release'::text,
        'ward-business.release_multiple'::text,
        'ward-business.ordination'::text,
        'ward-business.confirmation_ordinance'::text,
        'ward-business.new_member_welcome'::text,
        'ward-business.child_blessing'::text,
        'ward-business.records_received'::text,
        'ward-business.records_received_multiple'::text,
        'ward-business.miscellaneous'::text
      ]
    )
  );

CREATE TABLE IF NOT EXISTS public.business_meeting_scripts (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  meeting_date date NOT NULL,
  script_key text NOT NULL,
  template_snapshot text NOT NULL,
  rendered_script text NOT NULL,
  business_item_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  is_custom boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT business_meeting_scripts_key_check CHECK (
    script_key = ANY (
      ARRAY[
        'ward-business.sustaining'::text,
        'ward-business.sustaining_multiple'::text,
        'ward-business.release'::text,
        'ward-business.release_multiple'::text,
        'ward-business.ordination'::text,
        'ward-business.confirmation_ordinance'::text,
        'ward-business.new_member_welcome'::text,
        'ward-business.child_blessing'::text,
        'ward-business.records_received'::text,
        'ward-business.records_received_multiple'::text,
        'ward-business.miscellaneous'::text
      ]
    )
  ),
  CONSTRAINT business_meeting_scripts_unique_key UNIQUE (workspace_id, meeting_date, script_key)
);

CREATE INDEX IF NOT EXISTS idx_business_meeting_scripts_workspace_date
  ON public.business_meeting_scripts(workspace_id, meeting_date);

DROP TRIGGER IF EXISTS update_business_meeting_scripts_updated_at ON public.business_meeting_scripts;
CREATE TRIGGER update_business_meeting_scripts_updated_at
  BEFORE UPDATE ON public.business_meeting_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.business_meeting_scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view business meeting scripts in their workspace"
  ON public.business_meeting_scripts FOR SELECT
  USING (
    public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can manage business meeting scripts"
  ON public.business_meeting_scripts FOR ALL
  USING (
    public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin'::text, 'leader'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  );
