"use client"

import { useState, useMemo, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import {
    MeetingsTable,
    Meeting,
    MeetingStatus,
    Template,
} from "./meetings-table"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { CalendarDays, ClipboardList } from "lucide-react"
import { AgendaView, deleteAgendaView } from "@/lib/agenda-views"
import { CreateViewDialog } from "./create-view-dialog"
import { cn } from "@/lib/utils"

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
    const [, startDeleteTransition] = useTransition()

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<AgendaView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    // Category filter (used when no custom view is active)
    const [activeCategory, setActiveCategory] = useState<"mine" | "shared" | "all">("mine")

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
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Action Bar + Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-4 pb-3 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Built-in tabs */}
                    {(
                        [
                            { value: "mine", label: "My Meetings" },
                            { value: "shared", label: "Shared with Me" },
                            { value: "all", label: "All" },
                    ] as const
                ).map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => {
                            setActiveViewId(null)
                            setActiveCategory(value)
                        }}
                        className={
                            activeViewId === null && activeCategory === value
                                ? "rounded-full border px-3.5 py-1 text-xs font-medium bg-[hsl(var(--accent-warm))] text-foreground border-border/60 transition-all shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                                : "rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border/60 hover:text-foreground hover:bg-[hsl(var(--accent-warm)/0.5)] hover:border-border/60 transition-all"
                        }
                    >
                        {label}
                    </button>
                ))}

                {/* Divider before custom views */}
                {views.length > 0 && (
                    <span className="h-4 w-px bg-border mx-1 shrink-0" aria-hidden />
                )}

                {/* Custom view tabs */}
                {views.map((view) => (
                    <span key={view.id} className="relative group/view inline-flex items-center">
                        <button
                            onClick={() => setActiveViewId(view.id)}
                            className={cn(
                                "rounded-full border pl-3.5 pr-7 py-1 text-xs font-medium transition-all shadow-sm",
                                activeViewId === view.id
                                    ? "bg-[hsl(var(--accent-warm))] text-foreground border-border/60"
                                    : "text-muted-foreground border-border/60 hover:text-foreground hover:bg-[hsl(var(--accent-warm)/0.5)] hover:border-border/60"
                            )}
                        >
                            {view.name}
                        </button>
                        {/* Delete (×) button — appears on hover */}
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

                    <CreateViewDialog
                        templates={templates}
                        onCreated={handleViewCreated}
                    />
                </div>

                {isLeader && (
                    <Button asChild variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-foreground border-border/60 bg-[hsl(var(--accent-warm))] hover:bg-[hsl(var(--accent-warm-hover))] transition-all shadow-[0_1px_0_rgba(15,23,42,0.08)]">
                        <Link href="/meetings/new" className="flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                            New
                        </Link>
                    </Button>
                )}
            </div>

            {/* View filter summary bar (shown when a custom view is active) */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    <span className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 capitalize text-slate-800">
                        {activeView.filters.category ?? "all"} meetings
                    </span>
                    {activeView.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">
                            {formatStatusLabel(s)}
                        </span>
                    ))}
                    {activeView.filters.templateIds?.map((id) => (
                        <span key={id} className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">
                            {getTemplateName(id)}
                        </span>
                    ))}
                    {activeView.filters.hasZoom && (
                        <span className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">🎥 Has Zoom</span>
                    )}
                    {search && (
                        <span className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="inline-flex items-center rounded-full bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-[11px] font-medium text-slate-800 border border-border/50 tabular-nums">
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

            {/* Active filter chips — only in non-view mode */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2.5 py-1 text-xs font-medium text-slate-800">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                            {formatStatusLabel(s)}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedTemplates.map((id) => (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2.5 py-1 text-xs font-medium text-slate-800"
                        >
                            {getTemplateName(id)}
                            <button
                                onClick={() => handleTemplateToggle(id)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
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
                            setSelectedTemplates([])
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
                {activeCategory === "shared" && !activeView && sharedMeetings.length === 0 && !search ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <p className="text-muted-foreground text-sm">
                            No meetings shared with you yet.
                        </p>
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
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
