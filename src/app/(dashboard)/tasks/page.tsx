import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";
import { Database } from "@/types/database";

// Enable caching with revalidation every 60 seconds
export const revalidate = 60;

type TaskWithRelations = Database['public']['Tables']['tasks']['Row'] & {
    assignee: { full_name: string; email: string } | null;
    labels: { label: { id: string; name: string; color: string } }[];
};

export default async function TasksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    // Pagination settings
    const ITEMS_PER_PAGE = 50;

    // Parallelize all queries to reduce load time
    const [
        { data: rawTasks, error },
        { data: rawProfile },
    ] = await Promise.all([
        // Fetch tasks with relations (using * due to complex joins)
        // Limited to first 50 for performance
        supabase
            .from('tasks')
            .select(`
                *,
                assignee:profiles!tasks_assigned_to_fkey(full_name, email),
                labels:task_label_assignments(
                    label:task_labels(id, name, color)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(ITEMS_PER_PAGE),
        // Get workspace_id
        supabase
            .from('profiles')
            .select('workspace_id')
            .eq('id', user.id)
            .single(),
    ]);

    if (error) {
        console.error("Error fetching tasks:", error);
    }

    const currentUserProfile = rawProfile as { workspace_id: string | null } | null;

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

    return <TasksClient tasks={tasks} userId={user?.id || ""} profiles={profiles} />;
}
