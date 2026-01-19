import { createClient } from "@/lib/supabase/server";
import { MeetingsClient } from "@/components/meetings/meetings-client";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Meetings | Beespo",
    description: "Manage your meetings and agendas",
};

export const revalidate = 0;

export default async function MeetingsPage() {
    const supabase = await createClient();

    // Get current user profile to check role and get workspace
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("role, workspace_id")
        .eq("id", user?.id || "")
        .single();

    const isLeader = profile?.role === "leader" || profile?.role === "admin";

    // Fetch workspace slug
    let workspaceSlug: string | null = null;
    if (profile?.workspace_id) {
        const { data: workspace } = await (supabase
            .from("workspaces") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("slug")
            .eq("id", profile.workspace_id)
            .single();
        workspaceSlug = workspace?.slug || null;
    }

    // Fetch meetings with template info (including template id for filtering)
    const { data: meetings, error } = await supabase
        .from("meetings")
        .select(`
            *,
            templates (
                id,
                name
            )
        `)
        .order("scheduled_date", { ascending: false });

    if (error) {
        console.error("Error fetching meetings:", error);
        return <div>Error loading meetings. Please try again.</div>;
    }

    // Fetch all templates for filtering
    const { data: templates } = await (supabase
        .from("templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .order("name");

    return (
        <MeetingsClient
            meetings={meetings || []}
            templates={templates || []}
            workspaceSlug={workspaceSlug}
            isLeader={isLeader}
        />
    );
}
