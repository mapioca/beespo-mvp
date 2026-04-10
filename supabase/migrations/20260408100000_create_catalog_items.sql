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
  COALESCE(pit.category, 'other'),
  pit.default_duration_minutes,
  pit.icon,
  COALESCE(pit.is_core, false),
  COALESCE(pit.is_custom, false),
  COALESCE(pit.is_hymn, false),
  COALESCE(pit.requires_assignee, false),
  COALESCE(pit.has_rich_text, false),
  pit.order_hint,
  COALESCE(pit.is_deprecated, false)
FROM public.procedural_item_types pit
WHERE NOT EXISTS (
  SELECT 1
  FROM public.catalog_items ci
  WHERE ci.workspace_id IS NOT DISTINCT FROM pit.workspace_id
    AND ci.name = pit.name
);
