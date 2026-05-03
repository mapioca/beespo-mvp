-- Workspace-level public audience link.
-- Replaces the per-meeting `is_publicly_shared`/`public_share_token` UI:
-- one stable link per workspace resolves to whichever sacrament planner entry
-- is currently "published to audience". The link itself does not change week
-- to week so it can be bookmarked / printed as a QR code.

create table public.workspace_audience_links (
    workspace_id uuid primary key references public.workspaces(id) on delete cascade,
    token text not null unique,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now(),
    rotated_at timestamp with time zone
);

-- The sacrament planner stores its full state as JSONB in
-- public.sacrament_planner_entries (one row per workspace per meeting_date).
-- The audience link resolves to the entry with the largest audience_published_at
-- that is <= now() for the workspace.
alter table public.sacrament_planner_entries
    add column audience_published_at timestamp with time zone;

create index sacrament_planner_entries_audience_published_idx
    on public.sacrament_planner_entries (workspace_id, audience_published_at desc nulls last)
    where audience_published_at is not null;

alter table public.workspace_audience_links enable row level security;

-- Workspace members can read their own link
create policy "Members view own workspace audience link"
    on public.workspace_audience_links for select
    using (workspace_id = public.get_auth_workspace_id());

-- Owners/admins/editors can manage the link for their workspace
create policy "Editors manage workspace audience link"
    on public.workspace_audience_links for all
    using (
        public.get_auth_role() = any (array['owner'::text, 'admin'::text, 'editor'::text])
        and workspace_id = public.get_auth_workspace_id()
    )
    with check (
        public.get_auth_role() = any (array['owner'::text, 'admin'::text, 'editor'::text])
        and workspace_id = public.get_auth_workspace_id()
    );

-- Public read by token: the token in the URL is the secret.
-- Only workspace_id and token are exposed; nothing else is sensitive.
create policy "Public read workspace audience link"
    on public.workspace_audience_links for select
    using (true);

-- Public read of audience-published planner entries.
-- Mirrors the existing per-meeting public-share policy pattern but keyed on
-- audience_published_at on sacrament_planner_entries.
create policy "Public can view audience-published planner entries"
    on public.sacrament_planner_entries for select
    using (audience_published_at is not null);
