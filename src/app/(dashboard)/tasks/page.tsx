import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Database } from "@/types/database";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tasks | Beespo",
    description: "Manage your action items and assignments",
};

// Force dynamic rendering to ensure searchParams trigger fresh data fetch
export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 10;

type TaskWithRelations = Database['public']['Tables']['tasks']['Row'] & {
    assignee: { full_name: string; email: string } | null;
    labels: { label: { id: string; name: string; color: string } }[];
};

interface TasksPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
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

    // Build the main task query based on active filters (no await yet).
    let query = supabase
        .from('tasks')
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email),
            labels:task_label_assignments(
                label:task_labels(id, name, color)
            )
        `, { count: "exact" });

    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,workspace_task_id.ilike.%${searchQuery}%`);
    }
    if (statusFilters.length > 0) {
        query = query.in("status", statusFilters);
    }

    // Fire profile, paginated tasks, and all 7 badge-count queries in one parallel batch.
    // Badge counts use HEAD requests — no row data is transferred, just the COUNT header.
    const [
        profileResult,
        taskResult,
        pendingRes, inProgressRes, completedRes, cancelledRes,
        lowRes, mediumRes, highRes,
    ] = await Promise.all([
        supabase.from('profiles').select('workspace_id').eq('id', user.id).single(),
        query.order('created_at', { ascending: false }).range(from, to),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('priority', 'low'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('priority', 'medium'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('priority', 'high'),
    ]);

    const currentUserProfile = profileResult.data as { workspace_id: string | null } | null;
    const { data: rawTasks, count, error } = taskResult;

    if (error) {
        console.error("Error fetching tasks:", error);
        return <div className="p-8">Error loading tasks. Please try again.</div>;
    }

    // Fetch workspace member profiles (needs workspace_id from the parallel batch above).
    let profiles: { id: string; full_name: string; email: string }[] = [];
    if (currentUserProfile?.workspace_id) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('workspace_id', currentUserProfile.workspace_id)
            .order('full_name');

        if (data) {
            profiles = data as { id: string; full_name: string; email: string }[];
        }
    }

    const statusCounts = {
        pending: pendingRes.count ?? 0,
        in_progress: inProgressRes.count ?? 0,
        completed: completedRes.count ?? 0,
        cancelled: cancelledRes.count ?? 0,
    };
    const priorityCounts = {
        low: lowRes.count ?? 0,
        medium: mediumRes.count ?? 0,
        high: highRes.count ?? 0,
    };

    // Transform to match Table props
    const typedTasks = rawTasks as unknown as TaskWithRelations[] | null;
    const tasks = (typedTasks || []).map((t) => {
        const labels = Array.isArray(t.labels)
            ? t.labels.map((la) => la.label).filter(Boolean)
            : [];

        return {
            ...t,
            labels: labels,
            comment_count: 0
        };
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
            <TasksClient
                key={`${currentPage}-${searchQuery}-${statusFilters.join()}`}
                tasks={tasks}
                userId={user?.id || ""}
                profiles={profiles}
                totalCount={count || 0}
                statusCounts={statusCounts}
                priorityCounts={priorityCounts}
                currentFilters={currentFilters}
            />
            {(count || 0) > 0 && (
                <div className="px-8 pb-8 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between border-t pt-4">
                        <p className="text-sm text-muted-foreground">
                            Showing {from + 1}-{Math.min(to + 1, count || 0)} of {count} tasks
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
