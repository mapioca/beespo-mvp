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

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user?.id || "")
        .single();

    const isLeader = profile?.role === "leader" || profile?.role === "admin";

    // Fetch meetings with template info
    const { data: meetings, error } = await supabase
        .from("meetings")
        .select(`
      *,
      templates (
        name
      )
    `)
        .order("scheduled_date", { ascending: false });

    if (error) {
        console.error("Error fetching meetings:", error);
        return <div>Error loading meetings. Please try again.</div>;
    }

    return <MeetingsClient meetings={meetings || []} isLeader={isLeader} />;
}
