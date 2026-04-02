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
import { Megaphone, Eye, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { StatusIndicator } from "@/components/ui/status-indicator"

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

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "stopped", label: "Stopped" },
]

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatStatus(status: string): string {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
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
    // Search (applied from Title header)
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: AnnouncementStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Priority filter
    selectedPriorities?: AnnouncementPriority[]
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
    onViewAnnouncement?: (announcement: Announcement) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function AnnouncementsTable({
    announcements,
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
                                searchPlaceholder="Search announcements..."
                                onHide={() => onHideColumn?.("title")}
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Priority */}
                        {!hiddenColumns.has("priority") && (
                            <DataTableColumnHeader
                                label="Priority"
                                sortActive={sortConfig?.key === "priority"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("priority", "asc")}
                                onSortDesc={() =>
                                    onSort?.("priority", "desc")
                                }
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
                                className="w-[120px]"
                            />
                        )}

                        {/* Deadline */}
                        {!hiddenColumns.has("deadline") && (
                            <DataTableColumnHeader
                                label="Deadline"
                                sortActive={sortConfig?.key === "deadline"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("deadline", "asc")}
                                onSortDesc={() =>
                                    onSort?.("deadline", "desc")
                                }
                                onHide={() => onHideColumn?.("deadline")}
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
                            <TableRow
                                key={announcement.id}
                                data-state={selectedRows.has(announcement.id) ? "selected" : undefined}
                                className="group transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[hsl(var(--table-row-hover))] hover:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.28)] data-[state=selected]:bg-[hsl(var(--table-row-selected))] data-[state=selected]:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.4)]"
                            >
                                {/* Checkbox */}
                                <TableCell className="table-cell-check">
                                    <Checkbox
                                        checked={selectedRows.has(
                                            announcement.id
                                        )}
                                        className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
                                        onCheckedChange={() =>
                                            onToggleRow?.(announcement.id)
                                        }
                                    />
                                </TableCell>

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
                                                        {announcement.content}
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

                                {/* Actions */}
                                <TableCell className="table-cell-actions">
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
