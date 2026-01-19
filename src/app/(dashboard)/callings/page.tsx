import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CallingsClient } from "@/components/callings/callings-client";

// Disable caching to ensure new callings appear immediately
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
        redirect("/setup");
    }

    // Get callings with candidates and processes
    const { data: callings, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("callings") as any)
        .select(`
            id,
            title,
            organization,
            is_filled,
            filled_at,
            created_at,
            updated_at,
            filled_by_name:candidate_names!callings_filled_by_fkey(id, name),
            candidates:calling_candidates(
                id,
                status,
                notes,
                candidate:candidate_names(id, name)
            ),
            processes:calling_processes(
                id,
                current_stage,
                status,
                candidate:candidate_names(id, name)
            )
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Callings query error:", error);
    }

    // Get team members for task assignment
    const { data: teamMembers } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("profiles") as any)
        .select("id, full_name")
        .eq("workspace_id", profile.workspace_id)
        .order("full_name");

    return (
        <CallingsClient
            callings={callings || []}
            teamMembers={teamMembers || []}
            userRole={profile.role}
        />
    );
}
