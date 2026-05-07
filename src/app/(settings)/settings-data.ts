import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";
import type { SharingGroupWithMembers } from "@/types/share";

export type SettingsProfile = {
    workspace_id: string;
    role: UserRole;
    full_name: string;
    role_title: string | null;
    language_preference: "ENG" | "SPA" | null;
};

export type SettingsWorkspace = {
    id: string;
    name: string;
    type: string;
    organization_type: string;
    mfa_required: boolean;
    slug: string | null;
};

export type TeamMember = {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    created_at: string;
};

export type Invitation = {
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
    invited_by: {
        full_name: string;
    } | null;
};

export type WorkspaceMember = {
    email: string;
    full_name: string | null;
};

export const getSettingsRequestContext = cache(async () => {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id, role, full_name, role_title, language_preference")
        .eq("id", user.id)
        .single() as { data: SettingsProfile | null };

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    const { data: workspace } = await (supabase.from("workspaces") as ReturnType<typeof supabase.from>)
        .select("id, name, type, organization_type, mfa_required, slug")
        .eq("id", profile.workspace_id)
        .single() as { data: SettingsWorkspace | null };

    if (!workspace) {
        throw new Error("Workspace not found");
    }

    return {
        supabase,
        user,
        profile,
        workspace,
    };
});

export async function getTeamSectionData(workspaceId: string) {
    const supabase = await createClient();

    const { data: members } = await (supabase
        .from("profiles") as ReturnType<typeof supabase.from>)
        .select("id, email, full_name, role, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: true });

    const memberRows = (members ?? []) as Array<{ email: string | null }>;
    const memberEmailSet = new Set(
        memberRows
            .map((member) => member.email?.toLowerCase())
            .filter((email): email is string => Boolean(email))
    );

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
        .eq("workspace_id", workspaceId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    const invitationRows = (invitations ?? []) as Array<{ email: string | null }>;
    const pendingInvitations = invitationRows.filter(
        (invitation) => !memberEmailSet.has(invitation.email?.toLowerCase() || "")
    );

    return {
        members: (members ?? []) as TeamMember[],
        invitations: pendingInvitations as Invitation[],
    };
}

export async function getSharingGroupsSectionData(workspaceId: string) {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rawSharingGroups } = await (supabase as any)
        .from("sharing_groups")
        .select(`
            id, workspace_id, name, description, created_by, created_at, updated_at,
            sharing_group_members (id, group_id, email, added_by, created_at)
        `)
        .eq("workspace_id", workspaceId)
        .order("name", { ascending: true });

    const sharingGroups: SharingGroupWithMembers[] = (rawSharingGroups ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (group: any) => ({
            ...group,
            members: group.sharing_group_members ?? [],
            member_count: (group.sharing_group_members ?? []).length,
        })
    );

    const { data: members } = await (supabase
        .from("profiles") as ReturnType<typeof supabase.from>)
        .select("email, full_name")
        .eq("workspace_id", workspaceId)
        .order("full_name", { ascending: true });

    return {
        sharingGroups,
        workspaceMembers: (members ?? []) as WorkspaceMember[],
    };
}

export async function getAudienceLinkToken(workspaceId: string) {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: audienceLinkRow } = await (supabase.from("workspace_audience_links") as any)
        .select("token")
        .eq("workspace_id", workspaceId)
        .maybeSingle();

    return audienceLinkRow?.token ?? null;
}
