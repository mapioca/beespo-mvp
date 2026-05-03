-- Add optional gender to directory for pronoun-aware flows
ALTER TABLE public.directory
ADD COLUMN IF NOT EXISTS gender text;

ALTER TABLE public.directory
ADD CONSTRAINT directory_gender_check
CHECK (gender IS NULL OR gender IN ('male', 'female'));

CREATE INDEX IF NOT EXISTS idx_directory_workspace_gender
ON public.directory(workspace_id, gender);

COMMENT ON COLUMN public.directory.gender IS
'Optional gender used for pronoun-aware script generation (male|female). Nullable for legacy entries.';

-- Backfill from the most recent business item metadata when available.
WITH latest_gender AS (
  SELECT DISTINCT ON (workspace_id, person_name)
    workspace_id,
    person_name,
    details->>'gender' AS gender
  FROM public.business_items
  WHERE (details->>'gender') IN ('male', 'female')
  ORDER BY workspace_id, person_name, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
)
UPDATE public.directory d
SET gender = lg.gender
FROM latest_gender lg
WHERE d.workspace_id = lg.workspace_id
  AND d.name = lg.person_name
  AND d.gender IS NULL;
