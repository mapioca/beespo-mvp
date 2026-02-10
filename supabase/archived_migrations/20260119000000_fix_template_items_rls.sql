-- Fix template_items RLS policy to support both 'admin' and 'leader' roles
-- This addresses the issue where editing templates fails due to RLS violation

-- Drop the old policy that only checks for 'leader' role
DROP POLICY IF EXISTS "Leaders can manage template items" ON template_items;

-- Create a new policy that supports both 'admin' and 'leader' roles
CREATE POLICY "Leaders and admins can manage template items"
  ON template_items FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'leader') AND
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.id = template_items.template_id
      AND templates.workspace_id = (SELECT workspace_id FROM profiles WHERE id = auth.uid())
    )
  );
