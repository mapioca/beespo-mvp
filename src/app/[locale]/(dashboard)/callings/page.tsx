import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Metadata.callings" });

    return {
        title: t("title"),
        description: t("description"),
    };
}
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

    // Get all callings in this workspace
    const { data: callings } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("callings") as any)
        .select(`
            id,
            title,
            organization,
            is_filled,
            created_at
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

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
            initialCallings={callings || []}
            teamMembers={teamMembers || []}
        />
    );
}
