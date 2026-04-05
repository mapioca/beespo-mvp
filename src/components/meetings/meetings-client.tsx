"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FilterChip } from "@/components/ui/filter-chip"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/app-shell"
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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import {
    MeetingsTable,
    Meeting,
    MeetingStatus,
    Template,
} from "./meetings-table"
import { CalendarDays } from "lucide-react"
import { AgendaView, deleteAgendaView } from "@/lib/agenda-views"
import { CreateViewDialog } from "./create-view-dialog"
import { cn } from "@/lib/utils"
import { useMeetingsUiStore } from "@/stores/meetings-ui-store"

interface MeetingsClientProps {
    meetings: Meeting[]
    templates: Template[]
    workspaceSlug: string | null
    isLeader: boolean
    statusCounts: Record<string, number>
    templateCounts: Record<string, number>
    sharedMeetings?: Meeting[]
    sharedOutwardIds?: string[]
    initialViews?: AgendaView[]
}

export function MeetingsClient({
    meetings,
    templates,
    workspaceSlug,
    isLeader,
    statusCounts,
    templateCounts,
    sharedMeetings = [],
    sharedOutwardIds = [],
    initialViews = [],
}: MeetingsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<AgendaView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    const categoryFromQuery = searchParams.get("category")
    const activeCategory: "mine" | "shared" | "all" =
        categoryFromQuery === "shared" || categoryFromQuery === "all"
            ? categoryFromQuery
            : "mine"

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<MeetingStatus[]>([])
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])

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
    const isCategoryNavigating = useMeetingsUiStore((s) => s.isCategoryNavigating)

    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Derived data ─────────────────────────────────────────────────────────

    const sharedOutwardSet = useMemo(
        () => new Set(sharedOutwardIds),
        [sharedOutwardIds]
    )

    const annotatedMeetings = useMemo(
        () =>
            meetings.map((m) => ({
                ...m,
                _isSharedOutward: sharedOutwardSet.has(m.id),
            })),
        [meetings, sharedOutwardSet]
    )

    // Resolve the active view object
    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

    const filteredMeetings = useMemo(() => {
        // Determine which category to use
        const effectiveCategory = activeView?.filters.category ?? activeCategory

        let result: Meeting[] =
            effectiveCategory === "mine"
                ? annotatedMeetings
                : effectiveCategory === "shared"
                  ? sharedMeetings
                  : [...annotatedMeetings, ...sharedMeetings]

        // Search (always applied, even in views)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (m) =>
                    m.title?.toLowerCase().includes(q) ||
                    m.workspace_meeting_id?.toLowerCase().includes(q)
            )
        }

        // Status filter — use view's statuses if active, otherwise manual selection
        const effectiveStatuses =
            activeView?.filters.statuses && activeView.filters.statuses.length > 0
                ? activeView.filters.statuses
                : selectedStatuses

        if (effectiveStatuses.length > 0) {
            result = result.filter((m) =>
                effectiveStatuses.includes(m.status as MeetingStatus)
            )
        }

        // Template filter — use view's templateIds if active, otherwise manual selection
        const effectiveTemplates =
            activeView?.filters.templateIds && activeView.filters.templateIds.length > 0
                ? activeView.filters.templateIds
                : selectedTemplates

        if (effectiveTemplates.length > 0) {
            const hasNoTemplate = effectiveTemplates.includes("no-template")
            const templateIds = effectiveTemplates.filter((id) => id !== "no-template")
            result = result.filter((m) => {
                if (hasNoTemplate && !m.template_id) return true
                if (templateIds.length > 0 && m.template_id && templateIds.includes(m.template_id))
                    return true
                return false
            })
        }

        // Zoom filter (view only)
        if (activeView?.filters.hasZoom) {
            result = result.filter((m) => !!m.zoom_meeting_id)
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue: any =
                    key === "template"
                        ? a.templates?.name || ""
                        : a[key as keyof Meeting]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue: any =
                    key === "template"
                        ? b.templates?.name || ""
                        : b[key as keyof Meeting]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1

                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [
        activeView,
        activeCategory,
        annotatedMeetings,
        sharedMeetings,
        search,
        selectedStatuses,
        selectedTemplates,
        sortConfig,
    ])

    // ── Handlers ─────────────────────────────────────────────────────────────

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
            prev.includes(status as MeetingStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as MeetingStatus]
        )
    }, [])

    const handleTemplateToggle = useCallback((templateId: string) => {
        setSelectedTemplates((prev) =>
            prev.includes(templateId)
                ? prev.filter((t) => t !== templateId)
                : [...prev, templateId]
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
            if (prev.size === filteredMeetings.length) return new Set()
            return new Set(filteredMeetings.map((m) => m.id))
        })
    }, [filteredMeetings])

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("agenda_items") as any)
            .delete()
            .in("meeting_id", ids)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any)
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete meetings")
        } else {
            toast.success(
                `${ids.length} agenda${ids.length > 1 ? "s" : ""} deleted`
            )
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    function handleViewCreated(view: AgendaView) {
        setViews((prev) => [...prev, view])
        setActiveViewId(view.id)
    }

    function handleDeleteView(viewId: string) {
        setDeletingViewId(viewId)
    }

    async function confirmDeleteView() {
        if (!deletingViewId) return
        const id = deletingViewId
        setDeletingViewId(null)

        startDeleteTransition(async () => {
            const result = await deleteAgendaView(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setViews((prev) => prev.filter((v) => v.id !== id))
            if (activeViewId === id) setActiveViewId(null)
            toast.success("View deleted")
        })
    }

    // ── Active filter chips ───────────────────────────────────────────────────

    // In view mode, manual filter chips are not relevant (view owns the filters)
    const hasActiveFilters =
        !activeView &&
        (search.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedTemplates.length > 0 ||
            hiddenColumns.size > 0)

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    function getTemplateName(id: string) {
        if (id === "no-template") return "No Template"
        return templates.find((t) => t.id === id)?.name || id
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex h-full flex-col">
            <PageHeader
                title="Agendas"
                description="Manage meetings, templates, and shared agendas."
                className="mb-4 border-b-0 pb-0"
                actions={
                    <div className="flex items-center gap-3">
                        {isLeader ? (
                            <Button asChild size="sm">
                                <Link href="/meetings/new" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    New agenda
                                </Link>
                            </Button>
                        ) : null}
                        <Input
                            type="search"
                            inputSize="compact"
                            placeholder="Search agendas..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-[320px] shadow-none"
                        />
                    </div>
                }
            />

            {/* Top controls */}
            <div className="w-full shrink-0 border-b border-gray-200 px-6 pb-3">
                {/* 1) Custom filters (saved views) */}
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                    {views.map((view) => (
                        <span key={view.id} className="relative group/view inline-flex items-center">
                            <button
                                onClick={() => setActiveViewId(view.id)}
                                className={cn(
                                    "h-8 rounded-cta border px-4 text-sm leading-none transition-all",
                                    activeViewId === view.id
                                        ? "border-transparent bg-primary text-white font-semibold"
                                        : "border-gray-200 bg-white text-gray-600 hover:bg-white hover:text-gray-900 font-medium"
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
                                    "flex h-5 w-5 items-center justify-center rounded-full",
                                    "opacity-0 group-hover/view:opacity-100 group-focus-within/view:opacity-100 transition-opacity",
                                    activeViewId === view.id
                                        ? "bg-black/20 text-white/85 hover:text-white"
                                        : "border border-gray-200 bg-white/95 text-gray-400 hover:text-gray-700"
                                )}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}

                    {activeViewId && (
                        <button
                            onClick={() => setActiveViewId(null)}
                            className="h-8 rounded-cta border border-gray-200 bg-white px-3 text-sm font-medium leading-none text-gray-600 transition-colors hover:text-gray-900"
                        >
                            Clear view
                        </button>
                    )}

                    <CreateViewDialog templates={templates} onCreated={handleViewCreated} />
                </div>

                {/* 2) Read-only filters */}
                {(activeView || hasActiveFilters) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-900">Filters:</span>

                        {activeView ? (
                            <>
                                <FilterChip className="capitalize">
                                    {activeView.filters.category ?? "all"} meetings
                                </FilterChip>
                                {activeView.filters.statuses?.map((s) => (
                                    <FilterChip key={s}>{formatStatusLabel(s)}</FilterChip>
                                ))}
                                {activeView.filters.templateIds?.map((id) => (
                                    <FilterChip key={id}>{getTemplateName(id)}</FilterChip>
                                ))}
                                {activeView.filters.hasZoom && <FilterChip>Has Zoom</FilterChip>}
                                {search && <FilterChip>Search: &quot;{search}&quot;</FilterChip>}
                            </>
                        ) : (
                            <>
                                {search && <FilterChip>Search: &quot;{search}&quot;</FilterChip>}
                                {selectedStatuses.map((s) => (
                                    <FilterChip key={s}>{formatStatusLabel(s)}</FilterChip>
                                ))}
                                {selectedTemplates.map((id) => (
                                    <FilterChip key={id}>{getTemplateName(id)}</FilterChip>
                                ))}
                                {hiddenColumns.size > 0 && (
                                    <FilterChip>{hiddenColumns.size} hidden column{hiddenColumns.size > 1 ? "s" : ""}</FilterChip>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto pb-6">
                {isCategoryNavigating ? (
                    <div className="overflow-hidden rounded-md border border-gray-200">
                        <div className="flex items-center gap-4 border-b bg-gray-50 px-3 py-3">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 w-48 flex-1" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-4" />
                        </div>
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4 border-b px-3 py-4 last:border-b-0">
                                <Skeleton className="h-4 w-4" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-5 w-20 rounded" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-8 w-8 rounded" />
                            </div>
                        ))}
                    </div>
                ) : activeCategory === "shared" && !activeView && sharedMeetings.length === 0 && !search ? (
                    <div className="flex h-48 items-center justify-center text-center">
                        <EmptyState
                            title="No shared meetings"
                            description="No meetings have been shared with you yet."
                            icon={<CalendarDays className="h-6 w-6" />}
                        />
                    </div>
                ) : (
                    <MeetingsTable
                        meetings={filteredMeetings}
                        templates={templates}
                        workspaceSlug={workspaceSlug}
                        isLeader={isLeader}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        searchValue={search}
                        onSearchChange={setSearch}
                        selectedStatuses={activeView?.filters.statuses as MeetingStatus[] ?? selectedStatuses}
                        statusCounts={statusCounts}
                        onStatusToggle={activeView ? undefined : handleStatusToggle}
                        selectedTemplates={activeView?.filters.templateIds ?? selectedTemplates}
                        templateCounts={templateCounts}
                        onTemplateToggle={activeView ? undefined : handleTemplateToggle}
                        hiddenColumns={hiddenColumns}
                        onHideColumn={handleHideColumn}
                        selectedRows={selectedRows}
                        onToggleRow={handleToggleRow}
                        onToggleAllRows={handleToggleAllRows}
                    />
                )}
            </div>

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} agenda
                            {selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected agenda
                            {selectedRows.size > 1 ? "s" : ""} and all their
                            agenda items. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-error text-white hover:bg-error/90"
                        >
                            {isBulkDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete view confirmation */}
            <AlertDialog
                open={!!deletingViewId}
                onOpenChange={(o) => { if (!o) setDeletingViewId(null) }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this view?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This view will be removed for everyone in your workspace.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingViewId(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteView}
                            className="bg-error text-white hover:bg-error/90"
                        >
                            Delete view
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Floating bulk selection pill */}
            {mounted && selectedRows.size > 0 && createPortal(
                <div className="pointer-events-none fixed bottom-6 left-1/2 z-[95] flex w-[90vw] -translate-x-1/2 justify-center sm:w-auto">
                    <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2.5 py-2 text-gray-900 shadow-lg">
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-gray-700">
                            {selectedRows.size} selected
                        </span>
                        <span className="h-4 w-px bg-gray-200" aria-hidden />
                        <button
                            onClick={() => setSelectedRows(new Set())}
                            className="rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        >
                            Deselect
                        </button>
                        <button
                            onClick={() => setShowBulkDeleteDialog(true)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"
                        >
                            <Trash2 className="h-3 w-3" />
                            Delete
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
