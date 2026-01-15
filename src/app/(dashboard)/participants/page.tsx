import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ParticipantsClient } from "./participants-client";

export default async function ParticipantsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user's profile and workspace
    const { data: profile } = await supabase
        .from("profiles")
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    // Fetch participants for the workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: participants } = await (supabase.from("participants") as any)
        .select("id, name, created_at, created_by, profiles(full_name)")
        .eq("workspace_id", profile.workspace_id)
        .order("name");

    return (
        <ParticipantsClient
            participants={participants || []}
            userRole={profile.role}
        />
    );
}
