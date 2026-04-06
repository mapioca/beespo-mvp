"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Check, Columns3, Plus, SlidersHorizontal, X, Briefcase } from "lucide-react"
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    BusinessTable,
    BusinessItem,
    BusinessStatus,
    BusinessCategory,
} from "./business-table"
import { BusinessDrawer } from "./business-drawer"
import { BusinessItemForm, BusinessItemFormData } from "./business-item-form"
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
import {
    StandardPopoverMenu,
    StandardPopoverMenuContent,
    StandardPopoverMenuItem,
    StandardPopoverMenuSub,
    StandardPopoverMenuSubContent,
    StandardPopoverMenuSubTrigger,
    StandardPopoverMenuTrigger,
} from "@/components/ui/standard-popover-menu"
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"

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

const STATUS_FILTER_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
] as const

const CATEGORY_FILTER_OPTIONS = [
    { value: "sustaining", label: "Sustaining" },
    { value: "release", label: "Release" },
    { value: "confirmation", label: "Confirmation" },
    { value: "ordination", label: "Ordination" },
    { value: "setting_apart", label: "Setting Apart" },
    { value: "other", label: "Other" },
] as const

// ── Props ─────────────────────────────────────────────────────────────────────

interface BusinessClientProps {
    items: BusinessItem[]
    initialViews?: BusinessView[]
}

