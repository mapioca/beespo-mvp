DROP POLICY IF EXISTS "Leaders and admins can manage conduct script templates"
  ON public.conduct_script_templates;

CREATE POLICY "Editors can manage conduct script templates"
  ON public.conduct_script_templates FOR ALL
  USING (
    public.get_auth_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  );

DROP POLICY IF EXISTS "Leaders and admins can manage business meeting scripts"
  ON public.business_meeting_scripts;

CREATE POLICY "Editors can manage business meeting scripts"
  ON public.business_meeting_scripts FOR ALL
  USING (
    public.get_auth_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  )
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['owner'::text, 'admin'::text, 'editor'::text])
    AND public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  );
