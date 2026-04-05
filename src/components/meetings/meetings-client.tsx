"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { addDays, addMonths, endOfDay, startOfDay, subDays, subMonths } from "date-fns"
import { Button } from "@/components/ui/button"
import { Check, Plus, Search, SlidersHorizontal, X } from "lucide-react"
import { Columns3 } from "lucide-react"
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
import { Input } from "@/components/ui/input"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    StandardPopoverMenu,
    StandardPopoverMenuContent,
    StandardPopoverMenuItem,
    StandardPopoverMenuSub,
    StandardPopoverMenuSubContent,
    StandardPopoverMenuSubTrigger,
    StandardPopoverMenuTrigger,
} from "@/components/ui/standard-popover-menu"
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
import { ClipboardList } from "lucide-react"
import { AgendaFilter, deleteAgendaFilter } from "@/lib/agenda-views"
import { CreateFilterDialog } from "./create-filter-dialog"

interface MeetingsClientProps {
    meetings: Meeting[]
    templates: Template[]
    workspaceSlug: string | null
    isLeader: boolean
    statusCounts: Record<string, number>
    templateCounts: Record<string, number>
    sharedMeetings?: Meeting[]
    sharedOutwardIds?: string[]
    initialFilters?: AgendaFilter[]
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
    initialFilters = [],
}: MeetingsClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)

    // ── Saved filters state ─────────────────────────────────────────────────
    const [savedFilters, setSavedFilters] = useState<AgendaFilter[]>(initialFilters)
    const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
    const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null)

    // Base scope filter (used when no saved filter is active)
    const [activeCategory, setActiveCategory] = useState<"mine" | "shared" | "all">("mine")

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<MeetingStatus[]>([])
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
    const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([])

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
    const [jumpOpen, setJumpOpen] = useState(false)
    const [savedFiltersOpen, setSavedFiltersOpen] = useState(false)
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)

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

    // Resolve the active saved filter object
    const activeFilter = useMemo(
        () => savedFilters.find((filter) => filter.id === activeFilterId) ?? null,
        [savedFilters, activeFilterId]
    )

    const filteredMeetings = useMemo(() => {
        // Determine which category to use
        const effectiveCategory = activeFilter?.filters.category ?? activeCategory

        let result: Meeting[] =
            effectiveCategory === "mine"
                ? annotatedMeetings
                : effectiveCategory === "shared"
                  ? sharedMeetings
                  : [...annotatedMeetings, ...sharedMeetings]

        // Search (always applied, even in saved filters)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (m) =>
                    m.title?.toLowerCase().includes(q) ||
                    m.workspace_meeting_id?.toLowerCase().includes(q)
            )
        }

        // Status filter — use saved filter statuses if active, otherwise manual selection
        const effectiveStatuses =
            activeFilter?.filters.statuses && activeFilter.filters.statuses.length > 0
                ? activeFilter.filters.statuses
                : selectedStatuses

        if (effectiveStatuses.length > 0) {
            result = result.filter((m) =>
                effectiveStatuses.includes(m.status as MeetingStatus)
            )
        }

        // Template filter — use saved filter templateIds if active, otherwise manual selection
        const effectiveTemplates =
            activeFilter?.filters.templateIds && activeFilter.filters.templateIds.length > 0
                ? activeFilter.filters.templateIds
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

        // Zoom filter (saved filter only)
        if (activeFilter?.filters.hasZoom) {
            result = result.filter((m) => !!m.zoom_meeting_id)
        }

        // Date filter (manual filters only)
        if (!activeFilter && selectedDateFilters.length > 0) {
            const now = new Date()
            result = result.filter((meeting) => {
                if (!meeting.scheduled_date) return false
                const scheduledAt = new Date(meeting.scheduled_date)
                if (Number.isNaN(scheduledAt.getTime())) return false

                return selectedDateFilters.some((preset) => {
                    if (preset === "today") {
                        return scheduledAt >= startOfDay(now) && scheduledAt <= endOfDay(now)
                    }
                    if (preset === "tomorrow") {
                        const day = addDays(now, 1)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    if (preset === "within_1_week") {
                        return scheduledAt >= now && scheduledAt <= addDays(now, 7)
                    }
                    if (preset === "within_2_weeks") {
                        return scheduledAt >= now && scheduledAt <= addDays(now, 14)
                    }
                    if (preset === "within_1_month") {
                        return scheduledAt >= now && scheduledAt <= addMonths(now, 1)
                    }
                    if (preset === "within_2_months") {
                        return scheduledAt >= now && scheduledAt <= addMonths(now, 2)
                    }
                    if (preset === "yesterday") {
                        const day = subDays(now, 1)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    if (preset === "days_7_ago") {
                        const day = subDays(now, 7)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    if (preset === "weeks_2_ago") {
                        const day = subDays(now, 14)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    if (preset === "month_1_ago") {
                        const day = subMonths(now, 1)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    if (preset === "months_2_ago") {
                        const day = subMonths(now, 2)
                        return scheduledAt >= startOfDay(day) && scheduledAt <= endOfDay(day)
                    }
                    return true
                })
            })
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
        activeFilter,
        activeCategory,
        annotatedMeetings,
        sharedMeetings,
        search,
        selectedStatuses,
        selectedTemplates,
        selectedDateFilters,
        sortConfig,
    ])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = useCallback(
        (key: string, direction: "asc" | "desc") => {
            setSortConfig({ key, direction })
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

    const handleDateFilterToggle = useCallback((preset: string) => {
        setSelectedDateFilters((prev) =>
            prev.includes(preset)
                ? prev.filter((p) => p !== preset)
                : [...prev, preset]
        )
    }, [])

    const handleToggleColumnVisibility = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            const visibleCount = ["title", "template", "status", "scheduled_date"].filter(
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

    function handleFilterCreated(filter: AgendaFilter) {
        setSavedFilters((prev) => [...prev, filter])
        setActiveFilterId(filter.id)
    }

    function handleDeleteFilter(filterId: string) {
        setDeletingFilterId(filterId)
    }

    async function confirmDeleteFilter() {
        if (!deletingFilterId) return
        const id = deletingFilterId
        setDeletingFilterId(null)

        startDeleteTransition(async () => {
            const result = await deleteAgendaFilter(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setSavedFilters((prev) => prev.filter((filter) => filter.id !== id))
            if (activeFilterId === id) setActiveFilterId(null)
            toast.success("Filter deleted")
        })
    }

    // ── Active filter chips ───────────────────────────────────────────────────

    // In saved-filter mode, manual filter chips are not relevant (filter owns the filters)
    const hasActiveFilters =
        !activeFilter &&
        (search.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedTemplates.length > 0 ||
            selectedDateFilters.length > 0 ||
            hiddenColumns.size > 0)

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    function getTemplateName(id: string) {
        if (id === "no-template") return "No Template"
        return templates.find((t) => t.id === id)?.name || id
    }

    const clearAllFilters = useCallback(() => {
        setActiveFilterId(null)
        setSearch("")
        setSelectedStatuses([])
        setSelectedTemplates([])
        setSelectedDateFilters([])
        setHiddenColumns(new Set())
    }, [])

    const statusFilterOptions = [
        { value: "draft", label: "Draft" },
        { value: "scheduled", label: "Scheduled" },
        { value: "in_progress", label: "In Progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
    ] as const

    const templateFilterOptions = [
        {
            value: "no-template",
            label: "No Template",
            count: templateCounts?.["no-template"] || 0,
        },
        ...templates.map((t) => ({
            value: t.id,
            label: t.name,
            count: templateCounts?.[t.id] || 0,
        })),
    ]

    const dateFilterOptions = [
        { value: "today", label: "Today" },
        { value: "tomorrow", label: "Tomorrow" },
        { value: "within_1_week", label: "Within 1 week from now" },
        { value: "within_2_weeks", label: "Within 2 weeks from now" },
        { value: "within_1_month", label: "Within 1 month from now" },
        { value: "within_2_months", label: "Within 2 months from now" },
        { value: "yesterday", label: "Yesterday" },
        { value: "days_7_ago", label: "7 days ago" },
        { value: "weeks_2_ago", label: "2 weeks ago" },
        { value: "month_1_ago", label: "1 month ago" },
        { value: "months_2_ago", label: "2 months ago" },
    ] as const

    const dateFilterLabelByValue = Object.fromEntries(
        dateFilterOptions.map((opt) => [opt.value, opt.label])
    ) as Record<string, string>

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <Popover open={jumpOpen} onOpenChange={setJumpOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 rounded-full border-0 px-2.5 text-[length:var(--agenda-control-font-size)] text-nav shadow-none ring-0 transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] data-[state=open]:bg-[hsl(var(--agenda-interactive-active))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    <Search className="h-3.5 w-3.5" />
                                    {search ? `Search: ${search}` : "Search"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-2">
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search agendas..."
                                    className="h-8 rounded-md border-0 bg-transparent px-2 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
                                />
                                <div className="mt-1 border-t border-border/60" />
                                <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                                    {filteredMeetings.slice(0, 8).map((meeting) => (
                                        <Link
                                            key={meeting.id}
                                            href={`/meetings/${meeting.id}`}
                                            onClick={() => setJumpOpen(false)}
                                            className="flex items-center justify-between rounded-md px-2 py-1.5 text-[length:var(--agenda-control-font-size)] text-nav hover:bg-nav-hover hover:text-nav-strong"
                                        >
                                            <span className="truncate font-medium">{meeting.title}</span>
                                            <span className="ml-2 shrink-0 text-[length:var(--table-micro-font-size)] text-nav-muted">
                                                Open
                                            </span>
                                        </Link>
                                    ))}
                                    {filteredMeetings.length === 0 && (
                                        <p className="px-2 py-1.5 text-[length:var(--table-header-font-size)] text-muted-foreground">
                                            No matching agendas.
                                        </p>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                        {isLeader && (
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                <Link href="/meetings/new">
                                    <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                                    New meeting
                                </Link>
                            </Button>
                        )}
                    </div>
                }
            />

            {/* Action Bar + Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-3.5 pb-3.5 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-2 flex-wrap min-h-8">
                    {/* Built-in tabs */}
                    {(
                        [
                            { value: "mine", label: "My meetings" },
                            { value: "shared", label: "Shared with me" },
                            { value: "all", label: "All meetings" },
                    ] as const
                ).map(({ value, label }) => (
                    <button
                        key={value}
                        onClick={() => {
                            setActiveFilterId(null)
                            setActiveCategory(value)
                        }}
                        className={
                            activeFilterId === null && activeCategory === value
                                ? "rounded-full border px-3.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-semibold leading-none border-[hsl(var(--chip-active-border))] bg-[hsl(var(--agenda-interactive-active))] text-[hsl(var(--chip-active-text))] transition-all shadow-[0_1px_0_rgba(15,23,42,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                : "rounded-full border px-3.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--agenda-interactive-hover))] hover:text-[hsl(var(--chip-active-text))] active:bg-[hsl(var(--agenda-interactive-active))] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        }
                        aria-pressed={activeFilterId === null && activeCategory === value}
                        aria-label={`Filter agendas by ${label}`}
                    >
                        {label}
                    </button>
                ))}

                    <StandardPopoverMenu open={savedFiltersOpen} onOpenChange={setSavedFiltersOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton
                                title="Saved filters"
                                aria-label="Open saved filters"
                            >
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                            </ToolbarIconButton>
                        </StandardPopoverMenuTrigger>
                        <StandardPopoverMenuContent align="start" className="w-64">
                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger
                                    active={selectedStatuses.length > 0}
                                    disabled={!!activeFilter}
                                >
                                    Status
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent>
                                    {statusFilterOptions.map((opt) => {
                                        const selected = selectedStatuses.includes(opt.value as MeetingStatus)
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
                                    active={selectedTemplates.length > 0}
                                    disabled={!!activeFilter}
                                >
                                    Template
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent className="max-h-72 overflow-y-auto">
                                    {templateFilterOptions.map((opt) => {
                                        const selected = selectedTemplates.includes(opt.value)
                                        return (
                                            <StandardPopoverMenuItem
                                                key={opt.value}
                                                active={selected}
                                                onSelect={() => handleTemplateToggle(opt.value)}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60">
                                                        {selected ? <Check className="h-3 w-3" /> : null}
                                                    </span>
                                                    <span className="truncate">{opt.label}</span>
                                                </span>
                                                <span className="ml-auto shrink-0 text-[length:var(--table-header-font-size)] text-muted-foreground">
                                                    {opt.count}
                                                </span>
                                            </StandardPopoverMenuItem>
                                        )
                                    })}
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>

                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger
                                    active={selectedDateFilters.length > 0}
                                    disabled={!!activeFilter}
                                >
                                    Date
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent className="max-h-72 overflow-y-auto">
                                    {dateFilterOptions.map((opt) => {
                                        const selected = selectedDateFilters.includes(opt.value)
                                        return (
                                            <StandardPopoverMenuItem
                                                key={opt.value}
                                                active={selected}
                                                onSelect={() => handleDateFilterToggle(opt.value)}
                                            >
                                                <span className="flex min-w-0 items-center gap-2">
                                                    <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60">
                                                        {selected ? <Check className="h-3 w-3" /> : null}
                                                    </span>
                                                    <span className="truncate">{opt.label}</span>
                                                </span>
                                            </StandardPopoverMenuItem>
                                        )
                                    })}
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>

                            {(selectedStatuses.length > 0 || selectedTemplates.length > 0 || selectedDateFilters.length > 0) && !activeFilter && (
                                <StandardPopoverMenuItem
                                    onSelect={() => {
                                        setSelectedStatuses([])
                                        setSelectedTemplates([])
                                        setSelectedDateFilters([])
                                    }}
                                    className="text-muted-foreground"
                                >
                                    Clear filters
                                </StandardPopoverMenuItem>
                            )}

                            <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />

                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger active={!!activeFilter}>
                                    Advanced filters
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent className="w-64">
                                    {savedFilters.length === 0 ? (
                                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                                            No saved filters yet.
                                        </p>
                                    ) : (
                                        savedFilters.map((filter) => (
                                            <StandardPopoverMenuItem
                                                key={filter.id}
                                                active={activeFilterId === filter.id}
                                                onSelect={() => {
                                                    setActiveFilterId(filter.id)
                                                    setSavedFiltersOpen(false)
                                                }}
                                                className="group"
                                            >
                                                <span className="truncate">
                                                    {filter.name}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        handleDeleteFilter(filter.id)
                                                    }}
                                                    className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                                                    aria-label={`Delete filter ${filter.name}`}
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </StandardPopoverMenuItem>
                                        ))
                                    )}

                                    <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                                    <CreateFilterDialog
                                        templates={templates}
                                        onCreated={(filter) => {
                                            handleFilterCreated(filter)
                                            setSavedFiltersOpen(false)
                                        }}
                                        renderTrigger={(openDialog) => (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSavedFiltersOpen(false)
                                                    openDialog()
                                                }}
                                                className="flex w-full items-center justify-start gap-2 rounded-md px-2.5 py-1.5 text-[length:var(--menu-item-font-size)] text-[hsl(var(--menu-text))] hover:bg-[hsl(var(--menu-hover))]"
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                Create new filter
                                            </button>
                                        )}
                                    />
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
                                { key: "title", label: "Title" },
                                { key: "template", label: "Template" },
                                { key: "status", label: "Status" },
                                { key: "scheduled_date", label: "Date" },
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

            {/* Saved filter summary bar (shown when a saved filter is active) */}
            {activeFilter && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[length:var(--agenda-control-font-size)] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    <span className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 capitalize text-[hsl(var(--chip-text))] leading-none">
                        {activeFilter.filters.category ?? "all"} meetings
                    </span>
                    {activeFilter.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {formatStatusLabel(s)}
                        </span>
                    ))}
                    {activeFilter.filters.templateIds?.map((id) => (
                        <span key={id} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {getTemplateName(id)}
                        </span>
                    ))}
                    {activeFilter.filters.hasZoom && (
                        <span className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">🎥 Has Zoom</span>
                    )}
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={clearAllFilters}
                        className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--agenda-interactive-hover))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Active filter chips — only in non-saved-filter mode */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none text-[hsl(var(--chip-text))]">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                            className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none text-[hsl(var(--chip-text))]"
                        >
                            {formatStatusLabel(s)}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedTemplates.map((id) => (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none text-[hsl(var(--chip-text))]"
                        >
                            {getTemplateName(id)}
                            <button
                                onClick={() => handleTemplateToggle(id)}
                                className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {selectedDateFilters.map((preset) => (
                        <span
                            key={preset}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none text-[hsl(var(--chip-text))]"
                        >
                            {dateFilterLabelByValue[preset] || preset}
                            <button
                                onClick={() => handleDateFilterToggle(preset)}
                                className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background rounded-sm"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button
                            onClick={() => setHiddenColumns(new Set())}
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--agenda-interactive-hover))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                        >
                            Show all columns
                        </button>
                    )}
                    <button
                        onClick={clearAllFilters}
                        className="inline-flex items-center rounded-full px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--agenda-interactive-hover))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {activeCategory === "shared" && !activeFilter && sharedMeetings.length === 0 && !search ? (
                    <div className="flex flex-col items-center justify-center h-48 text-center">
                        <p className="text-muted-foreground text-sm">
                            No meetings shared with you yet.
                        </p>
                    </div>
                ) : (
                    <MeetingsTable
                        meetings={filteredMeetings}
                        workspaceSlug={workspaceSlug}
                        isLeader={isLeader}
                        sortConfig={sortConfig}
                        onSort={handleSort}
                        hiddenColumns={hiddenColumns}
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

            {/* Delete filter confirmation */}
            <AlertDialog
                open={!!deletingFilterId}
                onOpenChange={(o) => { if (!o) setDeletingFilterId(null) }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this filter?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This filter will be removed for everyone in your workspace.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingFilterId(null)}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteFilter}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete filter
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
