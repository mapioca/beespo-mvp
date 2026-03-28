"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2 } from "lucide-react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
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
import { toast } from "@/lib/toast"
import { deleteTable } from "@/lib/actions/table-actions"
import { TablesListTable, TableWithCount } from "@/components/tables/tables-list-table"

interface TablesClientProps {
    tables: TableWithCount[]
}

export function TablesClient({ tables }: TablesClientProps) {
    const router = useRouter()

    // Search
    const [search, setSearch] = useState("")

    // Sort
    const [sortConfig, setSortConfig] = useState<{
        key: string
        direction: "asc" | "desc"
    } | null>(null)

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

    // Row selection
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    // Bulk delete
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // ── Derived data ─────────────────────────────────────────────────────────

    const filteredTables = useMemo(() => {
        let result = tables

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.description?.toLowerCase().includes(q)
            )
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue: any = a[key as keyof TableWithCount]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue: any = b[key as keyof TableWithCount]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [tables, search, sortConfig])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
        setSortConfig((current) => {
            if (current?.key === key && current.direction === direction) return null
            return { key, direction }
        })
    }, [])

    const handleHideColumn = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            next.add(column)
            return next
        })
    }, [])

    const handleToggleRow = useCallback((id: string) => {
        setSelectedRows((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const handleToggleAllRows = useCallback(() => {
        setSelectedRows((prev) => {
            if (prev.size === filteredTables.length) return new Set()
            return new Set(filteredTables.map((t) => t.id))
        })
    }, [filteredTables])

    const handleDelete = async (id: string) => {
        const result = await deleteTable(id)
        if (result.error) {
            toast.error(result.error || "Failed to delete table.")
        } else {
            toast.success("Table deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const ids = Array.from(selectedRows)
        let failed = 0
        for (const id of ids) {
            const result = await deleteTable(id)
            if (result.error) failed++
        }
        if (failed > 0) {
            toast.error(`Failed to delete ${failed} table${failed > 1 ? "s" : ""}.`)
        } else {
            toast.success(`${ids.length} table${ids.length > 1 ? "s" : ""} deleted.`)
        }
        setSelectedRows(new Set())
        router.refresh()
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    // ── Active filters ────────────────────────────────────────────────────────

    const hasActiveFilters = search.length > 0 || hiddenColumns.size > 0

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs />

            {/* Action Bar */}
            <div className="flex items-center justify-between w-full px-6 pt-5 pb-4 shrink-0 flex-wrap gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Placeholder for future tabs */}
                </div>

                <Button asChild variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border hover:bg-stone-200 hover:text-foreground hover:border-stone-200 transition-all shadow-sm">
                    <Link href="/tables/new" className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </Link>
                </Button>
            </div>

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="text-xs font-medium tabular-nums">
                        {selectedRows.size} selected
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setShowBulkDeleteDialog(true)}
                    >
                        <Trash2 className="mr-1.5 h-3 w-3" />
                        Delete
                    </Button>
                    <button
                        onClick={() => setSelectedRows(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    >
                        Deselect all
                    </button>
                </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {hiddenColumns.size > 0 && (
                        <button
                            onClick={() => setHiddenColumns(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                            Show all columns
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSearch("")
                            setHiddenColumns(new Set())
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6">
                <TablesListTable
                    tables={filteredTables}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onDelete={handleDelete}
                />
            </div>

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} table{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected table
                            {selectedRows.size > 1 ? "s" : ""} and all their data. This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isBulkDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
