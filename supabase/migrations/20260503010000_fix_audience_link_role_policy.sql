-- Update the audience-link manage policy to use the post-remap role names
-- (owner/admin/editor instead of admin/leader). Without this, owners get
-- "Insufficient permissions" because the policy still checks for 'leader'.
--
-- Idempotent against fresh DBs: 20260503000000_add_workspace_audience_links.sql
-- was later edited in place to create the post-remap "Editors ..." policy
-- directly, so on a clean apply the policy already exists with the same
-- definition. Drop both the old and new names before re-creating.

drop policy if exists "Leaders manage workspace audience link"
    on public.workspace_audience_links;

drop policy if exists "Editors manage workspace audience link"
    on public.workspace_audience_links;

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
