"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { Eye, Trash2, CheckSquare } from "lucide-react"
import { format } from "date-fns"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import {
    StandardActionsHeadCell,
    StandardSelectAllHeadCell,
    StandardSelectableRow,
    StandardTableShell,
} from "@/components/ui/standard-data-table"

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

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    pending: "warning",
    in_progress: "info",
    completed: "neutral",
    cancelled: "danger",
}

// ── Props ───────────────────────────────────────────────────────────────────

interface TasksTableProps {
    tasks: Task[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Column visibility
    hiddenColumns?: Set<string>
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
    hiddenColumns = new Set(),
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
            <StandardTableShell className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="table-header-row-standard">
                        <StandardSelectAllHeadCell
                            checked={allSelected}
                            onToggle={() => onToggleAllRows?.()}
                            className="w-10 table-cell-check static px-[var(--table-cell-px)] py-[var(--table-row-py)] backdrop-blur-none"
                        />

                        {/* Title */}
                        {!hiddenColumns.has("title") && (
                            <SortableTableHeader
                                sortKey="title"
                                label="Title"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Status */}
                        {!hiddenColumns.has("status") && (
                            <SortableTableHeader
                                sortKey="status"
                                label="Status"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                className="w-[160px]"
                            />
                        )}

                        {/* Priority */}
                        {!hiddenColumns.has("priority") && (
                            <SortableTableHeader
                                sortKey="priority"
                                label="Priority"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                className="w-[120px]"
                            />
                        )}

                        {/* Assignee */}
                        {!hiddenColumns.has("assignee") && (
                            <SortableTableHeader
                                sortKey="assignee"
                                label="Assignee"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                className="w-[160px]"
                            />
                        )}

                        {/* Due Date */}
                        {!hiddenColumns.has("due_date") && (
                            <SortableTableHeader
                                sortKey="due_date"
                                label="Due Date"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                className="w-[130px]"
                            />
                        )}

                        <StandardActionsHeadCell className="static backdrop-blur-none" />
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
                            <StandardSelectableRow
                                key={task.id}
                                id={task.id}
                                selected={selectedRows.has(task.id)}
                                onToggle={onToggleRow}
                                className="focus-within:bg-transparent focus-within:shadow-none"
                                actions={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TableRowActionTrigger />
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
                                }
                            >
                                {/* Title */}
                                {!hiddenColumns.has("title") && (
                                    <TableCell className="table-cell-title">
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
                                    <TableCell className="table-cell-meta !px-2">
                                        <StatusIndicator
                                            label={formatLabel(task.status)}
                                            tone={STATUS_TONES[task.status] || "neutral"}
                                            className="text-[11.5px] text-foreground/66"
                                        />
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                                        {task.priority ? formatLabel(task.priority) : "—"}
                                    </TableCell>
                                )}

                                {/* Assignee */}
                                {!hiddenColumns.has("assignee") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                                        {task.assignee?.full_name || "—"}
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                        {task.due_date
                                            ? format(
                                                  new Date(task.due_date),
                                                  "MMM d, yyyy"
                                              )
                                            : "—"}
                                    </TableCell>
                                )}
                            </StandardSelectableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </StandardTableShell>

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
