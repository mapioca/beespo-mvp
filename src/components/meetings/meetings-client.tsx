"use client"

import { useState, useMemo, useCallback } from "react"
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

interface MeetingsClientProps {
    meetings: Meeting[]
    templates: Template[]
    workspaceSlug: string | null
    isLeader: boolean
    statusCounts: Record<string, number>
    templateCounts: Record<string, number>
}

export function MeetingsClient({
    meetings,
    templates,
    workspaceSlug,
    isLeader,
    statusCounts,
    templateCounts,
}: MeetingsClientProps) {
    const router = useRouter()

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<MeetingStatus[]>(
        []
    )
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

    // ── Derived data ────────────────────────────────────────────────────────

    const filteredMeetings = useMemo(() => {
        let result = meetings

        // Search (client-side on title, workspace meeting id)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (m) =>
                    m.title?.toLowerCase().includes(q) ||
                    m.workspace_meeting_id?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (selectedStatuses.length > 0) {
            result = result.filter((m) =>
                selectedStatuses.includes(m.status as MeetingStatus)
            )
        }

        // Template filter
        if (selectedTemplates.length > 0) {
            const hasNoTemplate = selectedTemplates.includes("no-template")
            const templateIds = selectedTemplates.filter(
                (id) => id !== "no-template"
            )
            result = result.filter((m) => {
                if (hasNoTemplate && !m.template_id) return true
                if (
                    templateIds.length > 0 &&
                    m.template_id &&
                    templateIds.includes(m.template_id)
                )
                    return true
                return false
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
    }, [meetings, search, selectedStatuses, selectedTemplates, sortConfig])

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

        // Delete agenda items first (foreign key constraint)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("agenda_items") as any)
            .delete()
            .in("meeting_id", ids)

        // Then delete the meetings
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

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedTemplates.length > 0 ||
        hiddenColumns.size > 0

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    function getTemplateName(id: string) {
        if (id === "no-template") return "No Template"
        return templates.find((t) => t.id === id)?.name || id
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Agendas", icon: <ClipboardList className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Agendas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your meeting agendas
                    </p>
                </div>
                {isLeader && (
                    <Button asChild size="sm">
                        <Link href="/meetings/new">
                            <Plus className="mr-2 h-4 w-4" />
                            New Meeting
                        </Link>
                    </Button>
                )}
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
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {formatStatusLabel(s)}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {selectedTemplates.map((id) => (
                        <span
                            key={id}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {getTemplateName(id)}
                            <button
                                onClick={() => handleTemplateToggle(id)}
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
            <div className="flex-1 overflow-auto px-6">
                <MeetingsTable
                    meetings={filteredMeetings}
                    templates={templates}
                    workspaceSlug={workspaceSlug}
                    isLeader={isLeader}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={handleStatusToggle}
                    selectedTemplates={selectedTemplates}
                    templateCounts={templateCounts}
                    onTemplateToggle={handleTemplateToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
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
        </div>
    )
}
