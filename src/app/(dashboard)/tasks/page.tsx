import { createClient } from "@/lib/supabase/server"
import { TasksClient } from "./tasks-client"
import { Metadata } from "next"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
    title: "Tasks | Beespo",
    description: "Manage your action items and assignments",
}

type TaskWithRelations = {
    id: string
    title: string
    description?: string | null
    status: string
    priority?: string | null
    due_date?: string | null
    assigned_to?: string | null
    workspace_task_id?: string | null
    created_at: string
    created_by?: string | null
    assignee: { full_name: string; email: string } | null
    tags?: string[] | null
    labels: { label: { id: string; name: string; color: string } }[]
}

export default async function TasksPage() {
    const [{ user, profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ])

    // Fetch all tasks (no pagination — client handles filtering/scroll)
    const { data: rawTasks, error } = await supabase
        .from("tasks")
        .select(
            `id, title, description, status, priority, due_date, assigned_to, workspace_task_id, created_at, created_by,
            tags,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email),
            labels:task_label_assignments(label:task_labels(id, name, color))`
        )
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Tasks query error:", error)
        return (
            <div className="p-8">Error loading tasks. Please try again.</div>
        )
    }

    // Transform labels from nested shape to flat array
    const tasks = ((rawTasks as unknown as TaskWithRelations[]) || []).map(
        (t) => ({
            ...t,
            labels: Array.isArray(t.labels)
                ? t.labels.map((la) => la.label).filter(Boolean)
                : [],
        })
    )

    const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("workspace_id", profile.workspace_id)
        .eq("is_deleted", false)
        .order("full_name", { ascending: true })

    return (
        <TasksClient
            tasks={tasks}
            currentUserId={user.id}
            profiles={profilesData ?? []}
        />
    )
}
