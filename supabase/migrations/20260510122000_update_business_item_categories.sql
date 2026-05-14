ALTER TABLE public.business_items
  DROP CONSTRAINT IF EXISTS business_items_category_check;

UPDATE public.business_items
SET category = CASE category
  WHEN 'confirmation' THEN 'new_member_welcome'
  WHEN 'setting_apart' THEN 'sustaining'
  WHEN 'other' THEN 'miscellaneous'
  ELSE category
END
WHERE category IN ('confirmation', 'setting_apart', 'other');

ALTER TABLE public.business_items
  ADD CONSTRAINT business_items_category_check
  CHECK (
    category = ANY (
      ARRAY[
        'sustaining'::text,
        'release'::text,
        'ordination'::text,
        'confirmation_ordinance'::text,
        'new_member_welcome'::text,
        'child_blessing'::text,
        'records_received'::text,
        'miscellaneous'::text
      ]
    )
  );

COMMENT ON COLUMN public.business_items.details IS
  'Structured metadata for conducting transition scripts. Schema varies by category: ordination uses office/priesthood, sustainings/releases use position_calling, confirmations and welcomes use dates/pronouns, child blessings use childName/voiceName, and miscellaneous uses customText.';

CREATE TABLE IF NOT EXISTS public.conduct_script_templates (
  id uuid DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  script_key text NOT NULL,
  language text NOT NULL CHECK (language = ANY (ARRAY['ENG'::text, 'SPA'::text])),
  template text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT conduct_script_templates_key_check CHECK (
    script_key = ANY (
      ARRAY[
        'welcome'::text,
        'sacrament-preparation'::text,
        'ward-business.sustaining'::text,
        'ward-business.release'::text,
        'ward-business.ordination'::text,
        'ward-business.confirmation_ordinance'::text,
        'ward-business.new_member_welcome'::text,
        'ward-business.child_blessing'::text,
        'ward-business.records_received'::text,
        'ward-business.miscellaneous'::text
      ]
    )
  ),
  CONSTRAINT conduct_script_templates_unique_key UNIQUE (workspace_id, script_key, language)
);

CREATE INDEX IF NOT EXISTS idx_conduct_script_templates_workspace
  ON public.conduct_script_templates(workspace_id, language);

DROP TRIGGER IF EXISTS update_conduct_script_templates_updated_at ON public.conduct_script_templates;
CREATE TRIGGER update_conduct_script_templates_updated_at
  BEFORE UPDATE ON public.conduct_script_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.conduct_script_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conduct script templates in their workspace"
  ON public.conduct_script_templates FOR SELECT
  USING (
    public.get_auth_workspace_id() IS NOT NULL
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can manage conduct script templates"
  ON public.conduct_script_templates FOR ALL
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
