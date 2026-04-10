CREATE TABLE public.catalog_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'other',
  default_duration_minutes integer DEFAULT 5,
  icon text,
  is_core boolean DEFAULT false,
  is_custom boolean DEFAULT false,
  is_hymn boolean DEFAULT false,
  hymn_number integer,
  requires_assignee boolean DEFAULT false,
  has_rich_text boolean DEFAULT false,
  order_hint integer,
  is_deprecated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_catalog_items_workspace ON public.catalog_items(workspace_id);
CREATE INDEX idx_catalog_items_category ON public.catalog_items(category);
CREATE INDEX idx_catalog_items_active ON public.catalog_items(is_deprecated) WHERE is_deprecated = false;

CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view catalog items in their workspace or global"
  ON public.catalog_items
  FOR SELECT
  USING (
    workspace_id IS NULL
    OR workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can create workspace catalog items"
  ON public.catalog_items
  FOR INSERT
  WITH CHECK (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can update workspace catalog items"
  ON public.catalog_items
  FOR UPDATE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );

CREATE POLICY "Leaders and admins can delete workspace catalog items"
  ON public.catalog_items
  FOR DELETE
  USING (
    public.get_auth_role() = ANY (ARRAY['admin', 'leader'])
    AND workspace_id = public.get_auth_workspace_id()
  );

DO $$
DECLARE
  has_category boolean;
  has_icon boolean;
  has_is_core boolean;
  has_is_custom boolean;
  has_is_hymn boolean;
  has_requires_assignee boolean;
  has_has_rich_text boolean;
  has_is_deprecated boolean;
  sql text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'category'
  ) INTO has_category;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'icon'
  ) INTO has_icon;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'is_core'
  ) INTO has_is_core;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'is_custom'
  ) INTO has_is_custom;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'is_hymn'
  ) INTO has_is_hymn;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'requires_assignee'
  ) INTO has_requires_assignee;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'has_rich_text'
  ) INTO has_has_rich_text;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'procedural_item_types' AND column_name = 'is_deprecated'
  ) INTO has_is_deprecated;

  sql := format($fmt$
    INSERT INTO public.catalog_items (
      workspace_id,
      name,
      description,
      category,
      default_duration_minutes,
      icon,
      is_core,
      is_custom,
      is_hymn,
      requires_assignee,
      has_rich_text,
      order_hint,
      is_deprecated
    )
    SELECT
      pit.workspace_id,
      pit.name,
      pit.description,
      %s,
      pit.default_duration_minutes,
      %s,
      %s,
      %s,
      %s,
      %s,
      %s,
      pit.order_hint,
      %s
    FROM public.procedural_item_types pit
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.catalog_items ci
      WHERE ci.workspace_id IS NOT DISTINCT FROM pit.workspace_id
        AND ci.name = pit.name
    )
  $fmt$,
    CASE WHEN has_category THEN 'COALESCE(pit.category, ''other'')' ELSE '''other''' END,
    CASE WHEN has_icon THEN 'pit.icon' ELSE 'NULL' END,
    CASE WHEN has_is_core THEN 'COALESCE(pit.is_core, false)' ELSE 'false' END,
    CASE WHEN has_is_custom THEN 'COALESCE(pit.is_custom, false)' ELSE 'false' END,
    CASE WHEN has_is_hymn THEN 'COALESCE(pit.is_hymn, false)' ELSE 'false' END,
    CASE WHEN has_requires_assignee THEN 'COALESCE(pit.requires_assignee, false)' ELSE 'false' END,
    CASE WHEN has_has_rich_text THEN 'COALESCE(pit.has_rich_text, false)' ELSE 'false' END,
    CASE WHEN has_is_deprecated THEN 'COALESCE(pit.is_deprecated, false)' ELSE 'false' END
  );

  EXECUTE sql;
END $$;
