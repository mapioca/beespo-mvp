"use client"

import React, { useState } from "react"
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
import { Eye, Trash2, Briefcase, CircleDashed, CircleCheck } from "lucide-react"
import { format } from "date-fns"
import type { BusinessItemDetails } from "@/lib/business-script-generator"
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

// ── Types ───────────────────────────────────────────────────────────────────

export type BusinessStatus = "pending" | "completed"
export type BusinessCategory =
    | "sustaining"
    | "release"
    | "confirmation"
    | "ordination"
    | "other"

export interface BusinessItem {
    id: string
    person_name: string
    position_calling?: string | null
    category: string
    status: string
    action_date?: string | null
    notes?: string | null
    details?: BusinessItemDetails | null
    workspace_business_id?: string | null
    created_at: string
    created_by?: string | null
    creator?: { full_name?: string | null } | null
}

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatCategory(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    pending: "warning",
    completed: "neutral",
}

const STATUS_ICONS: Record<string, React.ElementType> = {
    pending: CircleDashed,
    completed: CircleCheck,
}

// ── Props ───────────────────────────────────────────────────────────────────

interface BusinessTableProps {
    items: BusinessItem[]
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
    onViewItem?: (item: BusinessItem) => void
    onDeleteItem?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function BusinessTable({
    items,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewItem,
    onDeleteItem,
}: BusinessTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<BusinessItem | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDeleteItem) return
        setIsDeleting(true)
        await onDeleteItem(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        items.length > 0 && selectedRows.size === items.length

    // Count visible columns for empty state colspan
    const visibleColumns =
        ["person_name", "position_calling", "category", "status", "action_date"]
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

                        {/* Member */}
                        {!hiddenColumns.has("person_name") && (
                            <SortableTableHeader
                                sortKey="person_name"
                                label="Member"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="min-w-[200px]"
                            />
                        )}

                        {/* Calling */}
                        {!hiddenColumns.has("position_calling") && (
                            <SortableTableHeader
                                sortKey="position_calling"
                                label="Calling"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
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
                                className="w-[140px]"
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

                        {/* Action Date */}
                        {!hiddenColumns.has("action_date") && (
                            <SortableTableHeader
                                sortKey="action_date"
                                label="Action Date"
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
                    {items.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Briefcase className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">
                                        No business items found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <StandardSelectableRow
                                key={item.id}
                                id={item.id}
                                selected={selectedRows.has(item.id)}
                                onToggle={onToggleRow}
                                onRowClick={onViewItem ? () => onViewItem(item) : undefined}
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
                                                    onViewItem?.(item)
                                                }
                                            >
                                                <Eye className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                View
                                            </DropdownMenuItem>
                                            {onDeleteItem && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                item
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
                                {/* Person Name */}
                                {!hiddenColumns.has("person_name") && (
                                    <TableCell className="table-cell-title">
                                        <button
                                            onClick={() =>
                                                onViewItem?.(item)
                                            }
                                            className="table-cell-link text-left"
                                        >
                                            {item.person_name}
                                        </button>
                                    </TableCell>
                                )}

                                {/* Position/Calling */}
                                {!hiddenColumns.has("position_calling") && (
                                    <TableCell className="table-cell-meta">
                                        {item.position_calling || "—"}
                                    </TableCell>
                                )}

                                {/* Category */}
                                {!hiddenColumns.has("category") && (
                                    <TableCell className="table-cell-meta capitalize">
                                        {formatCategory(item.category)}
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="table-cell-meta">
                                        {(() => {
                                            const Icon = STATUS_ICONS[item.status] ?? CircleDashed;
                                            const tone = STATUS_TONES[item.status] ?? "neutral";
                                            const iconClass = {
                                                neutral: "text-zinc-400/70",
                                                warning: "text-amber-500/80",
                                                success: "text-emerald-500/80",
                                                info: "text-blue-400/80",
                                                danger: "text-rose-500/80",
                                            }[tone];
                                            return <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} />;
                                        })()}
                                    </TableCell>
                                )}

                                {/* Action Date */}
                                {!hiddenColumns.has("action_date") && (
                                    <TableCell className="table-cell-meta">
                                        {item.action_date ? (
                                            <span className="text-[11.5px] font-medium text-foreground/66">
                                                {format(new Date(item.action_date), "MMM d, yyyy")}
                                            </span>
                                        ) : null}
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
                            Delete Business Item
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {deleteTarget?.person_name}&quot;? This action
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
