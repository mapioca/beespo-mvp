WITH base AS (
  SELECT
    id,
    TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(name, '')), '[^a-z0-9]+', '-', 'g')) AS base_slug
  FROM public.templates
  WHERE workspace_id IS NULL
    AND (slug IS NULL OR slug = '')
),
ranked AS (
  SELECT
    id,
    CASE
      WHEN base_slug = '' THEN 'template-' || LEFT(id::text, 8)
      WHEN COUNT(*) OVER (PARTITION BY base_slug) = 1 THEN base_slug
      ELSE base_slug || '-' || ROW_NUMBER() OVER (PARTITION BY base_slug ORDER BY id)
    END AS new_slug
  FROM base
)
UPDATE public.templates AS t
SET slug = ranked.new_slug
FROM ranked
WHERE t.id = ranked.id;
