-- Migration to drop unused lyrics column from hymns table
ALTER TABLE public.hymns DROP COLUMN IF EXISTS lyrics;
