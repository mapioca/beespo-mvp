-- Add view_type distinguish which page the view belongs to: 'agendas' | 'directory'
-- This allows us to use the same table for directory-specific custom views

ALTER TABLE public.agenda_views 
ADD COLUMN view_type text NOT NULL DEFAULT 'agendas';

-- Create a composite index to quickly load views by workspace and type
CREATE INDEX idx_agenda_views_view_type ON public.agenda_views(workspace_id, view_type);
