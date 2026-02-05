import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppsClient } from "./apps-client";
import type { App, WorkspaceAppWithApp } from "@/types/apps";

type Profile = {
    workspace_id: string;
    role: string;
};

export default async function AppsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get current user's profile
    const { data: profile } = await (supabase
        .from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id, role")
        .eq("id", user.id)
        .single() as { data: Profile | null };

    if (!profile || !profile.workspace_id) {
        redirect("/setup");
    }

    // Get all available apps
    const { data: apps } = await (supabase
        .from("apps") as ReturnType<typeof supabase.from>)
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }) as { data: App[] | null };

    // Get workspace apps
    const { data: workspaceApps } = await (supabase
        .from("workspace_apps") as ReturnType<typeof supabase.from>)
        .select(`
            *,
            app:apps (*)
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false }) as { data: WorkspaceAppWithApp[] | null };

    return (
        <AppsClient
            apps={apps || []}
            workspaceApps={workspaceApps || []}
            userRole={profile.role}
        />
    );
}
