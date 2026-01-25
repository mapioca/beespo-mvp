import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Announcements | Beespo",
    description: "Manage time-based announcements for your organization",
};

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 5;

interface AnnouncementsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AnnouncementsPage({ searchParams }: AnnouncementsPageProps) {
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

    // Parse filter params
    const statusParam = params?.status;
    const statusFilters: string[] = statusParam
        ? (Array.isArray(statusParam) ? statusParam : statusParam.split(","))
        : [];

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
        .from("announcements" as any)
        .select("id, title, content, priority, status, deadline, created_at, updated_at, workspace_id, workspace_announcement_id, created_by", { count: "exact" })
        .eq("workspace_id", profile.workspace_id);

    // Apply search filter
    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%,workspace_announcement_id.ilike.%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilters.length > 0) {
        query = query.in("status", statusFilters);
    }

    // Apply sorting and pagination
    const { data: announcements, count, error } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Announcements query error:", error);
        return <div className="p-8">Error loading announcements. Please try again.</div>;
    }

    // Fetch counts for filter badges (unfiltered counts)
    const { data: allAnnouncements } = await (supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("announcements") as any)
        .select("status, priority")
        .eq("workspace_id", profile.workspace_id);

    const statusCounts: Record<string, number> = {
        draft: 0,
        active: 0,
        stopped: 0,
    };
    const priorityCounts: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
    };

    allAnnouncements?.forEach((a: { status: string; priority: string | null }) => {
        if (a.status in statusCounts) statusCounts[a.status]++;
        if (a.priority && a.priority in priorityCounts) priorityCounts[a.priority]++;
    });

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
    const hasNextPage = to < (count || 0) - 1;
    const hasPrevPage = currentPage > 1;

    // Current filter state to pass to client
    const currentFilters = {
        search: searchQuery,
        status: statusFilters,
    };

    return (
        <>
            <AnnouncementsClient
                key={`${currentPage}-${searchQuery}-${statusFilters.join()}`}
                announcements={announcements || []}
                totalCount={count || 0}
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
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
                    Page {currentPage} | Showing {announcements?.length || 0} of {count} announcements
                    {searchQuery && ` | Search: "${searchQuery}"`}
                    {statusFilters.length > 0 && ` | Status: ${statusFilters.join(", ")}`}
                </p>
            </div>
        </>
    );
}
