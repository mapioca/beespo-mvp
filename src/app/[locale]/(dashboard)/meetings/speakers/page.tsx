import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SpeakersClient } from "@/components/speakers/speakers-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Metadata.speakers" });

    return {
        title: t("title"),
        description: t("description"),
    };
}

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 10;

interface SpeakersPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SpeakersPage({ searchParams }: SpeakersPageProps) {
    const supabase = await createClient();
    const t = await getTranslations("Dashboard.Speakers");

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
        redirect("/onboarding");
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
        return <div className="p-8">{t("errorLoading")}</div>;
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
            {(count || 0) > 0 && (
                <div className="px-8 pb-8 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            {t("showingResults", {
                                from: from + 1,
                                to: Math.min(to + 1, count || 0),
                                total: count || 0,
                                label: t("speakersLabel").toLowerCase(),
                            })}
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
