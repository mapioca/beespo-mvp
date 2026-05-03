-- Allow candidates to decline a calling at the 'accepted' stage. The process
-- terminates with status='declined' (distinct from admin-initiated 'dropped'),
-- and the accepted stage + all subsequent stages get stage_status='declined'.

alter table public.calling_processes
    drop constraint if exists calling_processes_status_check;

alter table public.calling_processes
    add constraint calling_processes_status_check
    check (status = any (array['active'::text, 'completed'::text, 'dropped'::text, 'declined'::text]));
