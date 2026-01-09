import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch all tasks for the workspace with labels
    const { data: rawTasks, error } = await supabase
        .from('tasks')
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email),
            labels:task_label_assignments(
                label:task_labels(id, name, color)
            )
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching tasks:", error);
    }

    // Transform to match Table props
    const tasks = (rawTasks || []).map((t) => {
        const labels = Array.isArray(t.labels)
            ? (t.labels as unknown as { label: { id: string; name: string; color: string } }[])
                .map((la) => la.label)
                .filter(Boolean)
            : [];

        return {
            ...t,
            labels: labels,
            comment_count: 0
        };
    });

    // Fetch workspace profiles
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    let profiles: any[] = [];
    if (currentUserProfile?.workspace_id) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('workspace_id', currentUserProfile.workspace_id)
            .order('full_name');
        profiles = data || [];
    }

    return <TasksClient tasks={tasks} userId={user?.id || ""} profiles={profiles} />;
}
