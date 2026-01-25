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

    // Get workspace_id first
    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    const currentUserProfile = rawProfile as { workspace_id: string | null } | null;

    // Build query with filters
    let query = supabase
        .from('tasks')
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email),
            labels:task_label_assignments(
                label:task_labels(id, name, color)
            )
        `, { count: "exact" });

    // Apply search filter
    if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,workspace_task_id.ilike.%${searchQuery}%`);
    }

    // Apply status filter
    if (statusFilters.length > 0) {
        query = query.in("status", statusFilters);
    }

    // Apply sorting and pagination
    const { data: rawTasks, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

    if (error) {
        console.error("Error fetching tasks:", error);
        return <div className="p-8">Error loading tasks. Please try again.</div>;
    }

    // Fetch workspace profiles if needed
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

    // Fetch counts for filter badges (unfiltered counts)
    const { data: allTasks } = await supabase
        .from('tasks')
        .select('status, priority, assigned_to');

    const statusCounts: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
    };
    const priorityCounts: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
    };

    allTasks?.forEach((task: { status: string; priority: string | null }) => {
        if (task.status in statusCounts) statusCounts[task.status]++;
        if (task.priority && task.priority in priorityCounts) priorityCounts[task.priority]++;
    });

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
