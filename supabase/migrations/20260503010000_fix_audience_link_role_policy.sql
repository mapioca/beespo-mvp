-- Update the audience-link manage policy to use the post-remap role names
-- (owner/admin/editor instead of admin/leader). Without this, owners get
-- "Insufficient permissions" because the policy still checks for 'leader'.

drop policy if exists "Leaders manage workspace audience link"
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
