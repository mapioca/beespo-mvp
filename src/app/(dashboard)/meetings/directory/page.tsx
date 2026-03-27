import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DirectoryClient } from "@/app/(dashboard)/participants/participants-client";
import { Metadata } from "next";
import { DirectoryView } from "@/lib/directory-views";

export const metadata: Metadata = {
    title: "Directory | Beespo",
    description: "Manage people directory and assignments",
};

export const dynamic = "force-dynamic";

interface DirectoryPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DirectoryPage({ searchParams }: DirectoryPageProps) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const params = await searchParams;
    const searchQuery = typeof params?.search === "string" ? params.search : "";

    // Get user's profile and workspace
    const { data: profile } = await (supabase
        .from("profiles")
        .select("workspace_id, role")
        .eq("id", user.id)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .single() as any);

    if (!profile?.workspace_id) redirect("/onboarding");

    // ── Query 1: directory + tags ───────────────────────────────────────────
    // Keep this simple (no deep nesting) — PostgREST can't resolve
    // 3-level reverse FK joins starting from the directory side.
    let dirQuery = supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("directory" as any)
        .select(
            `id, name, created_at, created_by,
             tags:directory_tag_assignments(tag:directory_tags(id, name, color))`,
            { count: "exact" }
        )
        .eq("workspace_id", profile.workspace_id);

    if (searchQuery) {
        dirQuery = dirQuery.ilike("name", `%${searchQuery}%`);
    }

    // ── Query 2: speaker assignments with meeting scheduled_date ────────────
    // Queried FROM meeting_assignments directly — this is the same pattern used
    // in getSpeakingAssignments() which is known to work. We get the meeting's
    // scheduled_date here so we can filter by it on the client.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignmentsQueryPromise = (supabase.from("meeting_assignments") as any)
        .select(
            `id, directory_id, assignment_type, is_confirmed, created_at,
             agenda_item:agenda_items(meeting:meetings(id, scheduled_date))`
        )
        .eq("workspace_id", profile.workspace_id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const viewsQueryPromise = (supabase.from("agenda_views") as any)
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .eq("view_type", "directory")
        .order("created_at", { ascending: true });

    // Run queries 1 and 2 in parallel
    const [
        { data: rawParticipants, count, error: dirError },
        { data: rawAssignments },
        { data: directoryViewsData },
    ] = await Promise.all([dirQuery.order("name"), assignmentsQueryPromise, viewsQueryPromise]);

    if (dirError) {
        console.error("Directory query error:", dirError);
        return <div className="p-8">Error loading directory. Please try again.</div>;
    }

    // ── Merge: group assignments by directory_id ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type RawAssignment = {
        id: string;
        directory_id: string;
        assignment_type: string;
        is_confirmed: boolean;
        created_at: string;
        agenda_item?: { meeting?: { id: string; scheduled_date: string } | null } | null;
    };

    const assignmentsByDirectoryId = new Map<string, RawAssignment[]>();
    
    // Merge new relational assignments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rawAssignments ?? []).forEach((a: any) => {
        const list = assignmentsByDirectoryId.get(a.directory_id) ?? [];
        list.push(a as RawAssignment);
        assignmentsByDirectoryId.set(a.directory_id, list);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participants = (rawParticipants || []).map((p: any) => ({
        ...p,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags: (p.tags || []).map((a: any) => a.tag).filter(Boolean),
        meeting_assignments: (assignmentsByDirectoryId.get(p.id) ?? []).map(
            (a) => ({
                id: a.id,
                assignment_type: a.assignment_type,
                is_confirmed: a.is_confirmed,
                created_at: a.created_at,
                // This is the key field — the actual meeting date for the speaking slot
                meeting_scheduled_date: a.agenda_item?.meeting?.scheduled_date ?? null,
            })
        ),
    }));

    const initialViews: DirectoryView[] = directoryViewsData ?? [];

    return (
        <DirectoryClient
            key={searchQuery}
            participants={participants}
            userRole={profile.role}
            totalCount={count || 0}
            currentSearch={searchQuery}
            initialViews={initialViews}
        />
    );
}
