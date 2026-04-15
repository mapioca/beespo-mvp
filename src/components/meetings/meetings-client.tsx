"use client"

import { useState, useMemo, useCallback, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Check, ClipboardList, Columns3, PanelsTopLeft, Plus, SlidersHorizontal, X, ArrowUp, ArrowDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
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
    StandardPopoverMenu,
    StandardPopoverMenuContent,
    StandardPopoverMenuItem,
    StandardPopoverMenuSub,
    StandardPopoverMenuSubContent,
    StandardPopoverMenuSubTrigger,
    StandardPopoverMenuTrigger,
} from "@/components/ui/standard-popover-menu"
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"
import { CreateFilterDialog } from "./create-filter-dialog"
import { MeetingsTable, Meeting, MeetingStatus, Template } from "./meetings-table"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { AgendaFilter, deleteSavedPlanFilter } from "@/lib/agenda-views"

interface PlanWorkspaceConfig {
    singularLabel: string
    pluralLabel: string
    breadcrumbLabel: string
    searchPlaceholder: string
    createLabel: string
    createHref: string
    viewType: string
    path: string
    emptyText: string
    sharedEmptyText: string
    icon: LucideIcon
    tabLabels: {
        mine: string
        shared: string
        all: string
    }
}

const agendaWorkspaceConfig: PlanWorkspaceConfig = {
    singularLabel: "agenda",
    pluralLabel: "agendas",
    breadcrumbLabel: "Agendas",
    searchPlaceholder: "Search agendas...",
    createLabel: "New agenda",
    createHref: "/events/new?plan=agenda",
    viewType: "agendas",
    path: "/meetings/agendas",
    emptyText: "No agendas found.",
    sharedEmptyText: "No agendas shared with you yet.",
    icon: ClipboardList,
    tabLabels: {
        mine: "My agendas",
        shared: "Shared with me",
        all: "All agendas",
    },
}

