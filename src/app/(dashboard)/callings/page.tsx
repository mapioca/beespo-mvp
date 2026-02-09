import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CallingsPageClient } from "./callings-page-client";

// Disable caching to ensure updates appear immediately
export const revalidate = 0;

export default async function CallingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user profile to check role
    const { data: profile } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("profiles") as any)
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile || !profile.workspace_id) {
        redirect("/onboarding");
    }

    // Get all active processes with their callings for pipeline view
    const { data: processes, error: processesError } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("calling_processes") as any)
        .select(`
            id,
            current_stage,
            status,
            created_at,
            updated_at,
            candidate:candidate_names(id, name),
            calling:callings!calling_processes_calling_id_fkey(
                id,
                title,
                organization,
                workspace_id
            )
        `)
        .order("updated_at", { ascending: false });

    if (processesError) {
        console.error("Processes query error:", processesError);
    }

    // Filter to only processes in this workspace
    const workspaceProcesses = (processes || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.calling?.workspace_id === profile.workspace_id
    );

    // Get team members for task assignment
    const { data: teamMembers } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("profiles") as any)
        .select("id, full_name")
        .eq("workspace_id", profile.workspace_id)
        .order("full_name");

    return (
        <CallingsPageClient
            initialProcesses={workspaceProcesses}
            teamMembers={teamMembers || []}
        />
    );
}
