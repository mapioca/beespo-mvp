"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Eye, Trash2, CheckSquare } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"

// ── Types ───────────────────────────────────────────────────────────────────

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled"
export type TaskPriority = "low" | "medium" | "high"

export interface Task {
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
    assignee?: { full_name: string; email?: string } | null
    labels?: Array<{ id: string; name: string; color: string }>
}

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
]

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
]

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function getStatusStyle(status: string): string {
    switch (status) {
        case "pending":
            return "bg-blue-50 text-blue-700"
        case "in_progress":
            return "bg-amber-50 text-amber-700"
        case "completed":
            return "bg-emerald-50 text-emerald-700"
        case "cancelled":
            return "bg-gray-100 text-gray-600"
        default:
            return "bg-gray-100 text-gray-600"
    }
}

function getPriorityStyle(priority: string): string {
    switch (priority) {
        case "high":
            return "bg-rose-50 text-rose-700"
        case "medium":
            return "bg-amber-50 text-amber-700"
        case "low":
            return "bg-gray-100 text-gray-600"
        default:
            return "bg-gray-100 text-gray-600"
    }
}

// ── Props ───────────────────────────────────────────────────────────────────

interface TasksTableProps {
    tasks: Task[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search (applied from Title header)
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: TaskStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Priority filter
    selectedPriorities?: TaskPriority[]
    priorityCounts?: Record<string, number>
    onPriorityToggle?: (priority: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
    // Actions
    onViewTask?: (task: Task) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function TasksTable({
    tasks,
    sortConfig,
    onSort,
    searchValue,
    onSearchChange,
    selectedStatuses = [],
    statusCounts,
    onStatusToggle,
    selectedPriorities = [],
    priorityCounts,
    onPriorityToggle,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewTask,
    onDelete,
}: TasksTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        tasks.length > 0 && selectedRows.size === tasks.length

    const visibleColumns =
        ["title", "status", "priority", "assignee", "due_date"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                        {/* Checkbox */}
                        <TableHead className="w-10 px-3">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => onToggleAllRows?.()}
                            />
                        </TableHead>

                        {/* Title */}
                        {!hiddenColumns.has("title") && (
                            <DataTableColumnHeader
                                label="Title"
                                sortActive={sortConfig?.key === "title"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("title", "asc")}
                                onSortDesc={() => onSort?.("title", "desc")}
                                searchable
                                searchValue={searchValue}
                                onSearchChange={onSearchChange}
                                searchPlaceholder="Search tasks..."
                                onHide={() => onHideColumn?.("title")}
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Status */}
                        {!hiddenColumns.has("status") && (
                            <DataTableColumnHeader
                                label="Status"
                                sortActive={sortConfig?.key === "status"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("status", "asc")}
                                onSortDesc={() => onSort?.("status", "desc")}
                                filterOptions={STATUS_OPTIONS.map((opt) => ({
                                    ...opt,
                                    count: statusCounts?.[opt.value] || 0,
                                }))}
                                selectedFilters={selectedStatuses}
                                onFilterToggle={onStatusToggle}
                                onHide={() => onHideColumn?.("status")}
                                className="w-[160px]"
                            />
                        )}

                        {/* Priority */}
                        {!hiddenColumns.has("priority") && (
                            <DataTableColumnHeader
                                label="Priority"
                                sortActive={sortConfig?.key === "priority"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("priority", "asc")}
                                onSortDesc={() => onSort?.("priority", "desc")}
                                filterOptions={PRIORITY_OPTIONS.map((opt) => ({
                                    ...opt,
                                    count: priorityCounts?.[opt.value] || 0,
                                }))}
                                selectedFilters={selectedPriorities}
                                onFilterToggle={onPriorityToggle}
                                onHide={() => onHideColumn?.("priority")}
                                className="w-[120px]"
                            />
                        )}

                        {/* Assignee */}
                        {!hiddenColumns.has("assignee") && (
                            <DataTableColumnHeader
                                label="Assignee"
                                sortActive={sortConfig?.key === "assignee"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("assignee", "asc")}
                                onSortDesc={() => onSort?.("assignee", "desc")}
                                onHide={() => onHideColumn?.("assignee")}
                                className="w-[160px]"
                            />
                        )}

                        {/* Due Date */}
                        {!hiddenColumns.has("due_date") && (
                            <DataTableColumnHeader
                                label="Due Date"
                                sortActive={sortConfig?.key === "due_date"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("due_date", "asc")}
                                onSortDesc={() => onSort?.("due_date", "desc")}
                                onHide={() => onHideColumn?.("due_date")}
                                className="w-[130px]"
                            />
                        )}

                        {/* Actions */}
                        <TableHead className="w-[52px]">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {tasks.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        No tasks found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        tasks.map((task) => (
                            <TableRow key={task.id} className="group">
                                {/* Checkbox */}
                                <TableCell className="px-3">
                                    <Checkbox
                                        checked={selectedRows.has(task.id)}
                                        onCheckedChange={() =>
                                            onToggleRow?.(task.id)
                                        }
                                    />
                                </TableCell>

                                {/* Title */}
                                {!hiddenColumns.has("title") && (
                                    <TableCell className="font-medium px-3">
                                        <button
                                            onClick={() => onViewTask?.(task)}
                                            className="hover:underline text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span>{task.title}</span>
                                                {task.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {task.description}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="px-3">
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold",
                                                getStatusStyle(task.status)
                                            )}
                                        >
                                            {formatLabel(task.status)}
                                        </span>
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="px-3">
                                        {task.priority ? (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold",
                                                    getPriorityStyle(task.priority)
                                                )}
                                            >
                                                {formatLabel(task.priority)}
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </TableCell>
                                )}

                                {/* Assignee */}
                                {!hiddenColumns.has("assignee") && (
                                    <TableCell className="px-3 text-sm text-muted-foreground">
                                        {task.assignee?.full_name || "—"}
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="px-3 text-muted-foreground">
                                        {task.due_date
                                            ? format(
                                                  new Date(task.due_date),
                                                  "MMM d, yyyy"
                                              )
                                            : "—"}
                                    </TableCell>
                                )}

                                {/* Actions */}
                                <TableCell className="px-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onViewTask?.(task)
                                                }
                                            >
                                                <Eye className="mr-2 h-4 w-4" />
                                                View
                                            </DropdownMenuItem>
                                            {onDelete && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(task)
                                                        }
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {deleteTarget?.title}&quot;? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