const programWorkspaceConfig: PlanWorkspaceConfig = {
    singularLabel: "program",
    pluralLabel: "programs",
    breadcrumbLabel: "Programs",
    searchPlaceholder: "Search programs...",
    createLabel: "New program",
    createHref: "/events/new?plan=program",
    viewType: "programs",
    path: "/meetings/programs",
    emptyText: "No programs found.",
    sharedEmptyText: "No programs shared with you yet.",
    icon: PanelsTopLeft,
    tabLabels: {
        mine: "My programs",
        shared: "Shared with me",
        all: "All programs",
    },
}

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
    workspace?: "agendas" | "programs"
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
    workspace = "agendas",
}: MeetingsClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (meetings.length > 0) {
            setIsLoading(false)
        }
    }, [meetings])
    const workspaceConfig = workspace === "programs" ? programWorkspaceConfig : agendaWorkspaceConfig

    const [savedFilters, setSavedFilters] = useState<AgendaFilter[]>(initialFilters)
    const [activeFilterId, setActiveFilterId] = useState<string | null>(null)
    const [deletingFilterId, setDeletingFilterId] = useState<string | null>(null)
    const [activeCategory, setActiveCategory] = useState<"mine" | "shared" | "all">("mine")
    const [search, setSearch] = useState("")
    const [selectedStatuses, setSelectedStatuses] = useState<MeetingStatus[]>([])
    const [selectedTemplates, setSelectedTemplates] = useState<string[]>([])
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
    const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
    const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
    const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [savedFiltersOpen, setSavedFiltersOpen] = useState(false)
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

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

    const activeFilter = useMemo(
        () => savedFilters.find((filter) => filter.id === activeFilterId) ?? null,
        [savedFilters, activeFilterId]
    )

    const filteredMeetings = useMemo(() => {
        const effectiveCategory = activeFilter?.filters.category ?? activeCategory

        let result: Meeting[] =
            effectiveCategory === "mine"
                ? annotatedMeetings
                : effectiveCategory === "shared"
                  ? sharedMeetings
                  : [...annotatedMeetings, ...sharedMeetings]

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (m) =>
                    m.title?.toLowerCase().includes(q) ||
                    m.workspace_meeting_id?.toLowerCase().includes(q)
            )
        }

        const effectiveStatuses =
            activeFilter?.filters.statuses && activeFilter.filters.statuses.length > 0
                ? activeFilter.filters.statuses
                : selectedStatuses

        if (effectiveStatuses.length > 0) {
            result = result.filter((m) =>
                effectiveStatuses.includes(m.status as MeetingStatus)
            )
        }

        const effectiveTemplates =
            activeFilter?.filters.templateIds && activeFilter.filters.templateIds.length > 0
                ? activeFilter.filters.templateIds
                : selectedTemplates

        if (effectiveTemplates.length > 0) {
            const hasNoTemplate = effectiveTemplates.includes("no-template")
            const templateIds = effectiveTemplates.filter((id) => id !== "no-template")
            result = result.filter((m) => {
                if (hasNoTemplate && !m.template_id) return true
                if (templateIds.length > 0 && m.template_id && templateIds.includes(m.template_id)) {
                    return true
                }
                return false
            })
        }

        if (activeFilter?.filters.hasZoom) {
            result = result.filter((m) => !!m.zoom_meeting_id)
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue: any = key === "template" ? a.templates?.name || "" : a[key as keyof Meeting]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue: any = key === "template" ? b.templates?.name || "" : b[key as keyof Meeting]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [
        activeCategory,
        activeFilter,
        annotatedMeetings,
        search,
        selectedStatuses,
        selectedTemplates,
        sharedMeetings,
        sortConfig,
    ])

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
        setSortConfig({ key, direction })
    }, [])

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

    const handleToggleColumnVisibility = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            const visibleCount = ["title", "template", "status", "scheduled_date", "scheduled_time"].filter(
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
        await (supabase.from("agenda_items") as any).delete().in("meeting_id", ids)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meetings") as any).delete().in("id", ids)

        if (error) {
            toast.error(error.message || `Failed to delete ${workspaceConfig.pluralLabel}`)
        } else {
            toast.success(
                `${ids.length} ${workspaceConfig.singularLabel}${ids.length > 1 ? "s" : ""} deleted`
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

    async function confirmDeleteFilter() {
        if (!deletingFilterId) return
        const id = deletingFilterId
        setDeletingFilterId(null)

        startDeleteTransition(async () => {
            const result = await deleteSavedPlanFilter(id, workspaceConfig.path)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setSavedFilters((prev) => prev.filter((filter) => filter.id !== id))
            if (activeFilterId === id) setActiveFilterId(null)
            toast.success("Filter deleted")
        })
    }

    const hasActiveFilters =
        !activeFilter &&
        (search.length > 0 ||
            selectedStatuses.length > 0 ||
            selectedTemplates.length > 0 ||
            hiddenColumns.size > 0)

    function formatStatusLabel(status: string) {
        return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
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

    if (isLoading) {
        return (
            <div className="flex h-full flex-col bg-muted/30">
                <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground" />
                        <p className="text-sm text-muted-foreground">Loading agendas...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-muted/30">
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/overview" },
                    { label: workspaceConfig.breadcrumbLabel },
                ]}
                className="bg-transparent ring-0 rounded-none border-b border-border/45 px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <TopbarSearchAction
                            value={search}
                            onChange={setSearch}
                            placeholder={workspaceConfig.searchPlaceholder}
                            items={filteredMeetings.slice(0, 8).map((meeting) => ({
                                id: meeting.id,
                                label: meeting.title,
                                actionLabel: "Open",
                            }))}
                            onSelect={(meetingId) => {
                                const planRoute = workspace === "programs" ? "program" : "agenda";
                                router.push(`/meetings/${planRoute}/${meetingId}`);
                            }}
                            emptyText={`No matching ${workspaceConfig.pluralLabel}.`}
                        />
                        {isLeader && (
                            <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            >
                                <Link href={workspaceConfig.createHref}>
                                    <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                                    {workspaceConfig.createLabel}
                                </Link>
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-2.5">
                <div className="flex min-h-8 flex-wrap items-center gap-2">
                </div>

                <div className="flex items-center gap-2">
                    <StandardPopoverMenu open={savedFiltersOpen} onOpenChange={setSavedFiltersOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton
                                title="Saved filters"
                                aria-label="Open saved filters"
                                className="h-8 w-8 border-[hsl(var(--chip-border)/0.9)] bg-white text-foreground/58 hover:border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-foreground/78 data-[state=open]:border-[hsl(var(--chip-active-border)/0.85)] data-[state=open]:bg-[hsl(var(--chip-active-bg)/0.72)] data-[state=open]:text-foreground/78"
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

                            {(selectedStatuses.length > 0 || selectedTemplates.length > 0) && !activeFilter && (
                                <StandardPopoverMenuItem
                                    onSelect={() => {
                                        setSelectedStatuses([])
                                        setSelectedTemplates([])
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
                                                <span className="truncate">{filter.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        setDeletingFilterId(filter.id)
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
                                        viewType={workspaceConfig.viewType}
                                        path={workspaceConfig.path}
                                        entityLabelPlural={workspaceConfig.pluralLabel}
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
                                className="h-8 w-8 border-[hsl(var(--chip-border)/0.9)] bg-white text-foreground/58 hover:border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-foreground/78 data-[state=open]:border-[hsl(var(--chip-active-border)/0.85)] data-[state=open]:bg-[hsl(var(--chip-active-bg)/0.72)] data-[state=open]:text-foreground/78"
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
                                { key: "scheduled_time", label: "Time" },
                                { key: "share_status", label: "Share Status" },
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

            {activeFilter && (
                <div className="flex flex-wrap items-center gap-2 px-6 pb-3 text-[length:var(--agenda-control-font-size)] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    <span className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 capitalize text-[hsl(var(--chip-text))] leading-none">
                        {activeFilter.filters.category ?? "all"} {workspaceConfig.pluralLabel}
                    </span>
                    {activeFilter.filters.statuses?.map((status) => (
                        <span key={status} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {formatStatusLabel(status)}
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
                            <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
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

            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
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
                    {selectedStatuses.map((status) => (
                        <span
                            key={status}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[length:var(--agenda-chip-font-size)] font-medium leading-none text-[hsl(var(--chip-text))]"
                        >
                            {formatStatusLabel(status)}
                            <button
                                onClick={() => handleStatusToggle(status)}
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

            <div className="flex-1 overflow-auto pb-5">
                {activeCategory === "shared" && !activeFilter && sharedMeetings.length === 0 && !search ? (
                    <div className="flex h-48 flex-col items-center justify-center text-center">
                        <p className="text-sm text-muted-foreground">
                            {workspaceConfig.sharedEmptyText}
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
                        workspace={workspace}
                        emptyText={workspaceConfig.emptyText}
                    />
                )}
            </div>

            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} {workspaceConfig.singularLabel}
                            {selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected {workspaceConfig.singularLabel}
                            {selectedRows.size > 1 ? "s" : ""} and all their plan content. This action cannot be undone.
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

            <AlertDialog open={!!deletingFilterId} onOpenChange={(open) => { if (!open) setDeletingFilterId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this filter?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This filter will be removed for everyone in your workspace. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingFilterId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteFilter}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete filter
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {mounted && selectedRows.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 z-[95] flex w-[90vw] -translate-x-1/2 justify-center pointer-events-none sm:w-auto">
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
