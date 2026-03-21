"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2 } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { FormsTable, FormStatus, FormWithCount } from "@/components/forms/forms-table"

interface FormsClientProps {
    forms: FormWithCount[]
    statusCounts: Record<string, number>
}

export function FormsClient({ forms, statusCounts }: FormsClientProps) {
    const router = useRouter()

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<FormStatus[]>([])

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

    const filteredForms = useMemo(() => {
        let result = forms

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (f) =>
                    f.title.toLowerCase().includes(q) ||
                    f.description?.toLowerCase().includes(q)
            )
        }

        if (selectedStatuses.length > 0) {
            result = result.filter((f) => {
                const status = f.is_published ? "published" : "draft"
                return selectedStatuses.includes(status as FormStatus)
            })
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof FormWithCount]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof FormWithCount]

                if (key === "status") {
                    aValue = a.is_published ? "published" : "draft"
                    bValue = b.is_published ? "published" : "draft"
                }

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [forms, search, selectedStatuses, sortConfig])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
        setSortConfig((current) => {
            if (current?.key === key && current.direction === direction) return null
            return { key, direction }
        })
    }, [])

    const handleStatusToggle = useCallback((status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status as FormStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as FormStatus]
        )
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
            if (prev.size === filteredForms.length) return new Set()
            return new Set(filteredForms.map((f) => f.id))
        })
    }, [filteredForms])

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("forms") as any).delete().eq("id", id)
        if (error) {
            toast.error(error.message || "Failed to delete form.")
        } else {
            toast.success("Form deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("forms") as any).delete().in("id", ids)
        if (error) {
            toast.error(error.message || "Failed to delete forms.")
        } else {
            toast.success(`${ids.length} form${ids.length > 1 ? "s" : ""} deleted.`)
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    // ── Active filters ────────────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 || selectedStatuses.length > 0 || hiddenColumns.size > 0

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Forms</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Create and manage feedback forms
                    </p>
                </div>
                <Button asChild size="sm">
                    <Link href="/forms/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Form
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
                    {selectedStatuses.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize"
                        >
                            {s}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
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
                            setSelectedStatuses([])
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
                <FormsTable
                    forms={filteredForms}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={handleStatusToggle}
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
                            Delete {selectedRows.size} form{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected form
                            {selectedRows.size > 1 ? "s" : ""} and all their responses. This
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
