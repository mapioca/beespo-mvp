import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SpeakersClient } from "@/components/speakers/speakers-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Speakers | Beespo",
    description: "Manage and track speakers across all meetings",
};

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 10;

interface SpeakersPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SpeakersPage({ searchParams }: SpeakersPageProps) {
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

    if (!profile) {
        redirect("/setup");
    }

    // Build query with filters
    let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("speakers" as any)
        .select(`
            *,
            agenda_items(
                meeting:meetings(
                    id,
                    title,
                    scheduled_date
                )
            )
        `, { count: "exact" })
        .eq("workspace_id", profile.workspace_id);

    // Apply search filter
    if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,topic.ilike.%${searchQuery}%,workspace_speaker_id.ilike.%${searchQuery}%`);
    }

    // Apply sorting and pagination
    const { data: speakers, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Speakers query error:", error);
        return <div className="p-8">Error loading speakers. Please try again.</div>;
    }

    // Fetch counts for filter badges (unfiltered counts)
    const { data: allSpeakers } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("speakers") as any)
        .select("is_confirmed")
        .eq("workspace_id", profile.workspace_id);

    const statusCounts: Record<string, number> = {
        confirmed: 0,
        pending: 0,
    };

    allSpeakers?.forEach((s: { is_confirmed: boolean }) => {
        if (s.is_confirmed) statusCounts.confirmed++;
        else statusCounts.pending++;
    });

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
    const hasNextPage = to < (count || 0) - 1;
    const hasPrevPage = currentPage > 1;

    // Current filter state to pass to client
    const currentFilters = {
        search: searchQuery,
    };

    return (
        <>
            <SpeakersClient
                key={`${currentPage}-${searchQuery}`}
                speakers={speakers || []}
                totalCount={count || 0}
                statusCounts={statusCounts}
                currentFilters={currentFilters}
            />
            <div className="px-8 pb-8 max-w-7xl mx-auto">
                <PaginationControls
                    currentPage={currentPage}
                    totalPages={totalPages}
                    hasNextPage={hasNextPage}
                    hasPrevPage={hasPrevPage}
                />
                <p className="text-xs text-muted-foreground mt-2 text-center font-mono">
                    Page {currentPage} | Showing {speakers?.length || 0} of {count} speakers
                    {searchQuery && ` | Search: "${searchQuery}"`}
                </p>
            </div>
        </>
    );
}
