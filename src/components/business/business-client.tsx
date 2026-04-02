"use client"

import { useState, useMemo, useCallback, useTransition } from "react"
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
import { CreateViewDialog } from "@/components/common/create-view-dialog"
import {
    BusinessView,
    BusinessViewFilters,
    createBusinessView,
    deleteBusinessView,
    TableView,
} from "@/lib/table-views"
import { cn } from "@/lib/utils"

// ── Filter sections config ────────────────────────────────────────────────────

const BUSINESS_FILTER_SECTIONS = [
    {
        sectionLabel: "Status",
        key: "statuses",
        optional: true,
        options: [
            { value: "pending", label: "Pending" },
            { value: "completed", label: "Completed" },
        ],
    },
    {
        sectionLabel: "Category",
        key: "categories",
        optional: true,
        options: [
            { value: "sustaining", label: "Sustaining" },
            { value: "release", label: "Release" },
            { value: "confirmation", label: "Confirmation" },
            { value: "ordination", label: "Ordination" },
            { value: "setting_apart", label: "Setting Apart" },
            { value: "other", label: "Other" },
        ],
    },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface BusinessClientProps {
    items: BusinessItem[]
    initialViews?: BusinessView[]
}

export function BusinessClient({ items, initialViews = [] }: BusinessClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()

    const [selectedItem, setSelectedItem] = useState<BusinessItem | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<BusinessView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<BusinessStatus[]>([])
    const [selectedCategories, setSelectedCategories] = useState<BusinessCategory[]>([])

    // Sort
    const [sortConfig, setSortConfig] = useState<{
        key: string
        direction: "asc" | "desc"
    } | null>(null)

    // Column visibility
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

    // Row selection
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // ── Derived data ────────────────────────────────────────────────────────

    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

    const filteredItems = useMemo(() => {
        // Effective filter values (view overrides manual)
        const effectiveStatuses =
            activeView?.filters.statuses && activeView.filters.statuses.length > 0
                ? activeView.filters.statuses
                : selectedStatuses
        const effectiveCategories =
            activeView?.filters.categories && activeView.filters.categories.length > 0
                ? activeView.filters.categories
                : selectedCategories

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
                effectiveStatuses.length > 0 &&
                !effectiveStatuses.includes(item.status as BusinessStatus)
            )
                return false
            if (
                effectiveCategories.length > 0 &&
                !effectiveCategories.includes(item.category as BusinessCategory)
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
    }, [items, search, selectedStatuses, selectedCategories, activeView, sortConfig])

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
                if (current?.key === key && current.direction === direction)
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

    function handleViewCreated(view: TableView) {
        setViews((prev) => [...prev, view as BusinessView])
        setActiveViewId(view.id)
    }

    async function handleSaveView(name: string, filters: Record<string, string[]>) {
        return createBusinessView(name, filters as BusinessViewFilters)
    }

    function handleDeleteView(viewId: string) {
        setDeletingViewId(viewId)
    }

    async function confirmDeleteView() {
        if (!deletingViewId) return
        const id = deletingViewId
        setDeletingViewId(null)

        startDeleteTransition(async () => {
            const result = await deleteBusinessView(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setViews((prev) => prev.filter((v) => v.id !== id))
            if (activeViewId === id) setActiveViewId(null)
            toast.success("View deleted")
        })
    }

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        !activeView &&
        (search.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedCategories.length > 0 ||
            hiddenColumns.size > 0)

    function formatCategoryLabel(c: string) {
        return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-4 w-4 stroke-[1.6]" /> },
                    { label: "Business", icon: <Briefcase className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
            />

            {/* Action Bar + View Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-4 pb-3 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Custom view tabs */}
                    {views.map((view) => (
                        <span key={view.id} className="relative group/view inline-flex items-center">
                            <button
                                onClick={() => setActiveViewId(view.id)}
                                className={cn(
                                    "rounded-full border pl-3.5 pr-7 py-1 text-xs font-medium transition-all shadow-sm",
                                    activeViewId === view.id
                                        ? "bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))] border-[hsl(var(--chip-border))]"
                                        : "bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-active-bg))] hover:text-[hsl(var(--chip-active-text))]"
                                )}
                            >
                                {view.name}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteView(view.id)
                                }}
                                title="Delete view"
                                className={cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2",
                                    "flex items-center justify-center h-3.5 w-3.5 rounded-full",
                                    "opacity-0 group-hover/view:opacity-100 transition-opacity",
                                    activeViewId === view.id
                                        ? "text-muted-foreground/70 hover:text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <X className="h-2.5 w-2.5 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}

                    {activeViewId && (
                        <button
                            onClick={() => setActiveViewId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear view
                        </button>
                    )}

                    <CreateViewDialog
                        filterSections={BUSINESS_FILTER_SECTIONS}
                        onSave={handleSaveView}
                        onCreated={handleViewCreated}
                    />
                </div>

                <Button asChild size="sm" className="rounded-full px-3.5 py-1 text-xs">
                    <Link href="/meetings/business/new" className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                        New
                    </Link>
                </Button>
            </div>

            {/* View filter summary bar */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {activeView.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2 py-0.5 text-[hsl(var(--chip-text))] capitalize">
                            {s}
                        </span>
                    ))}
                    {activeView.filters.categories?.map((c) => (
                        <span key={c} className="rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2 py-0.5 text-[hsl(var(--chip-text))]">
                            {formatCategoryLabel(c)}
                        </span>
                    ))}
                    {search && (
                        <span className="rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2 py-0.5 text-[hsl(var(--chip-text))]">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="inline-flex items-center rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--chip-text))]  tabular-nums">
                        {selectedRows.size} selected
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setShowBulkDeleteDialog(true)}
                    >
                        <Trash2 className="mr-1.5 h-3 w-3 stroke-[1.6]" />
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
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--chip-text))] ">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--chip-text))]  capitalize">
                            {s}
                            <button onClick={() => handleStatusToggle(s)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedCategories.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1 text-xs font-medium text-[hsl(var(--chip-text))] ">
                            {formatCategoryLabel(c)}
                            <button onClick={() => handleCategoryToggle(c)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button onClick={() => setHiddenColumns(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline">
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
            <div className="flex-1 overflow-auto px-6 pb-6">
                <BusinessTable
                    items={filteredItems}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={activeView?.filters.statuses as BusinessStatus[] ?? selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={activeView ? undefined : handleStatusToggle}
                    selectedCategories={activeView?.filters.categories as BusinessCategory[] ?? selectedCategories}
                    categoryCounts={categoryCounts}
                    onCategoryToggle={activeView ? undefined : handleCategoryToggle}
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
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} item{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected business item{selectedRows.size > 1 ? "s" : ""}. This action cannot be undone.
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

            {/* Delete view confirmation */}
            <AlertDialog open={!!deletingViewId} onOpenChange={(o) => { if (!o) setDeletingViewId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this view?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This view will be removed for everyone in your workspace. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingViewId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteView}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete view
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
