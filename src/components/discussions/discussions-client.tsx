"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2, CalendarDays, MessageSquare } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import {
    DiscussionsTable,
    Discussion,
    DiscussionStatus,
    DiscussionPriority,
    DiscussionCategory,
} from "./discussions-table"
import { CreateViewDialog } from "@/components/common/create-view-dialog"
import {
    DiscussionView,
    DiscussionViewFilters,
    createDiscussionView,
    deleteDiscussionView,
    TableView,
} from "@/lib/table-views"
import { cn } from "@/lib/utils"

// ── Filter sections config ────────────────────────────────────────────────────

const DISCUSSION_FILTER_SECTIONS = [
    {
        sectionLabel: "Status",
        key: "statuses",
        optional: true,
        options: [
            { value: "new", label: "New" },
            { value: "active", label: "Active" },
            { value: "decision_required", label: "Decision Required" },
            { value: "monitoring", label: "Monitoring" },
            { value: "resolved", label: "Resolved" },
            { value: "deferred", label: "Deferred" },
        ],
    },
    {
        sectionLabel: "Priority",
        key: "priorities",
        optional: true,
        options: [
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
            { value: "low", label: "Low" },
        ],
    },
    {
        sectionLabel: "Category",
        key: "categories",
        optional: true,
        options: [
            { value: "general", label: "General" },
            { value: "budget", label: "Budget" },
            { value: "personnel", label: "Personnel" },
            { value: "programs", label: "Programs" },
            { value: "facilities", label: "Facilities" },
            { value: "welfare", label: "Welfare" },
            { value: "youth", label: "Youth" },
            { value: "activities", label: "Activities" },
        ],
    },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface DiscussionsClientProps {
    discussions: Discussion[]
    totalCount: number
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
    categoryCounts: Record<string, number>
    currentFilters: {
        search: string
        status: string[]
    }
    initialViews?: DiscussionView[]
}

export function DiscussionsClient({
    discussions,
    statusCounts,
    priorityCounts,
    categoryCounts,
    initialViews = [],
}: DiscussionsClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<DiscussionView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<DiscussionStatus[]>([])
    const [selectedPriorities, setSelectedPriorities] = useState<DiscussionPriority[]>([])
    const [selectedCategories, setSelectedCategories] = useState<DiscussionCategory[]>([])

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

    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Derived data ────────────────────────────────────────────────────────

    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

    const filteredDiscussions = useMemo(() => {
        let result = discussions

        // Search
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (d) =>
                    d.title?.toLowerCase().includes(q) ||
                    d.description?.toLowerCase().includes(q) ||
                    d.workspace_discussion_id?.toLowerCase().includes(q)
            )
        }

        // Status filter — view overrides manual selection
        const effectiveStatuses =
            activeView?.filters.statuses && activeView.filters.statuses.length > 0
                ? activeView.filters.statuses
                : selectedStatuses
        if (effectiveStatuses.length > 0) {
            result = result.filter((d) =>
                effectiveStatuses.includes(d.status as DiscussionStatus)
            )
        }

        // Priority filter — view overrides manual selection
        const effectivePriorities =
            activeView?.filters.priorities && activeView.filters.priorities.length > 0
                ? activeView.filters.priorities
                : selectedPriorities
        if (effectivePriorities.length > 0) {
            result = result.filter((d) =>
                effectivePriorities.includes(d.priority as DiscussionPriority)
            )
        }

        // Category filter — view overrides manual selection
        const effectiveCategories =
            activeView?.filters.categories && activeView.filters.categories.length > 0
                ? activeView.filters.categories
                : selectedCategories
        if (effectiveCategories.length > 0) {
            result = result.filter((d) =>
                effectiveCategories.includes(d.category as DiscussionCategory)
            )
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof Discussion]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof Discussion]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1

                if (key === "priority") {
                    const order = { high: 1, medium: 2, low: 3 }
                    aValue = order[aValue as keyof typeof order] || 99
                    bValue = order[bValue as keyof typeof order] || 99
                }

                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [
        discussions,
        search,
        selectedStatuses,
        selectedPriorities,
        selectedCategories,
        activeView,
        sortConfig,
    ])

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
            prev.includes(status as DiscussionStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as DiscussionStatus]
        )
    }, [])

    const handlePriorityToggle = useCallback((priority: string) => {
        setSelectedPriorities((prev) =>
            prev.includes(priority as DiscussionPriority)
                ? prev.filter((p) => p !== priority)
                : [...prev, priority as DiscussionPriority]
        )
    }, [])

    const handleCategoryToggle = useCallback((category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category as DiscussionCategory)
                ? prev.filter((c) => c !== category)
                : [...prev, category as DiscussionCategory]
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
            if (prev.size === filteredDiscussions.length) return new Set()
            return new Set(filteredDiscussions.map((d) => d.id))
        })
    }, [filteredDiscussions])

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from("discussions")
            .delete()
            .eq("id", id)

        if (error) {
            toast.error(error.message || "Failed to delete discussion.")
        } else {
            toast.success("Discussion deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        const { error } = await supabase
            .from("discussions")
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete items")
        } else {
            toast.success(
                `${ids.length} discussion${ids.length > 1 ? "s" : ""} deleted`
            )
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    const handleViewDiscussion = (discussion: Discussion) => {
        router.push(`/meetings/discussions/${discussion.id}`)
    }

    function handleViewCreated(view: TableView) {
        setViews((prev) => [...prev, view as DiscussionView])
        setActiveViewId(view.id)
    }

    async function handleSaveView(name: string, filters: Record<string, string[]>) {
        return createDiscussionView(name, filters as DiscussionViewFilters)
    }

    function handleDeleteView(viewId: string) {
        setDeletingViewId(viewId)
    }

    async function confirmDeleteView() {
        if (!deletingViewId) return
        const id = deletingViewId
        setDeletingViewId(null)

        startDeleteTransition(async () => {
            const result = await deleteDiscussionView(id)
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
            selectedPriorities.length > 0 ||
            selectedCategories.length > 0 ||
            hiddenColumns.size > 0)

    function formatCategoryLabel(c: string) {
        return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-4 w-4 stroke-[1.6]" /> },
                    { label: "Discussions", icon: <MessageSquare className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
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

                    <CreateViewDialog
                        filterSections={DISCUSSION_FILTER_SECTIONS}
                        onSave={handleSaveView}
                        onCreated={handleViewCreated}
                    />
                </div>

                <Button asChild size="sm" className="h-8 rounded-full px-3.5 text-[11px] font-semibold shadow-sm">
                    <Link href="/meetings/discussions/new" className="flex items-center gap-1.5">
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
                        <span key={s} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {formatStatusLabel(s)}
                        </span>
                    ))}
                    {activeView.filters.priorities?.map((p) => (
                        <span key={p} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none capitalize">
                            {p}
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
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
                            {formatStatusLabel(s)}
                            <button onClick={() => handleStatusToggle(s)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedPriorities.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))] capitalize">
                            {p}
                            <button onClick={() => handlePriorityToggle(p)} className="text-muted-foreground hover:text-foreground">
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
                            setSelectedPriorities([])
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
                <DiscussionsTable
                    discussions={filteredDiscussions}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={activeView?.filters.statuses as DiscussionStatus[] ?? selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={activeView ? undefined : handleStatusToggle}
                    selectedPriorities={activeView?.filters.priorities as DiscussionPriority[] ?? selectedPriorities}
                    priorityCounts={priorityCounts}
                    onPriorityToggle={activeView ? undefined : handlePriorityToggle}
                    selectedCategories={activeView?.filters.categories as DiscussionCategory[] ?? selectedCategories}
                    categoryCounts={categoryCounts}
                    onCategoryToggle={activeView ? undefined : handleCategoryToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewDiscussion={handleViewDiscussion}
                    onDelete={handleDelete}
                />
            </div>

            {/* Bulk delete confirmation */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} discussion{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected discussion{selectedRows.size > 1 ? "s" : ""}. This action cannot be undone.
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
                    <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/96 px-2.5 py-2 text-foreground shadow-[0_10px_30px_rgba(15,23,42,0.12)] backdrop-blur-sm">
                        <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/55 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-foreground/85">
                            {selectedRows.size} selected
                        </span>
                        <span className="h-4 w-px bg-border/70" aria-hidden />
                        <button
                            onClick={() => setSelectedRows(new Set())}
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground/70 hover:text-foreground hover:bg-muted/55 transition-colors"
                        >
                            Deselect
                        </button>
                        <button
                            onClick={() => setShowBulkDeleteDialog(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100/75 transition-colors"
                        >
                            <Trash2 className="h-3 w-3 stroke-[1.7]" />
                            Delete
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
