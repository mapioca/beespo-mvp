import { createClient } from "@/lib/supabase/server";
import { TasksClient } from "./tasks-client";
import { Database } from "@/types/database";

type TaskWithRelations = Database['public']['Tables']['tasks']['Row'] & {
    assignee: { full_name: string; email: string } | null;
    labels: { label: { id: string; name: string; color: string } }[];
};

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

    if (!user) {
        return null; // Or redirect, assuming middleware handles protection
    }

    // Fetch workspace profiles
    const { data: rawProfile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    const currentUserProfile = rawProfile as { workspace_id: string | null } | null;

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

    return <TasksClient tasks={tasks} userId={user?.id || ""} profiles={profiles} />;
}
