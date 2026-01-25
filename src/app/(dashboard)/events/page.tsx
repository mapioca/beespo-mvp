import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EventsClient } from "@/components/events/events-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Events | Beespo",
    description: "Manage calendar events for your workspace",
};

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 5;

interface EventsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function EventsPage({ searchParams }: EventsPageProps) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Await searchParams (Next.js 15 requirement)
    const params = await searchParams;

    // Parse pagination
    const rawPage = params?.page;
    const currentPage = Number(rawPage) || 1;
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    // Parse search param
    const searchQuery = typeof params?.search === "string" ? params.search : "";

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

    // Build query with filters
    let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("events" as any)
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
        `, { count: "exact" })
        .eq("workspace_id", profile.workspace_id);

    // Apply search filter
    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,workspace_event_id.ilike.%${searchQuery}%`);
    }

    // Apply sorting and pagination
    const { data: events, count, error } = await query
        .order("start_at", { ascending: false })
        .range(from, to);

    // Log for debugging
    if (error) {
        console.error("Events query error:", error);
        return <div className="p-8">Error loading events. Please try again.</div>;
    }

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
    const hasNextPage = to < (count || 0) - 1;
    const hasPrevPage = currentPage > 1;

    return (
        <>
            <EventsClient
                key={`${currentPage}-${searchQuery}`}
                events={events || []}
                totalCount={count || 0}
                currentSearch={searchQuery}
            />
            {(count || 0) > 0 && (
                <div className="px-8 pb-8 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            Showing {from + 1}-{Math.min(to + 1, count || 0)} of {count} events
                        </p>
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            hasNextPage={hasNextPage}
                            hasPrevPage={hasPrevPage}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
