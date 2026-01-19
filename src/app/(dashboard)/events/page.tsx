import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsClient } from "@/components/events/events-client";

// Disable caching to ensure new events appear immediately
export const revalidate = 0;

export default async function EventsPage() {
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

    // Pagination settings
    const ITEMS_PER_PAGE = 50;

    // Get events with related announcements
    const { data: events, error } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("events") as any)
        .select(`
            id,
            title,
            description,
            location,
            start_at,
            end_at,
            is_all_day,
            workspace_event_id,
            created_at,
            announcements (
                id,
                title,
                status
            )
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("start_at", { ascending: false })
        .limit(ITEMS_PER_PAGE);

    // Log for debugging
    if (error) {
        console.error("Events query error:", error);
    }

    return <EventsClient events={events || []} />;
}
