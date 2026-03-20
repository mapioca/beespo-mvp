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
import { MoreHorizontal, Eye, Trash2, MessagesSquare } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"

// ── Types ───────────────────────────────────────────────────────────────────

export type DiscussionStatus = "new" | "active" | "decision_required" | "monitoring" | "resolved" | "deferred"
export type DiscussionPriority = "low" | "medium" | "high"
export type DiscussionCategory = "general" | "budget" | "personnel" | "programs" | "facilities" | "welfare" | "youth" | "activities"

export interface Discussion {
    id: string
    title: string
    description?: string | null
    category: string
    status: string
    priority: string
    due_date?: string | null
    workspace_discussion_id?: string | null
    created_at: string
    created_by?: string | null
    creator?: { full_name?: string | null } | null
}

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "active", label: "Active" },
    { value: "decision_required", label: "Decision Required" },
    { value: "monitoring", label: "Monitoring" },
    { value: "resolved", label: "Resolved" },
    { value: "deferred", label: "Deferred" },
]

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
]

const CATEGORY_OPTIONS = [
    { value: "general", label: "General" },
    { value: "budget", label: "Budget" },
    { value: "personnel", label: "Personnel" },
    { value: "programs", label: "Programs" },
    { value: "facilities", label: "Facilities" },
    { value: "welfare", label: "Welfare" },
    { value: "youth", label: "Youth" },
    { value: "activities", label: "Activities" },
]

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function getStatusStyle(status: string): string {
    switch (status) {
        case "new":
            return "bg-blue-50 text-blue-700"
        case "active":
            return "bg-emerald-50 text-emerald-700"
        case "decision_required":
            return "bg-rose-50 text-rose-700"
        case "monitoring":
            return "bg-amber-50 text-amber-700"
        case "resolved":
            return "bg-gray-100 text-gray-600"
        case "deferred":
            return "bg-purple-50 text-purple-700"
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

function getCategoryStyle(category: string): string {
    switch (category) {
        case "general":
            return "bg-gray-100 text-gray-600"
        case "budget":
            return "bg-emerald-50 text-emerald-700"
        case "personnel":
            return "bg-blue-50 text-blue-700"
        case "programs":
            return "bg-purple-50 text-purple-700"
        case "facilities":
            return "bg-amber-50 text-amber-700"
        case "welfare":
            return "bg-rose-50 text-rose-700"
        case "youth":
            return "bg-cyan-50 text-cyan-700"
        case "activities":
            return "bg-orange-50 text-orange-700"
        default:
            return "bg-gray-100 text-gray-600"
    }
}

// ── Props ───────────────────────────────────────────────────────────────────

interface DiscussionsTableProps {
    discussions: Discussion[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search (applied from Title header)
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: DiscussionStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Priority filter
    selectedPriorities?: DiscussionPriority[]
    priorityCounts?: Record<string, number>
    onPriorityToggle?: (priority: string) => void
    // Category filter
    selectedCategories?: DiscussionCategory[]
    categoryCounts?: Record<string, number>
    onCategoryToggle?: (category: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
    // Actions
    onViewDiscussion?: (discussion: Discussion) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function DiscussionsTable({
    discussions,
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
    selectedCategories = [],
    categoryCounts,
    onCategoryToggle,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewDiscussion,
    onDelete,
}: DiscussionsTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Discussion | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        discussions.length > 0 && selectedRows.size === discussions.length

    // Count visible columns for empty state colspan
    const visibleColumns =
        ["title", "category", "status", "priority", "due_date"]
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
                                searchPlaceholder="Search discussions..."
                                onHide={() => onHideColumn?.("title")}
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Category */}
                        {!hiddenColumns.has("category") && (
                            <DataTableColumnHeader
                                label="Category"
                                sortActive={sortConfig?.key === "category"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("category", "asc")}
                                onSortDesc={() => onSort?.("category", "desc")}
                                filterOptions={CATEGORY_OPTIONS.map((opt) => ({
                                    ...opt,
                                    count: categoryCounts?.[opt.value] || 0,
                                }))}
                                selectedFilters={selectedCategories}
                                onFilterToggle={onCategoryToggle}
                                onHide={() => onHideColumn?.("category")}
                                className="w-[180px]"
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
                    {discussions.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <MessagesSquare className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        No discussions found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        discussions.map((discussion) => (
                            <TableRow
                                key={discussion.id}
                                className="group"
                            >
                                {/* Checkbox */}
                                <TableCell className="px-3">
                                    <Checkbox
                                        checked={selectedRows.has(discussion.id)}
                                        onCheckedChange={() =>
                                            onToggleRow?.(discussion.id)
                                        }
                                    />
                                </TableCell>

                                {/* Title */}
                                {!hiddenColumns.has("title") && (
                                    <TableCell className="font-medium px-3">
                                        <button
                                            onClick={() =>
                                                onViewDiscussion?.(discussion)
                                            }
                                            className="hover:underline text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span>
                                                    {discussion.title}
                                                </span>
                                                {discussion.description && (
                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                        {discussion.description}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </TableCell>
                                )}

                                {/* Category */}
                                {!hiddenColumns.has("category") && (
                                    <TableCell className="px-3">
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold whitespace-nowrap",
                                                getCategoryStyle(
                                                    discussion.category
                                                )
                                            )}
                                        >
                                            {formatLabel(discussion.category)}
                                        </span>
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="px-3">
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold",
                                                getStatusStyle(
                                                    discussion.status
                                                )
                                            )}
                                        >
                                            {formatLabel(discussion.status)}
                                        </span>
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="px-3">
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold",
                                                getPriorityStyle(
                                                    discussion.priority
                                                )
                                            )}
                                        >
                                            {formatLabel(discussion.priority)}
                                        </span>
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="px-3 text-muted-foreground">
                                        {discussion.due_date
                                            ? format(
                                                  new Date(discussion.due_date),
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
                                                    onViewDiscussion?.(
                                                        discussion
                                                    )
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
                                                            setDeleteTarget(
                                                                discussion
                                                            )
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
                        <AlertDialogTitle>
                            Delete Discussion
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {deleteTarget?.title}&quot;? This action
                            cannot be undone.
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
