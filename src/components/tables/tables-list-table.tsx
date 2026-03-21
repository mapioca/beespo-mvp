"use client"

import Link from "next/link"
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
import { Table2, MoreHorizontal, Settings2, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import { useState } from "react"
import type { DynamicTable } from "@/types/table-types"

// ── Types ─────────────────────────────────────────────────────────────────────

export type TableWithCount = DynamicTable & { row_count: number }

// ── Props ─────────────────────────────────────────────────────────────────────

interface TablesListTableProps {
    tables: TableWithCount[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
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
    searchValue,
    onSearchChange,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onDelete,
}: TablesListTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<TableWithCount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected = tables.length > 0 && selectedRows.size === tables.length

    const visibleColumns =
        ["name", "row_count", "created_at"].filter(
            (c) => !hiddenColumns.has(c)
        ).length + 2 // +2 for checkbox + actions

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

                        {/* Name */}
                        {!hiddenColumns.has("name") && (
                            <DataTableColumnHeader
                                label="Name"
                                sortActive={sortConfig?.key === "name"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("name", "asc")}
                                onSortDesc={() => onSort?.("name", "desc")}
                                searchable
                                searchValue={searchValue}
                                onSearchChange={onSearchChange}
                                searchPlaceholder="Search tables..."
                                onHide={() => onHideColumn?.("name")}
                                className="min-w-[250px]"
                            />
                        )}

                        {/* Rows */}
                        {!hiddenColumns.has("row_count") && (
                            <DataTableColumnHeader
                                label="Rows"
                                sortActive={sortConfig?.key === "row_count"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("row_count", "asc")}
                                onSortDesc={() => onSort?.("row_count", "desc")}
                                onHide={() => onHideColumn?.("row_count")}
                                className="w-[100px]"
                            />
                        )}

                        {/* Created */}
                        {!hiddenColumns.has("created_at") && (
                            <DataTableColumnHeader
                                label="Created"
                                sortActive={sortConfig?.key === "created_at"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("created_at", "asc")}
                                onSortDesc={() => onSort?.("created_at", "desc")}
                                onHide={() => onHideColumn?.("created_at")}
                                className="w-[140px]"
                            />
                        )}

                        {/* Actions */}
                        <TableHead className="w-[52px]">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {tables.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={visibleColumns} className="h-32 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Table2 className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">No tables found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        tables.map((table) => (
                            <TableRow key={table.id} className="group">
                                {/* Checkbox */}
                                <TableCell className="px-3">
                                    <Checkbox
                                        checked={selectedRows.has(table.id)}
                                        onCheckedChange={() => onToggleRow?.(table.id)}
                                    />
                                </TableCell>

                                {/* Name */}
                                {!hiddenColumns.has("name") && (
                                    <TableCell className="font-medium px-3">
                                        <div className="flex flex-col">
                                            <Link
                                                href={`/tables/${table.id}`}
                                                className="flex items-center gap-2 hover:underline"
                                            >
                                                {table.icon ? (
                                                    <span className="text-base leading-none">{table.icon}</span>
                                                ) : (
                                                    <Table2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                                )}
                                                {table.name}
                                            </Link>
                                            {table.description && (
                                                <span className="text-xs text-muted-foreground line-clamp-2 mt-0.5 ml-6">
                                                    {table.description}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                )}

                                {/* Rows */}
                                {!hiddenColumns.has("row_count") && (
                                    <TableCell className="px-3 text-muted-foreground tabular-nums">
                                        {table.row_count.toLocaleString()}
                                    </TableCell>
                                )}

                                {/* Created */}
                                {!hiddenColumns.has("created_at") && (
                                    <TableCell className="px-3 text-muted-foreground">
                                        {format(new Date(table.created_at), "MMM d, yyyy")}
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
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tables/${table.id}`}>
                                                    <Table2 className="mr-2 h-4 w-4" />
                                                    Open
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/tables/${table.id}/settings`}>
                                                    <Settings2 className="mr-2 h-4 w-4" />
                                                    Settings
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-destructive focus:text-destructive"
                                                onClick={() => setDeleteTarget(table)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

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
