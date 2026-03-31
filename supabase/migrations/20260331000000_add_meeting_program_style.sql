alter table public.meetings
add column if not exists program_style jsonb default '{}'::jsonb;
