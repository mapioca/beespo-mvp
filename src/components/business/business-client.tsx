"use client"

import { useState, useMemo, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2, CalendarDays, Briefcase } from "lucide-react"
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
import {
    BusinessTable,
    BusinessItem,
    BusinessStatus,
    BusinessCategory,
} from "./business-table"
import { BusinessDrawer } from "./business-drawer"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { useRouter } from "next/navigation"

interface BusinessClientProps {
    items: BusinessItem[]
}

export function BusinessClient({ items }: BusinessClientProps) {
    const router = useRouter()
    const [selectedItem, setSelectedItem] = useState<BusinessItem | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<BusinessStatus[]>(
        []
    )
    const [selectedCategories, setSelectedCategories] = useState<
        BusinessCategory[]
    >([])

    // Sort
    const [sortConfig, setSortConfig] = useState<{
        key: string
        direction: "asc" | "desc"
    } | null>(null)

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

    // Row selection
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

    // ── Derived data ────────────────────────────────────────────────────────

    const filteredItems = useMemo(() => {
        const result = items.filter((item) => {
            if (search) {
                const q = search.toLowerCase()
                const matches =
                    item.person_name?.toLowerCase().includes(q) ||
                    item.position_calling?.toLowerCase().includes(q) ||
                    item.workspace_business_id?.toLowerCase().includes(q)
                if (!matches) return false
            }
            if (
                selectedStatuses.length > 0 &&
                !selectedStatuses.includes(item.status as BusinessStatus)
            )
                return false
            if (
                selectedCategories.length > 0 &&
                !selectedCategories.includes(
                    item.category as BusinessCategory
                )
            )
                return false
            return true
        })

        if (sortConfig) {
            result.sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue = a[key as keyof BusinessItem] as any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue = b[key as keyof BusinessItem] as any
                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [items, search, selectedStatuses, selectedCategories, sortConfig])

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { pending: 0, completed: 0 }
        items.forEach((item) => {
            if (item.status in counts) counts[item.status]++
        })
        return counts
    }, [items])

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {
            sustaining: 0,
            release: 0,
            confirmation: 0,
            ordination: 0,
            setting_apart: 0,
            other: 0,
        }
        items.forEach((item) => {
            if (item.category in counts) counts[item.category]++
        })
        return counts
    }, [items])

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleSort = useCallback(
        (key: string, direction: "asc" | "desc") => {
            setSortConfig((current) => {
                if (
                    current?.key === key &&
                    current.direction === direction
                )
                    return null
                return { key, direction }
            })
        },
        []
    )

    const handleStatusToggle = useCallback((status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status as BusinessStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as BusinessStatus]
        )
    }, [])

    const handleCategoryToggle = useCallback((category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category as BusinessCategory)
                ? prev.filter((c) => c !== category)
                : [...prev, category as BusinessCategory]
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
            if (prev.size === filteredItems.length) return new Set()
            return new Set(filteredItems.map((item) => item.id))
        })
    }, [filteredItems])

    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("business_items") as any)
            .delete()
            .eq("id", id)

        if (error) {
            toast.error(error.message || "Failed to delete business item")
        } else {
            toast.success("Business item deleted successfully")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("business_items") as any)
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete items")
        } else {
            toast.success(`${ids.length} item${ids.length > 1 ? "s" : ""} deleted`)
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    const handleViewItem = (item: BusinessItem) => {
        setSelectedItem(item)
        setDrawerOpen(true)
    }

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedCategories.length > 0 ||
        hiddenColumns.size > 0

    function formatCategoryLabel(c: string) {
        return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Business", icon: <Briefcase className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between w-full px-6 pt-5 pb-4 shrink-0 flex-wrap gap-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Placeholder for future tabs */}
                </div>

                <Button asChild variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border hover:bg-stone-200 hover:text-foreground hover:border-stone-200 transition-all shadow-sm">
                    <Link href="/meetings/business/new" className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        New
                    </Link>
                </Button>
            </div>

            {/* Selection action bar — replaces filter chips when rows are selected */}
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

            {/* Active filter chips (hidden when selection bar is showing) */}
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
                    {selectedCategories.map((c) => (
                        <span
                            key={c}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {formatCategoryLabel(c)}
                            <button
                                onClick={() => handleCategoryToggle(c)}
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
                            setSelectedCategories([])
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
                <BusinessTable
                    items={filteredItems}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={handleStatusToggle}
                    selectedCategories={selectedCategories}
                    categoryCounts={categoryCounts}
                    onCategoryToggle={handleCategoryToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewItem={handleViewItem}
                    onDeleteItem={handleDelete}
                />
            </div>

            {/* Drawer */}
            <BusinessDrawer
                item={selectedItem}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onDelete={handleDelete}
            />

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} item{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected business
                            item{selectedRows.size > 1 ? "s" : ""}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>
                            Cancel
                        </AlertDialogCancel>
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
