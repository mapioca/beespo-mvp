-- Add language_preference to profiles for per-user language settings
ALTER TABLE public.profiles
ADD COLUMN language_preference text NOT NULL DEFAULT 'ENG'
CHECK (language_preference IN ('ENG', 'SPA'));
