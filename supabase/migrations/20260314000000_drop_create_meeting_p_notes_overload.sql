-- Drop the orphaned 5-parameter overload of create_meeting_with_agenda that
-- includes p_notes jsonb. This overload was created by a migration that was
-- later removed, leaving two candidate functions in the database. PostgreSQL
-- cannot resolve the ambiguity when callers pass only the first four named
-- parameters (both overloads match because p_notes has a default value).
-- The active codebase never passes p_notes, so the 4-parameter version
-- (recreated by 20260225000000_add_structural_items.sql) is the one to keep.

DROP FUNCTION IF EXISTS public.create_meeting_with_agenda(
    p_template_id uuid,
    p_title text,
    p_scheduled_date timestamp with time zone,
    p_agenda_items jsonb,
    p_notes jsonb
);
