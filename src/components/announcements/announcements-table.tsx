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
import { Megaphone, Eye, Trash2 } from "lucide-react"
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
import {
    standardTableHeaderRowVariants,
    standardTableHeaderVariants,
    standardTableVariants,
} from "@/components/ui/table-standard"

// ── Types ───────────────────────────────────────────────────────────────────

export type AnnouncementStatus = "draft" | "active" | "stopped"
export type AnnouncementPriority = "low" | "medium" | "high"

export interface Announcement {
    id: string
    title: string
    content?: string | null
    priority: string
    status: string
    deadline?: string | null
    display_start?: string | null
    display_until?: string | null
    workspace_announcement_id?: string | null
    created_at: string
    created_by?: string | null
    creator?: { full_name?: string | null } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

/** Strip HTML tags and collapse whitespace for plain-text preview. */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
}

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    draft: "neutral",
    active: "success",
    stopped: "danger",
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AnnouncementsTableProps {
    announcements: Announcement[]
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
    onViewAnnouncement?: (announcement: Announcement) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function AnnouncementsTable({
    announcements,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewAnnouncement,
    onDelete,
}: AnnouncementsTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        announcements.length > 0 &&
        selectedRows.size === announcements.length

    const visibleColumns =
        ["title", "priority", "status", "deadline"].filter(
            (c) => !hiddenColumns.has(c)
        ).length + 2 // +2 for checkbox + actions

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

                        {/* Status */}
                        {!hiddenColumns.has("status") && (
                            <SortableTableHeader
                                sortKey="status"
                                label="Status"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[120px]"
                            />
                        )}

                        {/* Deadline */}
                        {!hiddenColumns.has("deadline") && (
                            <SortableTableHeader
                                sortKey="deadline"
                                label="Deadline"
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
                    {announcements.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Megaphone className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">
                                        No announcements found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        announcements.map((announcement) => (
                            <StandardSelectableRow
                                key={announcement.id}
                                id={announcement.id}
                                selected={selectedRows.has(announcement.id)}
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
                                                    onViewAnnouncement?.(
                                                        announcement
                                                    )
                                                }
                                            >
                                                <Eye className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                View
                                            </DropdownMenuItem>
                                            {onDelete && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                announcement
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
                                        <button
                                            onClick={() =>
                                                onViewAnnouncement?.(
                                                    announcement
                                                )
                                            }
                                            className="hover:underline text-left"
                                        >
                                            <div className="flex flex-col">
                                                <span>
                                                    {announcement.title}
                                                </span>
                                                {announcement.content && (
                                                    <span className="text-[12px] text-muted-foreground/80 truncate max-w-[280px]">
                                                        {stripHtml(announcement.content)}
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                    </TableCell>
                                )}

                                {/* Priority */}
                                {!hiddenColumns.has("priority") && (
                                    <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 capitalize">
                                        {announcement.priority}
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="table-cell-meta !px-2 capitalize">
                                        <StatusIndicator
                                            label={formatStatus(announcement.status)}
                                            tone={STATUS_TONES[announcement.status] || "neutral"}
                                            className="text-[11.5px] text-foreground/66"
                                        />
                                    </TableCell>
                                )}

                                {/* Deadline */}
                                {!hiddenColumns.has("deadline") && (
                                    <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                        {announcement.deadline
                                            ? format(
                                                  new Date(
                                                      announcement.deadline
                                                  ),
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
                        <AlertDialogTitle>
                            Delete Announcement
                        </AlertDialogTitle>
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
