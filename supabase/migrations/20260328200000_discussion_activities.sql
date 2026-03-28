-- Drop the unused notes text column (replaced by discussion_notes collection)
ALTER TABLE public.discussions DROP COLUMN IF EXISTS notes;

-- Create discussion_activities table for auto-generated changelog
CREATE TABLE public.discussion_activities (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_discussion_activities_discussion ON public.discussion_activities USING btree (discussion_id);
CREATE INDEX idx_discussion_activities_created_at ON public.discussion_activities USING btree (created_at DESC);

ALTER TABLE public.discussion_activities ENABLE ROW LEVEL SECURITY;

-- SELECT: leaders and admins in the same workspace
CREATE POLICY "Workspace members can view discussion activities"
  ON public.discussion_activities FOR SELECT
  USING (
    (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_activities.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
  );

-- INSERT: leaders and admins in the same workspace
CREATE POLICY "Workspace members can insert discussion activities"
  ON public.discussion_activities FOR INSERT
  WITH CHECK (
    (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = discussion_activities.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
  );
