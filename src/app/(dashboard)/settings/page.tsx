import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get current user's profile
    const { data: profile } = await (supabase
        .from("profiles") as any)
        .select("workspace_id, role, full_name")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        redirect("/setup");
    }

    // Get workspace details
    const { data: workspace } = await (supabase
        .from("workspaces") as any)
        .select("*")
        .eq("id", profile.workspace_id)
        .single();

    // Get team members
    const { data: members } = await (supabase
        .from("profiles") as any)
        .select("id, email, full_name, role, created_at")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: true });

    // Get pending invitations
    const { data: invitations } = await (supabase
        .from("workspace_invitations") as any)
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

    return (
        <SettingsClient
            workspace={workspace}
            members={members || []}
            invitations={invitations || []}
            currentUserId={user.id}
            currentUserRole={profile.role}
        />
    );
}
