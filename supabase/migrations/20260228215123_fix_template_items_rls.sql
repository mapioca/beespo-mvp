-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: template_items RLS — allow workspace leaders/admins to manage items
--      on templates they personally created (covers shared/system templates
--      where workspace_id IS NULL but created_by = the user).
--
-- Root cause: the existing "Leaders and admins can manage template items"
-- ALL-policy checks `templates.workspace_id = user's workspace_id`.
-- System/shared templates have workspace_id = NULL, so that equality fails
-- even for the original creator. This migration replaces the generic ALL
-- policy with explicit INSERT and DELETE policies that also accept ownership
-- via created_by = auth.uid().
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop the existing ALL-command manage policy (we replace it below)
DROP POLICY IF EXISTS "Leaders and admins can manage template items" ON public.template_items;

-- 2. SELECT — keep using the existing SELECT policy; no change needed.

-- 3. INSERT — allow admins/leaders to insert items for templates they own
--    (either same workspace OR they created it)
CREATE POLICY "Leaders and admins can insert template items"
ON public.template_items
FOR INSERT
WITH CHECK (
    (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
    AND EXISTS (
        SELECT 1
        FROM templates
        WHERE templates.id = template_items.template_id
          AND (
            -- Template belongs to the user's workspace
            templates.workspace_id = (
                SELECT profiles.workspace_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
            -- OR the user personally created the template (e.g. shared templates)
            OR templates.created_by = auth.uid()
          )
    )
);

-- 4. UPDATE — allow admins/leaders to update items for templates they own
CREATE POLICY "Leaders and admins can update template items"
ON public.template_items
FOR UPDATE
USING (
    (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
    AND EXISTS (
        SELECT 1
        FROM templates
        WHERE templates.id = template_items.template_id
          AND (
            templates.workspace_id = (
                SELECT profiles.workspace_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
            OR templates.created_by = auth.uid()
          )
    )
)
WITH CHECK (
    (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
    AND EXISTS (
        SELECT 1
        FROM templates
        WHERE templates.id = template_items.template_id
          AND (
            templates.workspace_id = (
                SELECT profiles.workspace_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
            OR templates.created_by = auth.uid()
          )
    )
);

-- 5. DELETE — allow admins/leaders to delete items for templates they own
CREATE POLICY "Leaders and admins can delete template items"
ON public.template_items
FOR DELETE
USING (
    (
        SELECT profiles.role
        FROM profiles
        WHERE profiles.id = auth.uid()
    ) = ANY (ARRAY['admin'::text, 'leader'::text])
    AND EXISTS (
        SELECT 1
        FROM templates
        WHERE templates.id = template_items.template_id
          AND (
            templates.workspace_id = (
                SELECT profiles.workspace_id
                FROM profiles
                WHERE profiles.id = auth.uid()
            )
            OR templates.created_by = auth.uid()
          )
    )
);
