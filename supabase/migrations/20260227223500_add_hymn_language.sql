-- Add language column to hymns table
ALTER TABLE public.hymns ADD COLUMN language text DEFAULT 'ENG';

-- Since the default covers new rows, let's explicitly update existing ones just in case 
-- (though DEFAULT handles it conditionally depending on postgres version, safe to run UPDATE)
UPDATE public.hymns SET language = 'ENG' WHERE language IS NULL;

-- Make it NOT NULL
ALTER TABLE public.hymns ALTER COLUMN language SET NOT NULL;

-- Add unique constraint to prevent duplicate hymns with same number, language, and book
ALTER TABLE public.hymns ADD CONSTRAINT hymns_hymn_number_language_book_id_key UNIQUE (hymn_number, language, book_id);
