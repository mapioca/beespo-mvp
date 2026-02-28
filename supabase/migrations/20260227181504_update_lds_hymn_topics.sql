-- Update topics for "Hymns of The Church of Jesus Christ of Latter-day Saints" (book_id = 'hymns_church')

UPDATE public.hymns SET topic = 'Restoration' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 1 AND 61;
UPDATE public.hymns SET topic = 'Praise and Thanksgiving' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 62 AND 96;
UPDATE public.hymns SET topic = 'Prayer and Supplication' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 97 AND 168;
UPDATE public.hymns SET topic = 'Sacrament' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 169 AND 196;
UPDATE public.hymns SET topic = 'Easter' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 197 AND 200;
UPDATE public.hymns SET topic = 'Christmas' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 201 AND 214;
UPDATE public.hymns SET topic = 'Special Topics' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 215 AND 298;
UPDATE public.hymns SET topic = 'Children''s Songs' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 299 AND 308;
UPDATE public.hymns SET topic = 'For Women' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 309 AND 318;
UPDATE public.hymns SET topic = 'For Men' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 319 AND 337;
UPDATE public.hymns SET topic = 'Patriotic' WHERE book_id = 'hymns_church' AND hymn_number BETWEEN 338 AND 341;
