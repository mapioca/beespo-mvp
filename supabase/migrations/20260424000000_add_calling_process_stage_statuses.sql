-- Track per-stage completion state for calling processes so users can mark
-- stages complete out of order and un-mark stages without cascading effects.
-- Previously `current_stage` was the single source of truth (linear advancement).

alter table public.calling_processes
    add column if not exists stage_statuses jsonb not null default '{}'::jsonb;

-- Backfill: for existing rows, treat every stage up to and including
-- current_stage as complete, rest as pending. New rows start with '{}' and
-- the application falls back to the same derivation until a stage is toggled.
update public.calling_processes
set stage_statuses = jsonb_build_object(
    'defined',      case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 1 then 'complete' else 'pending' end,
    'approved',     case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 2 then 'complete' else 'pending' end,
    'extended',     case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 3 then 'complete' else 'pending' end,
    'accepted',     case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 4 then 'complete' else 'pending' end,
    'sustained',    case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 5 then 'complete' else 'pending' end,
    'set_apart',    case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 6 then 'complete' else 'pending' end,
    'recorded_lcr', case when array_position(array['defined','approved','extended','accepted','sustained','set_apart','recorded_lcr']::text[], current_stage::text) >= 7 then 'complete' else 'pending' end
)
where stage_statuses = '{}'::jsonb;
