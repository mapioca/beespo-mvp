import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TasksClient } from "./tasks-client"
import { Metadata } from "next"

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
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const { data: profile } = await (
        supabase.from("profiles") as ReturnType<typeof supabase.from>
    )
        .select("workspace_id, role")
        .eq("id", user.id)
        .single()

    if (!profile || !profile.workspace_id) {
        redirect("/onboarding")
    }

    // Fetch all tasks (no pagination — client handles filtering/scroll)
    const { data: rawTasks, error } = await supabase
        .from("tasks")
        .select(
            `*,
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

    return (
        <TasksClient
            tasks={tasks}
            totalCount={tasks.length}
            statusCounts={statusCounts}
            priorityCounts={priorityCounts}
        />
    )
}
