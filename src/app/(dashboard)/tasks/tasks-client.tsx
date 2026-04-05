"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Plus, X, ListTodo } from "lucide-react"
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
import { CreateViewDialog } from "@/components/common/create-view-dialog"
import {
    TaskView,
    TaskViewFilters,
    createTaskView,
    deleteTaskView,
} from "@/lib/table-views"
import { cn } from "@/lib/utils"
import { TableView } from "@/lib/table-views"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"

// ── Filter sections config ────────────────────────────────────────────────────

const TASK_FILTER_SECTIONS = [
    {
        sectionLabel: "Status",
        key: "statuses",
        optional: true,
        options: [
            { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "cancelled", label: "Cancelled" },
        ],
    },
    {
        sectionLabel: "Priority",
        key: "priorities",
        optional: true,
        options: [
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
        ],
    },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface TasksClientProps {
    tasks: Task[]
    totalCount: number
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
    initialViews?: TaskView[]
}

export function TasksClient({
    tasks,
    statusCounts,
    priorityCounts,
    initialViews = [],
}: TasksClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)

    const [selectedTask, setSelectedTask] = useState<Task | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<TaskView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

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

    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Derived data ────────────────────────────────────────────────────────

    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

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

        // Status filter — view overrides manual selection
        const effectiveStatuses =
            activeView?.filters.statuses && activeView.filters.statuses.length > 0
                ? activeView.filters.statuses
                : selectedStatuses
        if (effectiveStatuses.length > 0) {
            result = result.filter((t) =>
                effectiveStatuses.includes(t.status as TaskStatus)
            )
        }

        // Priority filter — view overrides manual selection
        const effectivePriorities =
            activeView?.filters.priorities && activeView.filters.priorities.length > 0
                ? activeView.filters.priorities
                : selectedPriorities
        if (effectivePriorities.length > 0) {
            result = result.filter((t) =>
                effectivePriorities.includes(t.priority as TaskPriority)
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
    }, [tasks, search, selectedStatuses, selectedPriorities, activeView, sortConfig])

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

    function handleViewCreated(view: TableView) {
        setViews((prev) => [...prev, view as TaskView])
        setActiveViewId(view.id)
    }

    async function handleSaveView(name: string, filters: Record<string, string[]>) {
        return createTaskView(name, filters as TaskViewFilters)
    }

    function handleDeleteView(viewId: string) {
        setDeletingViewId(viewId)
    }

    async function confirmDeleteView() {
        if (!deletingViewId) return
        const id = deletingViewId
        setDeletingViewId(null)

        startDeleteTransition(async () => {
            const result = await deleteTaskView(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setViews((prev) => prev.filter((v) => v.id !== id))
            if (activeViewId === id) setActiveViewId(null)
            toast.success("View deleted")
        })
    }

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        !activeView &&
        (search.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedPriorities.length > 0 ||
            hiddenColumns.size > 0)

    function formatLabel(s: string) {
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
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <TopbarSearchAction
                            value={search}
                            onChange={setSearch}
                            placeholder="Search tasks..."
                            items={filteredTasks.slice(0, 8).map((task) => ({
                                id: task.id,
                                label: task.title,
                                actionLabel: "Open",
                            }))}
                            onSelect={(taskId) => {
                                const task = filteredTasks.find((item) => item.id === taskId)
                                if (!task) return
                                handleViewTask(task)
                            }}
                            emptyText="No matching tasks."
                        />
                        <CreateTaskDialog>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                                New task
                            </Button>
                        </CreateTaskDialog>
                    </div>
                }
            />

            {/* Action Bar + View Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-3.5 pb-3.5 shrink-0 flex-wrap gap-3 border-b border-border/45">
                <div className="flex items-center gap-2 flex-wrap min-h-8">
                    {/* Custom view tabs */}
                    {views.map((view) => (
                        <span key={view.id} className="relative group/view inline-flex items-center">
                            <button
                                onClick={() => setActiveViewId(view.id)}
                                className={cn(
                                    "rounded-full border pl-3.5 pr-7 py-1.5 text-[11px] leading-none transition-all shadow-sm",
                                    activeViewId === view.id
                                        ? "bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))] border-transparent font-semibold"
                                        : "bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-[hsl(var(--chip-active-text))] font-medium"
                                )}
                            >
                                {view.name}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteView(view.id)
                                }}
                                title="Delete view"
                                className={cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2",
                                    "flex items-center justify-center h-3.5 w-3.5 rounded-full",
                                    "opacity-0 group-hover/view:opacity-100 transition-opacity",
                                    activeViewId === view.id
                                        ? "text-muted-foreground/70 hover:text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <X className="h-2.5 w-2.5 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}

                    {/* Clear active view button */}
                    {activeViewId && (
                        <button
                            onClick={() => setActiveViewId(null)}
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                        >
                            Clear view
                        </button>
                    )}

                    <CreateViewDialog
                        filterSections={TASK_FILTER_SECTIONS}
                        onSave={handleSaveView}
                        onCreated={handleViewCreated}
                    />
                </div>

            </div>

            {/* View filter summary bar */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {activeView.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {formatLabel(s)}
                        </span>
                    ))}
                    {activeView.filters.priorities?.map((p) => (
                        <span key={p} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none capitalize">
                            {p}
                        </span>
                    ))}
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Active filter chips (hidden when selection bar or view is showing) */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
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
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]"
                        >
                            {formatLabel(s)}
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
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))] capitalize"
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
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
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
                        className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <TasksTable
                    tasks={filteredTasks}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={activeView?.filters.statuses as TaskStatus[] ?? selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={activeView ? undefined : handleStatusToggle}
                    selectedPriorities={activeView?.filters.priorities as TaskPriority[] ?? selectedPriorities}
                    priorityCounts={priorityCounts}
                    onPriorityToggle={activeView ? undefined : handlePriorityToggle}
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

            {/* Floating bulk selection pill */}
            {mounted && selectedRows.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 pointer-events-none w-[90vw] sm:w-auto justify-center">
                    <BulkSelectionBar
                        selectedCount={selectedRows.size}
                        onClear={() => setSelectedRows(new Set())}
                        onDelete={() => setShowBulkDeleteDialog(true)}
                        isDeleting={isBulkDeleting}
                    />
                </div>,
                document.body
            )}

            {/* Delete view confirmation */}
            <AlertDialog
                open={!!deletingViewId}
                onOpenChange={(o) => { if (!o) setDeletingViewId(null) }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this view?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This view will be removed for everyone in your workspace.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingViewId(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteView}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete view
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
