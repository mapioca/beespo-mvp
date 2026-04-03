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
import { Eye, Trash2, MessagesSquare, Star, StarOff } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import Link from "next/link"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { toggleFavorite } from "@/lib/actions/navigation-actions"
import { useNavigationStore } from "@/stores/navigation-store"
import { toast } from "@/lib/toast"

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

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    new: "info",
    active: "success",
    decision_required: "warning",
    monitoring: "info",
    resolved: "neutral",
    deferred: "neutral",
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
    const isFavorite = useNavigationStore((state) => state.isFavorite)
    const applyFavoriteToggle = useNavigationStore((state) => state.applyFavoriteToggle)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        discussions.length > 0 && selectedRows.size === discussions.length

    const handleFavoriteToggle = async (discussion: Discussion) => {
        const navigationItem = {
            id: discussion.id,
            entityType: "discussion" as const,
            title: discussion.title,
            href: `/meetings/discussions/${discussion.id}`,
            icon: "discussion" as const,
            parentTitle: null,
        }
        const currentlyFavorite = isFavorite("discussion", discussion.id)
        const nextFavorite = !currentlyFavorite

        applyFavoriteToggle(navigationItem, nextFavorite)

        const result = await toggleFavorite(navigationItem)
        if ("error" in result) {
            applyFavoriteToggle(navigationItem, currentlyFavorite)
            toast.error(result.error ?? "Unable to update favorite.")
            return
        }

        applyFavoriteToggle(result.item, result.favorited)
    }

    // Count visible columns for empty state colspan
    const visibleColumns =
        ["title", "category", "status", "priority", "due_date"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    return (
        <>
            <div className="table-shell-standard">
            <Table className="text-[13px]">
                <TableHeader>
                    <TableRow className="table-header-row-standard">
                        {/* Checkbox */}
                        <TableHead className="w-10 table-cell-check">
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
                                    <MessagesSquare className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
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
                                data-state={selectedRows.has(discussion.id) ? "selected" : undefined}
                                className="group transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[hsl(var(--table-row-hover))] hover:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.28)] data-[state=selected]:bg-[hsl(var(--table-row-selected))] data-[state=selected]:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.4)]"
                            >
                                {/* Checkbox */}
                                <TableCell className="table-cell-check">
                                    <Checkbox
                                        checked={selectedRows.has(discussion.id)}
                                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
                                        onCheckedChange={() =>
                                            onToggleRow?.(discussion.id)
                                        }
                                    />
                                </TableCell>

                                {/* Title */}
                                {!hiddenColumns.has("title") && (
                                    <TableCell className="table-cell-title">
                                        <Link
                                            href={`/meetings/discussions/${discussion.id}`}
                                            className="hover:underline text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span>
                                                    {discussion.title}
                                                </span>
                                                {discussion.description && (
                                                    <span className="text-[12px] text-muted-foreground/80 line-clamp-1">
                                                        {discussion.description}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                    </TableCell>
                                )}

                                {/* Category */}
                                {!hiddenColumns.has("category") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 capitalize whitespace-nowrap">
                                        {formatLabel(discussion.category)}
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="table-cell-meta !px-2 capitalize">
                                        <StatusIndicator
                                            label={formatLabel(discussion.status)}
                                            tone={STATUS_TONES[discussion.status] || "neutral"}
                                            className="text-[11.5px] text-foreground/66"
                                        />
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 capitalize">
                                        {formatLabel(discussion.priority)}
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                        {discussion.due_date
                                            ? format(
                                                  new Date(discussion.due_date),
                                                  "MMM d, yyyy"
                                              )
                                            : "—"}
                                    </TableCell>
                                )}

                                {/* Actions */}
                                <TableCell className="table-cell-actions">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TableRowActionTrigger />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onViewDiscussion?.(
                                                        discussion
                                                    )
                                                }
                                            >
                                                <Eye className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                View
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => void handleFavoriteToggle(discussion)}>
                                                {isFavorite("discussion", discussion.id) ? (
                                                    <StarOff className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                ) : (
                                                    <Star className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                )}
                                                {isFavorite("discussion", discussion.id)
                                                    ? "Remove from favorites"
                                                    : "Add to favorites"}
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
                                                        <Trash2 className="mr-2 h-4 w-4 stroke-[1.6]" />
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
            </div>

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
