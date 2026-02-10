-- Add hymn fields to agenda_items table for inline editing support
ALTER TABLE public.agenda_items
ADD COLUMN IF NOT EXISTS hymn_id UUID REFERENCES public.hymns(id) ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.agenda_items.hymn_id IS 'Reference to the hymn associated with this agenda item';

-- Create index for hymn lookups
CREATE INDEX IF NOT EXISTS idx_agenda_items_hymn_id ON public.agenda_items(hymn_id);
