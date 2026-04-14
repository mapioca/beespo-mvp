-- Add 'external' as a plan_type value for meetings whose plan lives outside Beespo
-- (paper agenda, Google Doc, etc.). Also add external_plan_url to store the link.
-- plan_type remains nullable: a meeting may have no plan declared yet.

alter type public.meeting_plan_type add value if not exists 'external';

alter table public.meetings
  add column if not exists external_plan_url text;
