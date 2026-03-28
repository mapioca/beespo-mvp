"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2, ListTodo } from "lucide-react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/lib/toast"
import { deleteTask } from "@/lib/actions/task-actions"
import { createClient } from "@/lib/supabase/client"
import {
    TasksTable,
    Task,
    TaskStatus,
    TaskPriority,
} from "@/components/tasks/tasks-table"
import { TaskDetailsSheet } from "@/components/tasks/task-details-sheet"
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog"

interface TasksClientProps {
    tasks: Task[]
    totalCount: number
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
}

export function TasksClient({
    tasks,
    statusCounts,
    priorityCounts,
}: TasksClientProps) {
    const router = useRouter()
    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([])
    const [selectedPriorities, setSelectedPriorities] = useState<
        TaskPriority[]
    >([])

    // Sort
    const [sortConfig, setSortConfig] = useState<{
        key: string
        direction: "asc" | "desc"
    } | null>(null)

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

    // Row selection
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    // Bulk delete
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // ── Derived data ────────────────────────────────────────────────────────

    const filteredTasks = useMemo(() => {
        let result = tasks

        // Search (client-side on title, description, workspace id)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (t) =>
                    t.title?.toLowerCase().includes(q) ||
                    t.description?.toLowerCase().includes(q) ||
                    t.workspace_task_id?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (selectedStatuses.length > 0) {
            result = result.filter((t) =>
                selectedStatuses.includes(t.status as TaskStatus)
            )
        }

        // Priority filter
        if (selectedPriorities.length > 0) {
            result = result.filter((t) =>
                selectedPriorities.includes(t.priority as TaskPriority)
            )
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any =
                    key === "assignee"
                        ? a.assignee?.full_name || ""
                        : a[key as keyof Task]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any =
                    key === "assignee"
                        ? b.assignee?.full_name || ""
                        : b[key as keyof Task]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1

                if (key === "priority") {
                    const order = { high: 1, medium: 2, low: 3 }
                    aValue = order[aValue as keyof typeof order] || 99
                    bValue = order[bValue as keyof typeof order] || 99
                }

                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [tasks, search, selectedStatuses, selectedPriorities, sortConfig])

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleSort = useCallback(
        (key: string, direction: "asc" | "desc") => {
            setSortConfig((current) => {
                if (
                    current?.key === key &&
                    current.direction === direction
                )
                    return null
                return { key, direction }
            })
        },
        []
    )

    const handleStatusToggle = useCallback((status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status as TaskStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as TaskStatus]
        )
    }, [])

    const handlePriorityToggle = useCallback((priority: string) => {
        setSelectedPriorities((prev) =>
            prev.includes(priority as TaskPriority)
                ? prev.filter((p) => p !== priority)
                : [...prev, priority as TaskPriority]
        )
    }, [])

    const handleHideColumn = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            next.add(column)
            return next
        })
    }, [])

    const handleToggleRow = useCallback((id: string) => {
        setSelectedRows((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleToggleAllRows = useCallback(() => {
        setSelectedRows((prev) => {
            if (prev.size === filteredTasks.length) return new Set()
            return new Set(filteredTasks.map((t) => t.id))
        })
    }, [filteredTasks])

    const handleDelete = async (id: string) => {
        const result = await deleteTask(id)
        if (result.success) {
            toast.success("Task deleted.")
            router.refresh()
        } else {
            toast.error(result.error || "Failed to delete task.")
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        const { error } = await supabase
            .from("tasks")
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete items")
        } else {
            toast.success(
                `${ids.length} task${ids.length > 1 ? "s" : ""} deleted`
            )
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    const handleViewTask = (task: Task) => {
        setSelectedTask(task)
        setDrawerOpen(true)
    }

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedPriorities.length > 0 ||
        hiddenColumns.size > 0

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Tasks", icon: <ListTodo className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between w-full px-6 pt-5 pb-4 shrink-0 flex-wrap gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Placeholder for future tabs */}
                </div>

                <CreateTaskDialog>
                    <Button variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border hover:bg-stone-200 hover:text-foreground hover:border-stone-200 transition-all shadow-sm">
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        New
                    </Button>
                </CreateTaskDialog>
            </div>

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="text-xs font-medium tabular-nums">
                        {selectedRows.size} selected
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setShowBulkDeleteDialog(true)}
                    >
                        <Trash2 className="mr-1.5 h-3 w-3" />
                        Delete
                    </Button>
                    <button
                        onClick={() => setSelectedRows(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    >
                        Deselect all
                    </button>
                </div>
            )}

            {/* Active filter chips (hidden when selection bar is showing) */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {formatStatusLabel(s)}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {selectedPriorities.map((p) => (
                        <span
                            key={p}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize"
                        >
                            {p}
                            <button
                                onClick={() => handlePriorityToggle(p)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button
                            onClick={() => setHiddenColumns(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                            Show all columns
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSearch("")
                            setSelectedStatuses([])
                            setSelectedPriorities([])
                            setHiddenColumns(new Set())
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6">
                <TasksTable
                    tasks={filteredTasks}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={handleStatusToggle}
                    selectedPriorities={selectedPriorities}
                    priorityCounts={priorityCounts}
                    onPriorityToggle={handlePriorityToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewTask={handleViewTask}
                    onDelete={handleDelete}
                />
            </div>

            {/* Task details sheet */}
            <TaskDetailsSheet
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                task={selectedTask as any}
            />

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} task
                            {selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected task
                            {selectedRows.size > 1 ? "s" : ""}. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isBulkDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
