-- Release Notes & Changelog System
-- Allows admins to broadcast release notes to all users

-- 1. Create status enum
CREATE TYPE release_note_status AS ENUM ('draft', 'published');

-- 2. Create release_notes table
CREATE TABLE public.release_notes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  version       TEXT,
  content       JSONB NOT NULL DEFAULT '[]',
  status        release_note_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.release_notes ENABLE ROW LEVEL SECURITY;

-- 4. Authenticated users can read published, non-future release notes
CREATE POLICY "authenticated_users_read_published_notes"
  ON public.release_notes FOR SELECT
  TO authenticated
  USING (status = 'published' AND published_at <= now());

-- 5. Add last_read_release_note_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_read_release_note_at TIMESTAMPTZ;
