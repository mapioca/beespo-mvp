import { createClient } from "@/lib/supabase/server";
import { MeetingList } from "@/components/meetings/meeting-list";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Meetings | Beespo",
    description: "Manage your meetings and agendas",
};

export default async function MeetingsPage() {
    const supabase = await createClient();

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
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

    return (
        <div className="flex flex-col gap-8 p-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Meetings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your meeting schedules, agendas, and history.
                </p>
            </div>

            <MeetingList meetings={meetings} isLeader={isLeader} />
        </div>
    );
}
