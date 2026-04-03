import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import type { SharingGroupWithMembers } from "@/types/share";

type Profile = {
    workspace_id: string;
    role: string;
    full_name: string;
    role_title: string | null;
};

export type Workspace = {
    id: string;
    name: string;
    type: string;
    organization_type: string;
    mfa_required: boolean;
};

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get current user's profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("workspace_id, role, full_name, role_title")
        .eq("id", user.id)
        .single() as { data: Profile | null };

    if (!profile || !profile.workspace_id) {
        redirect("/onboarding");
    }

    // Get workspace details
    const { data: workspace } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", profile.workspace_id)
        .single() as { data: Workspace | null };

    // Ensure workspace is not null before passing it to SettingsClient
    if (!workspace) {
        throw new Error("Workspace not found");
    }

    // Get team members
    const { data: members } = await (supabase
        .from("profiles") as ReturnType<typeof supabase.from>)
        .select("id, email, full_name, role, created_at")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: true });

    const memberRows = (members ?? []) as Array<{ email: string | null }>;
    const memberEmailSet = new Set(
        memberRows
            .map((member) => member.email?.toLowerCase())
            .filter((email): email is string => Boolean(email))
    );

    // Get pending invitations
    const { data: invitations } = await (supabase
        .from("workspace_invitations") as ReturnType<typeof supabase.from>)
        .select(`
      id,
      email,
      role,
      status,
      expires_at,
      created_at,
      invited_by:profiles!workspace_invitations_invited_by_fkey(full_name)
    `)
        .eq("workspace_id", profile.workspace_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    const invitationRows = (invitations ?? []) as Array<{ email: string | null }>;
    const pendingInvitations = invitationRows.filter(
        (invitation) => !memberEmailSet.has(invitation.email?.toLowerCase() || "")
    );

    // Get sharing groups with member counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawSharingGroups } = await (supabase as any)
        .from("sharing_groups")
        .select(`
            id, workspace_id, name, description, created_by, created_at, updated_at,
            sharing_group_members (id, group_id, email, added_by, created_at)
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("name", { ascending: true });

    const sharingGroups: SharingGroupWithMembers[] = (rawSharingGroups ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (g: any) => ({
            ...g,
            members: g.sharing_group_members ?? [],
            member_count: (g.sharing_group_members ?? []).length,
        })
    );

    // Check if the current user has Zoom connected
    const { data: zoomApp } = await (supabase as ReturnType<typeof supabase.from>)
        .from("apps")
        .select("id")
        .eq("slug", "zoom")
        .single();
    const { count: zoomTokenCount } = await (supabase as ReturnType<typeof supabase.from>)
        .from("app_tokens")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("app_id", zoomApp?.id ?? "");
    const isZoomConnected = (zoomTokenCount ?? 0) > 0;

    return (
        <SettingsClient
            workspace={workspace}
            members={members || []}
            invitations={pendingInvitations as typeof invitations}
            currentUserId={user.id}
            currentUserRole={profile.role}
            currentUserDetails={{
                fullName: profile.full_name,
                email: user.email || "",
                roleTitle: profile.role_title || "",
            }}
            isZoomConnected={isZoomConnected}
            sharingGroups={sharingGroups}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            workspaceMembers={(members || []).map((m: any) => ({
                email: m.email,
                full_name: m.full_name,
            }))}
        />
    );
}
