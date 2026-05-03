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
import { Eye, Trash2, MessagesSquare, Star, StarOff } from "lucide-react"
import { format } from "date-fns"
import Link from "next/link"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import {
    StandardActionsHeadCell,
    StandardSelectAllHeadCell,
    StandardSelectableRow,
    StandardTableShell,
} from "@/components/ui/standard-data-table"
import {
    standardTableHeaderRowVariants,
    standardTableHeaderVariants,
    standardTableVariants,
} from "@/components/ui/table-standard"
import { toggleFavorite } from "@/lib/actions/navigation-actions"
import { useNavigationStore } from "@/stores/navigation-store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

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

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}
function PriorityBars({ priority }: { priority: string }) {
    const level = priority === "high" ? 3 : priority === "medium" ? 2 : 1

    return (
        <span
            className="inline-flex items-end gap-0.5 text-foreground/58"
            aria-label={formatLabel(priority)}
            title={formatLabel(priority)}
        >
            {[0, 1, 2].map((index) => (
                <span
                    key={index}
                    className={cn(
                        "w-1 rounded-full bg-current transition-opacity",
                        index === 0 && "h-2",
                        index === 1 && "h-3",
                        index === 2 && "h-4",
                        index < level ? "opacity-100" : "opacity-20"
                    )}
                />
            ))}
        </span>
    )
}

// ── Props ───────────────────────────────────────────────────────────────────

interface DiscussionsTableProps {
    discussions: Discussion[]
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
    onViewDiscussion?: (discussion: Discussion) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function DiscussionsTable({
    discussions,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
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
            href: "/discussions",
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
            <StandardTableShell variant="app" className="overflow-hidden">
            <Table className={standardTableVariants({ density: "compact", dividers: "subtle" })}>
                <TableHeader className={standardTableHeaderVariants({ sticky: true, variant: "app" })}>
                    <TableRow className={standardTableHeaderRowVariants({ variant: "app" })}>
                        <StandardSelectAllHeadCell
                            checked={allSelected}
                            onToggle={() => onToggleAllRows?.()}
                            variant="app"
                        />

                        {/* Title */}
                        {!hiddenColumns.has("title") && (
                            <SortableTableHeader
                                sortKey="title"
                                label="Title"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Category */}
                        {!hiddenColumns.has("category") && (
                            <SortableTableHeader
                                sortKey="category"
                                label="Category"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[180px]"
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
                                variant="app"
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
                                variant="app"
                                className="w-[120px]"
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
                                variant="app"
                                className="w-[130px]"
                            />
                        )}

                        <StandardActionsHeadCell variant="app" />
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
                            <StandardSelectableRow
                                key={discussion.id}
                                id={discussion.id}
                                selected={selectedRows.has(discussion.id)}
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
                                }
                            >
                                {/* Title */}
                                {!hiddenColumns.has("title") && (
                                    <TableCell className="table-cell-title">
                                        <Link
                                            href="/discussions"
                                            className="table-cell-link text-left"
                                        >
                                            <span>{discussion.title}</span>
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
                                    <TableCell className="table-cell-meta !px-2 capitalize text-[11.5px] text-foreground/66">
                                        {formatLabel(discussion.status)}
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 capitalize">
                                        <PriorityBars priority={discussion.priority} />
                                    </TableCell>
                                )}

                                {/* Due Date */}
                                {!hiddenColumns.has("due_date") && (
                                    <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                        {discussion.due_date
                                            ? format(
                                                  new Date(discussion.due_date),
                                                  "MMM d"
                                              )
                                            : null}
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
