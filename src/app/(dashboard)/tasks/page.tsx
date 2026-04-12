import { createClient } from "@/lib/supabase/server"
import { TasksClient } from "./tasks-client"
import { Metadata } from "next"
import { TaskView } from "@/lib/table-views"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export const metadata: Metadata = {
    title: "Tasks | Beespo",
    description: "Manage your action items and assignments",
}

export const dynamic = "force-dynamic"

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
    labels: { label: { id: string; name: string; color: string } }[]
}

export default async function TasksPage() {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ])

    // Fetch all tasks (no pagination — client handles filtering/scroll)
    const { data: rawTasks, error } = await supabase
        .from("tasks")
        .select(
            `id, title, description, status, priority, due_date, assigned_to, workspace_task_id, created_at, created_by,
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

    // Compute counts for filter badges
    const statusCounts: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
    }
    const priorityCounts: Record<string, number> = {
        low: 0,
        medium: 0,
        high: 0,
    }

    tasks.forEach((t) => {
        if (t.status in statusCounts)
            statusCounts[t.status as keyof typeof statusCounts]++
        if (t.priority && t.priority in priorityCounts)
            priorityCounts[t.priority as keyof typeof priorityCounts]++
    })

    // Fetch workspace-scoped task views
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: taskViewsData } = await (supabase.from("agenda_views") as any)
        .select("id, workspace_id, created_by, name, view_type, filters, created_at, updated_at")
        .eq("workspace_id", profile.workspace_id)
        .eq("view_type", "tasks")
        .order("created_at", { ascending: true })

    const initialViews: TaskView[] = taskViewsData ?? []

    return (
        <TasksClient
            tasks={tasks}
            totalCount={tasks.length}
            statusCounts={statusCounts}
            priorityCounts={priorityCounts}
            initialViews={initialViews}
        />
    )
}
