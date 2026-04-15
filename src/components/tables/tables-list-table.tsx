"use client"

import Link from "next/link"
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
import { Table2, Settings2, Trash2, Star, StarOff } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import type { DynamicTable } from "@/types/table-types"
import { toggleFavorite } from "@/lib/actions/navigation-actions"
import { useNavigationStore } from "@/stores/navigation-store"
import { toast } from "@/lib/toast"
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
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TableWithCount = DynamicTable & { row_count: number }

// ── Props ─────────────────────────────────────────────────────────────────────

interface TablesListTableProps {
    tables: TableWithCount[]
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
    onDelete?: (id: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TablesListTable({
    tables,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onDelete,
}: TablesListTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<TableWithCount | null>(null)
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

    const allSelected = tables.length > 0 && selectedRows.size === tables.length

    const handleFavoriteToggle = async (table: TableWithCount) => {
        const navigationItem = {
            id: table.id,
            entityType: "table" as const,
            title: table.name,
            href: `/tables/${table.id}`,
            icon: "table" as const,
            parentTitle: null,
        }
        const currentlyFavorite = isFavorite("table", table.id)
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

    const visibleColumns =
        ["name", "row_count", "created_at"].filter(
            (c) => !hiddenColumns.has(c)
        ).length + 2 // +2 for checkbox + actions

    return (
        <>
            <StandardTableShell variant="app" className="overflow-hidden">
            <Table className={standardTableVariants({ density: "compact", dividers: "subtle" })}>
                <TableHeader className={standardTableHeaderVariants({ sticky: true, variant: "app" })}>
                    <TableRow className={standardTableHeaderRowVariants({ variant: "app" })}>
                        {/* Checkbox */}
                        <StandardSelectAllHeadCell
                            checked={allSelected}
                            onToggle={() => onToggleAllRows?.()}
                            variant="app"
                        />

                        {/* Name */}
                        {!hiddenColumns.has("name") && (
                            <SortableTableHeader
                                sortKey="name"
                                label="Name"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Rows */}
                        {!hiddenColumns.has("row_count") && (
                            <SortableTableHeader
                                sortKey="row_count"
                                label="Rows"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[100px]"
                            />
                        )}

                        {/* Created */}
                        {!hiddenColumns.has("created_at") && (
                            <SortableTableHeader
                                sortKey="created_at"
                                label="Created"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[140px]"
                            />
                        )}

                        {/* Actions */}
                        <StandardActionsHeadCell variant="app" />
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {tables.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={visibleColumns} className="h-32 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Table2 className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">No tables found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        tables.map((table) => (
                            <StandardSelectableRow
                                key={table.id}
                                id={table.id}
                                selected={selectedRows.has(table.id)}
                                onToggle={onToggleRow}
                                className="focus-within:bg-transparent focus-within:shadow-none"
                                actions={
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <TableRowActionTrigger />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tables/${table.id}`}>
                                                    <Table2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                    Open
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tables/${table.id}/settings`}>
                                                    <Settings2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                    Settings
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => void handleFavoriteToggle(table)}>
                                                {isFavorite("table", table.id) ? (
                                                    <StarOff className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                ) : (
                                                    <Star className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                )}
                                                {isFavorite("table", table.id)
                                                    ? "Remove from favorites"
                                                    : "Add to favorites"}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteTarget(table)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                }
                            >

                                {/* Name */}
                                {!hiddenColumns.has("name") && (
                                    <TableCell className="table-cell-title">
                                        <Link
                                            href={`/tables/${table.id}`}
                                            className="table-cell-link flex items-center gap-2"
                                        >
                                            {table.icon ? (
                                                <span className="text-base leading-none">{table.icon}</span>
                                            ) : (
                                                <Table2 className="h-4 w-4 text-muted-foreground shrink-0 stroke-[1.6]" />
                                            )}
                                            {table.name}
                                        </Link>
                                    </TableCell>
                                )}

                                {/* Rows */}
                                {!hiddenColumns.has("row_count") && (
                                    <TableCell className="table-cell-meta tabular-nums">
                                        {table.row_count.toLocaleString()}
                                    </TableCell>
                                )}

                                {/* Created */}
                                {!hiddenColumns.has("created_at") && (
                                    <TableCell className="table-cell-meta">
                                        {format(new Date(table.created_at), "MMM d, yyyy")}
                                    </TableCell>
                                )}
                            </StandardSelectableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </StandardTableShell>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Table</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.name}&quot;?
                            This will permanently delete the table and all its data. This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
