-- Fix discussion_notes RLS policies to allow both leaders and admins

-- DROP existing policies
DROP POLICY IF EXISTS "Leaders can create discussion notes" ON public.discussion_notes;
DROP POLICY IF EXISTS "Creators and leaders can update discussion notes" ON public.discussion_notes;
DROP POLICY IF EXISTS "Creators and leaders can delete discussion notes" ON public.discussion_notes;
DROP POLICY IF EXISTS "Leaders can view discussion notes in their organization" ON public.discussion_notes;

-- INSERT: leaders and admins in the same workspace can create notes
CREATE POLICY "Leaders and admins can create discussion notes"
  ON public.discussion_notes
  FOR INSERT
  WITH CHECK (
    (
      (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_notes.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
  );

-- SELECT: leaders and admins in the same workspace can view notes
CREATE POLICY "Leaders and admins can view discussion notes"
  ON public.discussion_notes
  FOR SELECT
  USING (
    (
      (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_notes.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
  );

-- UPDATE: own notes (or any note for admins/leaders)
CREATE POLICY "Creators and admins can update discussion notes"
  ON public.discussion_notes
  FOR UPDATE
  USING (
    (
      (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_notes.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
    AND (
      created_by = auth.uid()
      OR (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
  );

-- DELETE: own notes (or any note for admins/leaders)
CREATE POLICY "Creators and admins can delete discussion notes"
  ON public.discussion_notes
  FOR DELETE
  USING (
    (
      (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_notes.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
    AND (
      created_by = auth.uid()
      OR (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    )
  );
