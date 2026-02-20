-- Migration to add 'locale' to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS locale character varying(10) DEFAULT 'en'::character varying;
COMMENT ON COLUMN public.profiles.locale IS 'User preferred language for internationalization';
