import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ParticipantsClient } from "./participants-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Participants | Beespo",
    description: "Manage reusable participant names for meeting assignments",
};

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 10;

interface ParticipantsPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ParticipantsPage({ searchParams }: ParticipantsPageProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();

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

    // Get user's profile and workspace
    const { data: profile } = await (supabase
        .from("profiles")
        .select("workspace_id, role")
        .eq("id", user.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .single() as any);

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    // Build query with filters
    let query = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("participants" as any)
        .select("id, name, created_at, created_by, profiles(full_name)", { count: "exact" })
        .eq("workspace_id", profile.workspace_id);

    // Apply search filter
    if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
    }

    // Apply sorting and pagination
    const { data: participants, count, error } = await query
        .order("name")
        .range(from, to);

    if (error) {
        console.error("Participants query error:", error);
        return <div className="p-8">Error loading participants. Please try again.</div>;
    }

    const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
    const hasNextPage = to < (count || 0) - 1;
    const hasPrevPage = currentPage > 1;

    return (
        <>
            <ParticipantsClient
                key={`${currentPage}-${searchQuery}`}
                participants={participants || []}
                userRole={profile.role}
                totalCount={count || 0}
                currentSearch={searchQuery}
            />
            {(count || 0) > 0 && (
                <div className="px-8 pb-8 max-w-5xl mx-auto">
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            Showing {from + 1}-{Math.min(to + 1, count || 0)} of {count} participants
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
