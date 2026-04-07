"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
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
import { Eye, Trash2, CheckSquare, CircleDashed, CircleCheck, ChevronDown, ChevronUp, ChevronsUp, CalendarIcon, UserCircle } from "lucide-react"
import { format } from "date-fns"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import {
    StandardActionsHeadCell,
    StandardSelectAllHeadCell,
    StandardSelectableRow,
    StandardTableShell,
} from "@/components/ui/standard-data-table"
import { updateTask } from "@/lib/actions/task-actions"

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
    tags?: string[] | null
}

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
export interface Profile {
    id: string;
    full_name: string;
    email?: string;
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

    const [isUpdating, setIsUpdating] = useState<string | null>(null)
    const [profiles, setProfiles] = useState<Profile[]>([])

    // Load available profiles (members) for assignment
    useEffect(() => {
        const fetchProfiles = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('profiles')
                .select('id, full_name, email')
                .order('full_name')
            if (data) setProfiles(data)
        }
        fetchProfiles()
    }, [])

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        setIsUpdating(taskId + '-status')
        await updateTask(taskId, { status: newStatus })
        setIsUpdating(null)
    }

    const handleUpdatePriority = async (taskId: string, newPriority: "low" | "medium" | "high") => {
        setIsUpdating(taskId + '-priority')
        await updateTask(taskId, { priority: newPriority })
        setIsUpdating(null)
    }

    const handleUpdateAssignee = async (taskId: string, newAssigneeId: string | null) => {
        setIsUpdating(taskId + '-assignee')
        await updateTask(taskId, { assigned_to: newAssigneeId })
        setIsUpdating(null)
    }

    const handleUpdateDueDate = async (taskId: string, date: Date | undefined) => {
        setIsUpdating(taskId + '-duedate')
        await updateTask(taskId, { due_date: date ? format(date, 'yyyy-MM-dd') : null })
        setIsUpdating(null)
    }

    const allSelected =
        tasks.length > 0 && selectedRows.size === tasks.length

    const visibleColumns =
        ["title", "status", "priority", "tags", "assignee", "due_date"]
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

                        {/* Tags */}
                        {!hiddenColumns.has("tags") && (
                            <TableHead className="w-[160px] whitespace-nowrap px-[var(--table-cell-px)] text-xs font-semibold text-muted-foreground backdrop-blur-none bg-transparent h-10">
                                Tags
                            </TableHead>
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
                                onRowClick={onViewTask ? () => onViewTask(task) : undefined}
                                selectOnRowClick={false}
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
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button 
                                                    disabled={isUpdating === task.id + '-status'}
                                                    className="flex items-center justify-start gap-1.5 focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -ml-1.5 transition-colors text-[11.5px] text-foreground/66 font-medium leading-5 disabled:opacity-50"
                                                >
                                                    {task.status === "completed" ? (
                                                        <CircleCheck className="h-3 w-3" />
                                                    ) : (
                                                        <CircleDashed className="h-3 w-3" />
                                                    )}
                                                    <span>{formatLabel(task.status)}</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[140px]">
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'pending')}>
                                                    <div className="flex items-center gap-2">
                                                        <CircleDashed className="h-3 w-3" />
                                                        Pending
                                                    </div>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                                    <div className="flex items-center gap-2">
                                                        <CircleCheck className="h-3 w-3" />
                                                        Completed
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button 
                                                    disabled={isUpdating === task.id + '-priority'}
                                                    className="flex items-center justify-start gap-1.5 focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -ml-1.5 transition-colors font-medium leading-5 disabled:opacity-50"
                                                >
                                                    {task.priority === 'low' && <ChevronDown className="h-3 w-3" />}
                                                    {task.priority === 'medium' && <ChevronUp className="h-3 w-3" />}
                                                    {task.priority === 'high' && <ChevronsUp className="h-3 w-3" />}
                                                    <span>{task.priority ? formatLabel(task.priority) : "—"}</span>
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[140px]">
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, 'low')}>
                                                    <div className="flex items-center gap-2">
                                                        <ChevronDown className="h-3 w-3" />
                                                        Low
                                                    </div>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, 'medium')}>
                                                    <div className="flex items-center gap-2">
                                                        <ChevronUp className="h-3 w-3" />
                                                        Medium
                                                    </div>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleUpdatePriority(task.id, 'high')}>
                                                    <div className="flex items-center gap-2">
                                                        <ChevronsUp className="h-3 w-3" />
                                                        High
                                                    </div>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}

                                {/* Tags */}
                                {!hiddenColumns.has("tags") && (
                                    <TableCell className="table-cell-meta px-2">
                                        <div className="flex flex-wrap gap-1">
                                            {task.tags && task.tags.length > 0 ? (
                                                task.tags.map((tag, i) => (
                                                    <Badge key={i} variant="secondary" className="text-[10px] leading-tight px-1.5 py-0">
                                                        {tag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-[11.5px] text-foreground/56">—</span>
                                            )}
                                        </div>
                                    </TableCell>
                                )}

                                {/* Assignee */}
                                {!hiddenColumns.has("assignee") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button 
                                                    disabled={isUpdating === task.id + '-assignee'}
                                                    className="flex items-center justify-start gap-1.5 focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -ml-1.5 transition-colors disabled:opacity-50"
                                                >
                                                    {task.assignee?.full_name ? (
                                                        <>
                                                            <UserCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <span className="truncate max-w-[120px]">{task.assignee.full_name}</span>
                                                        </>
                                                    ) : "—"}
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-[180px] max-h-[300px] overflow-y-auto">
                                                <DropdownMenuItem onClick={() => handleUpdateAssignee(task.id, null)}>
                                                    <div className="flex items-center gap-2 text-muted-foreground w-full">
                                                        <UserCircle className="h-3 w-3 shrink-0" />
                                                        Unassigned
                                                    </div>
                                                </DropdownMenuItem>
                                                {profiles.length > 0 && <DropdownMenuSeparator />}
                                                {profiles.map((p) => (
                                                    <DropdownMenuItem key={p.id} onClick={() => handleUpdateAssignee(task.id, p.id)}>
                                                        <div className="flex items-center gap-2 w-full">
                                                            <UserCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                                                            <span className="truncate">{p.full_name}</span>
                                                        </div>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <button 
                                                    disabled={isUpdating === task.id + '-duedate'}
                                                    className="flex items-center justify-start gap-1.5 focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 rounded px-1.5 py-0.5 -ml-1.5 transition-colors disabled:opacity-50"
                                                >
                                                    {task.due_date ? (
                                                        <>
                                                            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <span>{format(new Date(task.due_date + "T00:00:00"), "MMM d, yyyy")}</span>
                                                        </>
                                                    ) : "—"}
                                                </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={task.due_date ? new Date(task.due_date + "T00:00:00") : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            // Keep local time components to prevent date-fns from shifting it backwards when setting states
                                                            handleUpdateDueDate(task.id, date)
                                                        } else {
                                                            handleUpdateDueDate(task.id, undefined)
                                                        }
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
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
