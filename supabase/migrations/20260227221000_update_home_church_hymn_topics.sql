-- Update topics for "Hymns—For Home and Church" (book_id = 'hymns_home_church')

UPDATE public.hymns SET topic = 'Sabbath and Weekday' WHERE book_id = 'hymns_home_church' AND hymn_number BETWEEN 1001 AND 1062;
UPDATE public.hymns SET topic = 'Easter and Christmas' WHERE book_id = 'hymns_home_church' AND hymn_number BETWEEN 1201 AND 1210;