export function BusinessClient({ items, initialViews = [] }: BusinessClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)

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
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)
    const [createFilterDialogOpen, setCreateFilterDialogOpen] = useState(false)
    const [newBusinessModalOpen, setNewBusinessModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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

    const handleToggleColumnVisibility = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            const visibleCount = ["person_name", "position_calling", "category", "status", "action_date"].filter(
                (c) => !next.has(c)
            ).length
            const isVisible = !next.has(column)

            if (isVisible && visibleCount <= 1) return prev

            if (isVisible) next.add(column)
            else next.delete(column)
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

    const handleCreateBusinessItem = async (formData: BusinessItemFormData) => {
        setIsCreating(true)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            toast.error("Not authenticated. Please log in again.")
            setIsCreating(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id, role")
            .eq("id", user.id)
            .single()

        if (!profile || !["leader", "admin"].includes(profile.role)) {
            toast.error("Only leaders and admins can create business items.")
            setIsCreating(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: businessItem, error: createError } = await (supabase.from("business_items") as any)
            .insert({
                person_name: formData.personName,
                position_calling: formData.positionCalling,
                category: formData.category,
                status: formData.status,
                action_date: formData.actionDate || null,
                notes: formData.notes || null,
                details: formData.details,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select("id")
            .single()

        if (createError || !businessItem) {
            toast.error(createError?.message || "Failed to create business item.")
            setIsCreating(false)
            return
        }

        if (formData.templateId) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: linkError } = await (supabase.from("business_templates") as any)
                .insert({ business_item_id: businessItem.id, template_id: formData.templateId })
            if (linkError) {
                toast.warning("Created, but could not link to template.")
            }
        }

        toast.success("Business item created successfully!")
        setIsCreating(false)
        setNewBusinessModalOpen(false)
        router.refresh()
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
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Business", icon: <Briefcase className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <TopbarSearchAction
                            value={search}
                            onChange={setSearch}
                            placeholder="Search business..."
                            items={filteredItems.slice(0, 8).map((item) => ({
                                id: item.id,
                                label: item.person_name,
                                actionLabel: "Open",
                            }))}
                            onSelect={(itemId) => {
                                const selected = filteredItems.find((item) => item.id === itemId)
                                if (!selected) return
                                handleViewItem(selected)
                            }}
                            emptyText="No matching business items."
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setNewBusinessModalOpen(true)}
                            className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                            New business
                        </Button>
                    </div>
                }
            />

            {/* Action Bar + View Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-3.5 pb-3.5 shrink-0 flex-wrap gap-3 border-b border-border/45">
                <div className="flex items-center gap-2 flex-wrap min-h-8">
                    {/* Custom view tabs */}
                    {views.map((view) => (
                        <span key={view.id} className="relative group/view inline-flex items-center">
                            <button
                                onClick={() => setActiveViewId(view.id)}
                                className={cn(
                                    "rounded-full border pl-3.5 pr-7 py-1.5 text-[11px] leading-none transition-all shadow-sm",
                                    activeViewId === view.id
                                        ? "bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))] border-transparent font-semibold"
                                        : "bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-[hsl(var(--chip-active-text))] font-medium"
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
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                        >
                            Clear view
                        </button>
                    )}

                    <StandardPopoverMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton
                                title="Filters"
                                aria-label="Open filters"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                            </ToolbarIconButton>
                        </StandardPopoverMenuTrigger>
                        <StandardPopoverMenuContent align="start" className="w-64">
                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger
                                    active={selectedStatuses.length > 0}
                                    disabled={!!activeView}
                                >
                                    Status
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent>
                                    {STATUS_FILTER_OPTIONS.map((opt) => {
                                        const selected = selectedStatuses.includes(opt.value as BusinessStatus)
                                        return (
                                            <StandardPopoverMenuItem
                                                key={opt.value}
                                                active={selected}
                                                onSelect={() => handleStatusToggle(opt.value)}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                                        {selected ? <Check className="h-3 w-3" /> : null}
                                                    </span>
                                                    {opt.label}
                                                </span>
                                                <span className="ml-auto text-[length:var(--table-header-font-size)] text-muted-foreground">
                                                    {statusCounts?.[opt.value] || 0}
                                                </span>
                                            </StandardPopoverMenuItem>
                                        )
                                    })}
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>

                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger
                                    active={selectedCategories.length > 0}
                                    disabled={!!activeView}
                                >
                                    Category
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent>
                                    {CATEGORY_FILTER_OPTIONS.map((opt) => {
                                        const selected = selectedCategories.includes(opt.value as BusinessCategory)
                                        return (
                                            <StandardPopoverMenuItem
                                                key={opt.value}
                                                active={selected}
                                                onSelect={() => handleCategoryToggle(opt.value)}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                                        {selected ? <Check className="h-3 w-3" /> : null}
                                                    </span>
                                                    {opt.label}
                                                </span>
                                                <span className="ml-auto text-[length:var(--table-header-font-size)] text-muted-foreground">
                                                    {categoryCounts?.[opt.value] || 0}
                                                </span>
                                            </StandardPopoverMenuItem>
                                        )
                                    })}
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>

                            {(selectedStatuses.length > 0 || selectedCategories.length > 0) && !activeView && (
                                <StandardPopoverMenuItem
                                    onSelect={() => {
                                        setSelectedStatuses([])
                                        setSelectedCategories([])
                                    }}
                                    className="text-muted-foreground"
                                >
                                    Clear filters
                                </StandardPopoverMenuItem>
                            )}

                            <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />

                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger active={!!activeView}>
                                    Advanced filters
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent className="w-64">
                                    {views.length === 0 ? (
                                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                            No saved filters yet.
                                        </p>
                                    ) : (
                                        views.map((view) => (
                                            <StandardPopoverMenuItem
                                                key={view.id}
                                                active={activeViewId === view.id}
                                                onSelect={() => {
                                                    setActiveViewId(view.id)
                                                    setFiltersOpen(false)
                                                }}
                                            >
                                                <span className="truncate">{view.name}</span>
                                            </StandardPopoverMenuItem>
                                        ))
                                    )}

                                    <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFiltersOpen(false)
                                            setCreateFilterDialogOpen(true)
                                        }}
                                        className="flex w-full items-center justify-start gap-2 rounded-md px-2.5 py-1.5 text-[length:var(--menu-item-font-size)] text-[hsl(var(--menu-text))] hover:bg-[hsl(var(--menu-hover))]"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Create new filter
                                    </button>
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>
                        </StandardPopoverMenuContent>
                    </StandardPopoverMenu>

                    <StandardPopoverMenu open={displayOptionsOpen} onOpenChange={setDisplayOptionsOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton
                                title="Display options"
                                aria-label="Display options"
                            >
                                <Columns3 className="h-3.5 w-3.5" />
                            </ToolbarIconButton>
                        </StandardPopoverMenuTrigger>
                        <StandardPopoverMenuContent align="start" className="w-56">
                            {[
                                { key: "person_name", label: "Person Name" },
                                { key: "position_calling", label: "Position / Calling" },
                                { key: "category", label: "Category" },
                                { key: "status", label: "Status" },
                                { key: "action_date", label: "Action Date" },
                            ].map((column) => {
                                const visible = !hiddenColumns.has(column.key)
                                return (
                                    <StandardPopoverMenuItem
                                        key={column.key}
                                        onSelect={() => handleToggleColumnVisibility(column.key)}
                                        className="gap-2"
                                    >
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                            {visible ? <Check className="h-3 w-3" /> : null}
                                        </span>
                                        <span>{column.label}</span>
                                    </StandardPopoverMenuItem>
                                )
                            })}
                            {hiddenColumns.size > 0 && (
                                <>
                                    <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                                    <StandardPopoverMenuItem
                                        onSelect={() => setHiddenColumns(new Set())}
                                        className="text-muted-foreground"
                                    >
                                        Show all columns
                                    </StandardPopoverMenuItem>
                                </>
                            )}
                        </StandardPopoverMenuContent>
                    </StandardPopoverMenu>
                </div>
            </div>

            {/* View filter summary bar */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {activeView.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none capitalize">
                            {s}
                        </span>
                    ))}
                    {activeView.filters.categories?.map((c) => (
                        <span key={c} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {formatCategoryLabel(c)}
                        </span>
                    ))}
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))] capitalize">
                            {s}
                            <button onClick={() => handleStatusToggle(s)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedCategories.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
                            {formatCategoryLabel(c)}
                            <button onClick={() => handleCategoryToggle(c)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button onClick={() => setHiddenColumns(new Set())} className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors">
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
                        className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
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
                    hiddenColumns={hiddenColumns}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewItem={handleViewItem}
                    onDeleteItem={handleDelete}
                />
            </div>

            {/* New Business Modal */}
            <Dialog open={newBusinessModalOpen} onOpenChange={setNewBusinessModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>New Business Item</DialogTitle>
                    </DialogHeader>
                    <BusinessItemForm
                        onSubmit={handleCreateBusinessItem}
                        isLoading={isCreating}
                        mode="create"
                    />
                </DialogContent>
            </Dialog>

            {/* Drawer */}
            <BusinessDrawer
                item={selectedItem}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onDelete={handleDelete}
            />

            <CreateViewDialog
                filterSections={BUSINESS_FILTER_SECTIONS}
                onSave={handleSaveView}
                onCreated={handleViewCreated}
                open={createFilterDialogOpen}
                onOpenChange={setCreateFilterDialogOpen}
                hideTrigger
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

            {/* Floating bulk selection pill */}
            {mounted && selectedRows.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 pointer-events-none w-[90vw] sm:w-auto justify-center">
                    <BulkSelectionBar
                        selectedCount={selectedRows.size}
                        onClear={() => setSelectedRows(new Set())}
                        onDelete={() => setShowBulkDeleteDialog(true)}
                        isDeleting={isBulkDeleting}
                    />
                </div>,
                document.body
            )}
        </div>
    )
}
