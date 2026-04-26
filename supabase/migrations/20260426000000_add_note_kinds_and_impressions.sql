-- Add note_kind to discussion_notes
ALTER TABLE public.discussion_notes 
ADD COLUMN note_kind text DEFAULT 'key_point' CHECK (note_kind IN ('idea', 'question', 'risk', 'proposal', 'key_point'));

-- Create spiritual_impressions table (private notes visible only to author)
CREATE TABLE public.spiritual_impressions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX idx_spiritual_impressions_discussion ON public.spiritual_impressions USING btree (discussion_id);
CREATE INDEX idx_spiritual_impressions_author ON public.spiritual_impressions USING btree (author_id);

ALTER TABLE public.spiritual_impressions ENABLE ROW LEVEL SECURITY;

-- SELECT: only the author can view their own impressions
CREATE POLICY "Authors can view their own spiritual impressions"
  ON public.spiritual_impressions FOR SELECT
  USING (author_id = auth.uid());

-- INSERT: users can create their own impressions
CREATE POLICY "Users can create their own spiritual impressions"
  ON public.spiritual_impressions FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND (SELECT profiles.role FROM public.profiles WHERE profiles.id = auth.uid()) IN ('leader', 'admin')
    AND EXISTS (
      SELECT 1 FROM public.discussions
      WHERE discussions.id = spiritual_impressions.discussion_id
        AND discussions.workspace_id = (
          SELECT profiles.workspace_id FROM public.profiles WHERE profiles.id = auth.uid()
        )
    )
  );

-- UPDATE: authors can update their own impressions
CREATE POLICY "Authors can update their own spiritual impressions"
  ON public.spiritual_impressions FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- DELETE: authors can delete their own impressions
CREATE POLICY "Authors can delete their own spiritual impressions"
  ON public.spiritual_impressions FOR DELETE
  USING (author_id = auth.uid());
