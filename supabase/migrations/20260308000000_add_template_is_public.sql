-- ─────────────────────────────────────────────────────────────────────────────
-- Templates: add is_public, drop is_shared
--
-- BEFORE this migration the column is_shared was the only way to mark a
-- template as "Beespo Official".  The distinction between official and
-- community-published templates was ambiguous because both could technically
-- set is_shared = true.
--
-- AFTER this migration the semantics are unambiguous and rely solely on
-- workspace_id:
--
--   workspace_id IS NULL                           → Beespo Official
--   workspace_id IS NOT NULL AND is_public = true  → Community Gallery
--   workspace_id IS NOT NULL AND is_public = false → Private workspace
--
-- is_shared is fully superseded by (workspace_id IS NULL) for the
-- "official" concept, and by is_public for the "shared" concept.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add is_public ─────────────────────────────────────────────────────────
ALTER TABLE public.templates
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- ── 2. Drop ALL existing RLS policies on templates that reference is_shared ──
--       (we will recreate them correctly below)
DROP POLICY IF EXISTS "Users can view templates in their workspace or shared templates" ON public.templates;
DROP POLICY IF EXISTS "Leaders and admins can update templates"                         ON public.templates;
DROP POLICY IF EXISTS "Users can view templates"                                        ON public.templates;
DROP POLICY IF EXISTS "Authenticated users can view shared templates"                   ON public.templates;
DROP POLICY IF EXISTS "Users can view own workspace templates"                          ON public.templates;
DROP POLICY IF EXISTS "Users can view accessible templates"                             ON public.templates;

-- ── 3. Drop the template_items SELECT policy that references is_shared ───────
DROP POLICY IF EXISTS "Users can view template items for accessible templates" ON public.template_items;

-- ── 4. Recreate: templates SELECT ────────────────────────────────────────────
--    Beespo Official  (workspace_id IS NULL)  → visible to all authenticated users
--    Community        (is_public = true)       → visible to all authenticated users
--    Own workspace                             → visible to workspace members only
CREATE POLICY "Users can view accessible templates"
ON public.templates
FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND (
        workspace_id IS NULL
        OR is_public = true
        OR workspace_id = (
            SELECT profiles.workspace_id
            FROM profiles
            WHERE profiles.id = auth.uid()
        )
    )
);

-- ── 5. Recreate: templates UPDATE ────────────────────────────────────────────
--    Only workspace admins/leaders can update templates they own.
--    Beespo Official (workspace_id IS NULL) cannot be updated by workspace users.
CREATE POLICY "Leaders and admins can update templates"
ON public.templates
FOR UPDATE
USING (
    workspace_id IS NOT NULL
    AND workspace_id = (
        SELECT profiles.workspace_id
        FROM profiles
        WHERE profiles.id = auth.uid()
    )
    AND (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
)
WITH CHECK (
    workspace_id IS NOT NULL
    AND workspace_id = (
        SELECT profiles.workspace_id
        FROM profiles
        WHERE profiles.id = auth.uid()
    )
    AND (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
);

-- ── 6. Recreate: template_items SELECT ───────────────────────────────────────
--    A user can read items if they can read the parent template.
CREATE POLICY "Users can view template items for accessible templates"
ON public.template_items
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.templates
        WHERE templates.id = template_items.template_id
          AND (
              templates.workspace_id IS NULL
              OR templates.is_public = true
              OR templates.workspace_id = (
                  SELECT profiles.workspace_id
                  FROM profiles
                  WHERE profiles.id = auth.uid()
              )
          )
    )
);

-- ── 7. Drop the index on is_shared (no longer needed) ────────────────────────
DROP INDEX IF EXISTS public.idx_templates_shared;

-- ── 8. Drop is_shared column ─────────────────────────────────────────────────
ALTER TABLE public.templates DROP COLUMN IF EXISTS is_shared;

-- ── 9. Add index on is_public for library query performance ──────────────────
CREATE INDEX IF NOT EXISTS idx_templates_is_public ON public.templates (is_public)
    WHERE is_public = true;
