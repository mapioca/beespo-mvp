"use client"

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"
import { Plus, X, Trash2, Users, BookUser } from "lucide-react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
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
    ParticipantsTable,
    Participant,
} from "@/components/participants/participants-table"
import { ParticipantDrawer } from "@/components/participants/participant-drawer"
import { TagFilterDropdown } from "@/components/participants/tag-filter-dropdown"
import { CreateTagDialog } from "@/components/participants/create-tag-dialog"
import { ManageTagsDialog } from "@/components/participants/manage-tags-dialog"
import {
    getDirectoryTags,
    createDirectoryTag,
    updateDirectoryTag,
    deleteDirectoryTag,
} from "@/lib/actions/directory-tag-actions"
import type { DirectoryTag } from "@/types/database"
import { DirectoryView, DirectoryViewFilters, deleteDirectoryView } from "@/lib/directory-views"
import { CreateDirectoryViewDialog } from "@/components/participants/create-directory-view-dialog"
import { cn } from "@/lib/utils"

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns true if the participant matches the given directory view filters.
 * All criteria are AND-ed together.
 */
function matchesViewFilters(
    participant: Participant,
    filters: DirectoryViewFilters
): boolean {
    const assignments = participant.meeting_assignments ?? []

    // ── Tag filter ────────────────────────────────────────────────────────────
    if (filters.tagIds && filters.tagIds.length > 0) {
        const pTagIds = (participant.tags ?? []).map((t) => t.id)
        const wantsUntagged = filters.tagIds.includes("untagged")
        const specificTags = filters.tagIds.filter((id) => id !== "untagged")

        if (wantsUntagged && pTagIds.length > 0) return false
        if (!wantsUntagged && specificTags.length > 0) {
            // All requested tags must be present
            if (!specificTags.every((id) => pTagIds.includes(id))) return false
        }
    }

    // ── Speaker assignment filter ─────────────────────────────────────────────
    const speakerAssignments = assignments.filter(
        (a) => a.assignment_type === "speaker"
    )

    if (filters.speakerDateOperator === "none") {
        if (speakerAssignments.length > 0) return false
    } else if (filters.speakerDateOperator === "any") {
        if (speakerAssignments.length === 0) return false
        if (filters.speakerConfirmed && filters.speakerConfirmed !== "any") {
            const wantConfirmed = filters.speakerConfirmed === "confirmed"
            if (!speakerAssignments.some((a) => a.is_confirmed === wantConfirmed))
                return false
        }
    } else if (
        filters.speakerDateOperator &&
        ["after", "before", "not_before", "not_after"].includes(filters.speakerDateOperator)
    ) {
        if (speakerAssignments.length === 0) return false

        if (filters.speakerDateValue) {
            // Compare against the actual meeting's scheduled_date
            // (only assignments linked to a meeting have this; standalone ones are skipped)
            const targetDate = new Date(filters.speakerDateValue)
            const matchingAssignments = speakerAssignments.filter((a) => {
                if (!a.meeting_scheduled_date) return false
                const d = new Date(a.meeting_scheduled_date)
                
                if (filters.speakerDateOperator === "after") return d > targetDate
                if (filters.speakerDateOperator === "not_before") return d >= targetDate
                if (filters.speakerDateOperator === "before") return d < targetDate
                if (filters.speakerDateOperator === "not_after") return d <= targetDate
                return false
            })
            if (matchingAssignments.length === 0) return false

            if (filters.speakerConfirmed && filters.speakerConfirmed !== "any") {
                const wantConfirmed = filters.speakerConfirmed === "confirmed"
                if (!matchingAssignments.some((a) => a.is_confirmed === wantConfirmed))
                    return false
            }
        } else if (filters.speakerConfirmed && filters.speakerConfirmed !== "any") {
            const wantConfirmed = filters.speakerConfirmed === "confirmed"
            if (!speakerAssignments.some((a) => a.is_confirmed === wantConfirmed))
                return false
        }
    }

    // ── Meeting history filter ────────────────────────────────────────────────
    if (filters.historyFilter === "has_history") {
        if (assignments.length === 0) return false
    } else if (filters.historyFilter === "no_history") {
        if (assignments.length > 0) return false
    }

    return true
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ParticipantsClientProps {
    participants: Participant[]
    userRole: string
    totalCount: number
    currentSearch: string
    initialViews?: DirectoryView[]
}

// Export as both names for backward compat and new directory route
export function DirectoryClient(props: ParticipantsClientProps) {
    return <ParticipantsClient {...props} />
}

export function ParticipantsClient({
    participants,
    userRole,
    initialViews = [],
}: ParticipantsClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const canManage = userRole === "leader" || userRole === "admin"

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<DirectoryView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    // Drawer
    const [selectedParticipant, setSelectedParticipant] =
        useState<Participant | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Create dialog
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [newName, setNewName] = useState("")
    const [isCreating, setIsCreating] = useState(false)

    // Speaking assignment dialog
    const [speakerDialogOpen, setSpeakerDialogOpen] = useState(false)
    const [speakerTarget, setSpeakerTarget] = useState<Participant | null>(null)
    const [speakerTopic, setSpeakerTopic] = useState("")
    const [speakerConfirmed, setSpeakerConfirmed] = useState(false)
    const [isCreatingSpeaker, setIsCreatingSpeaker] = useState(false)

    // Search
    const [search, setSearch] = useState("")

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

    // Tags
    const [tagFilter, setTagFilter] = useState<string[]>([])
    const [workspaceTags, setWorkspaceTags] = useState<DirectoryTag[]>([])
    const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false)
    const [isCreatingTag, setIsCreatingTag] = useState(false)
    const [manageTagsDialogOpen, setManageTagsDialogOpen] = useState(false)

    // Fetch workspace tags on mount
    useEffect(() => {
        getDirectoryTags().then(({ data }) => {
            if (data) setWorkspaceTags(data)
        })
    }, [])

    const handleCreateTag = async (name: string, color: string) => {
        setIsCreatingTag(true)
        try {
            const { data, error } = await createDirectoryTag({ name, color })
            if (error) {
                toast.error(error)
            } else if (data) {
                setWorkspaceTags((prev) =>
                    [...prev, data].sort((a, b) => a.name.localeCompare(b.name))
                )
                toast.success("Tag created")
            }
        } finally {
            setIsCreatingTag(false)
        }
    }

    const handleUpdateTag = async (id: string, name: string, color: string) => {
        const { data, error } = await updateDirectoryTag(id, { name, color })
        if (error) {
            toast.error(error)
        } else if (data) {
            setWorkspaceTags((prev) =>
                prev.map((t) => (t.id === id ? data : t)).sort((a, b) => a.name.localeCompare(b.name))
            )
            toast.success("Tag updated")
            router.refresh()
        }
    }

    const handleDeleteTag = async (id: string) => {
        const { error } = await deleteDirectoryTag(id)
        if (error) {
            toast.error(error)
        } else {
            setWorkspaceTags((prev) => prev.filter((t) => t.id !== id))
            setTagFilter((prev) => prev.filter((tId) => tId !== id))
            toast.success("Tag deleted")
            router.refresh()
        }
    }

    // ── Derived data ─────────────────────────────────────────────────────────

    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

    const filteredParticipants = useMemo(() => {
        let result = participants

        // Apply view filters first
        if (activeView) {
            result = result.filter((p) =>
                matchesViewFilters(p, activeView.filters)
            )
        } else {
            // Manual tag filter (only in non-view mode)
            if (tagFilter.length > 0) {
                result = result.filter((p) =>
                    tagFilter.every((tagId) =>
                        p.tags?.some((t) => t.id === tagId)
                    )
                )
            }
        }

        // Search always applies
        if (search) {
            const q = search.toLowerCase()
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
            )
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig

                if (key === "tags") {
                    const aValue = (a.tags?.length ?? 0)
                    const bValue = (b.tags?.length ?? 0)
                    if (aValue < bValue) return direction === "asc" ? -1 : 1
                    if (aValue > bValue) return direction === "asc" ? 1 : -1
                    return 0
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue = a[key as keyof Participant] as any
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue = b[key as keyof Participant] as any
                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [participants, search, sortConfig, tagFilter, activeView])

    // ── Handlers ─────────────────────────────────────────────────────────────

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
            if (prev.size === filteredParticipants.length) return new Set()
            return new Set(filteredParticipants.map((p) => p.id))
        })
    }, [filteredParticipants])

    const handleCreate = async () => {
        if (!newName.trim()) return
        setIsCreating(true)
        const supabase = createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            setIsCreating(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single()

        if (!profile?.workspace_id) {
            setIsCreating(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("directory") as any).insert({
            name: newName.trim(),
            workspace_id: profile.workspace_id,
            created_by: user.id,
        })

        if (error) {
            toast.error("Failed to add to directory")
        } else {
            toast.success("Added to directory")
            setNewName("")
            setCreateDialogOpen(false)
            router.refresh()
        }
        setIsCreating(false)
    }

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("directory") as any)
            .delete()
            .eq("id", id)

        if (error) {
            toast.error("Failed to delete entry")
        } else {
            toast.success("Entry deleted")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("directory") as any)
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete items")
        } else {
            toast.success(
                `${ids.length} entr${ids.length > 1 ? "ies" : "y"} deleted`
            )
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    const handleAddSpeakingAssignment = (participant: Participant) => {
        setSpeakerTarget(participant)
        setSpeakerTopic("")
        setSpeakerConfirmed(false)
        setSpeakerDialogOpen(true)
    }

    const handleCreateSpeaker = async () => {
        if (!speakerTarget || !speakerTopic.trim()) return
        setIsCreatingSpeaker(true)
        const supabase = createClient()

        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            setIsCreatingSpeaker(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single()

        if (!profile?.workspace_id) {
            setIsCreatingSpeaker(false)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("meeting_assignments") as any).insert({
            directory_id: speakerTarget.id,
            assignment_type: "speaker",
            topic: speakerTopic.trim(),
            is_confirmed: speakerConfirmed,
            workspace_id: profile.workspace_id,
            created_by: user.id,
        })

        if (error) {
            toast.error(error.message || "Failed to create speaking assignment")
        } else {
            toast.success("Speaking assignment created")
            setSpeakerDialogOpen(false)
            router.refresh()
        }
        setIsCreatingSpeaker(false)
    }

    const handleViewParticipant = (participant: Participant) => {
        setSelectedParticipant(participant)
        setDrawerOpen(true)
    }

    // ── View handlers ─────────────────────────────────────────────────────────

    function handleViewCreated(view: DirectoryView) {
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
            const result = await deleteDirectoryView(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setViews((prev) => prev.filter((v) => v.id !== id))
            if (activeViewId === id) setActiveViewId(null)
            toast.success("View deleted")
        })
    }

    // ── Filter summary helpers ────────────────────────────────────────────────

    function describeViewFilters(filters: DirectoryViewFilters): string[] {
        const parts: string[] = []

        if (filters.tagIds && filters.tagIds.length > 0) {
            const names = filters.tagIds.map((id) => {
                if (id === "untagged") return "Untagged"
                return workspaceTags.find((t) => t.id === id)?.name ?? id
            })
            parts.push(`Tags: ${names.join(", ")}`)
        }

        if (filters.speakerDateOperator === "none") {
            parts.push("No speaker assignments")
        } else if (filters.speakerDateOperator === "any") {
            const conf =
                filters.speakerConfirmed === "confirmed"
                    ? " (confirmed)"
                    : filters.speakerConfirmed === "pending"
                      ? " (pending)"
                      : ""
            parts.push(`Has speaker assignment${conf}`)
        } else if (
            filters.speakerDateOperator &&
            ["after", "before", "not_before", "not_after"].includes(filters.speakerDateOperator)
        ) {
            const opMap: Record<string, string> = {
                after: "is after",
                before: "is before",
                not_before: "is not before",
                not_after: "is not after",
            }
            const op = opMap[filters.speakerDateOperator as string] || filters.speakerDateOperator
            const date = filters.speakerDateValue
                ? new Date(filters.speakerDateValue).toLocaleDateString()
                : "—"
            const conf =
                filters.speakerConfirmed === "confirmed"
                    ? " · confirmed"
                    : filters.speakerConfirmed === "pending"
                      ? " · pending"
                      : ""
            parts.push(`Speaker assignment ${op} ${date}${conf}`)
        }

        if (filters.historyFilter === "has_history") parts.push("Has meeting history")
        if (filters.historyFilter === "no_history") parts.push("No meeting history")

        return parts
    }

    // ── Active filter chips ───────────────────────────────────────────────────

    const hasActiveFilters =
        !activeView &&
        (search.length > 0 || hiddenColumns.size > 0 || tagFilter.length > 0)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Directory", href: "/directory", icon: <Users className="h-4 w-4 stroke-[1.6]" /> },
                    { label: "Members", icon: <BookUser className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
            />

            {/* Action Bar + Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-4 pb-3 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* All tab */}
                <button
                    onClick={() => setActiveViewId(null)}
                    className={
                        activeViewId === null
                            ? "rounded-full border px-3.5 py-1 text-xs font-medium bg-[hsl(var(--accent-warm))] text-foreground border-border/60 transition-all shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                            : "rounded-full border px-3.5 py-1 text-xs font-medium text-muted-foreground border-border/60 hover:text-foreground hover:bg-[hsl(var(--accent-warm)/0.5)] hover:border-border/60 transition-all"
                    }
                >
                    All Members
                </button>

                {/* Divider */}
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
                        {/* Delete × on hover */}
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

                {/* Divider before action buttons */}
                <span className="h-4 w-px bg-border mx-1 shrink-0" aria-hidden />

                {/* Tags filter — hidden when a view is active */}
                {!activeView && (
                    <TagFilterDropdown
                        workspaceTags={workspaceTags}
                        selectedTagIds={tagFilter}
                        onSelectionChange={setTagFilter}
                        canManage={canManage}
                        onCreateTag={() => setCreateTagDialogOpen(true)}
                        onManageTags={() => setManageTagsDialogOpen(true)}
                    />
                )}

                {/* Add view button */}
                <CreateDirectoryViewDialog
                    workspaceTags={workspaceTags}
                    onCreated={handleViewCreated}
                />
                </div>

                {/* Top Actions */}
                <div className="flex items-center gap-2">
                    {canManage && (
                        <Button
                            variant="ghost"
                            className="rounded-full border px-3.5 py-1 text-xs font-medium text-foreground border-border/60 bg-[hsl(var(--accent-warm))] hover:bg-[hsl(var(--accent-warm-hover))] transition-all shadow-[0_1px_0_rgba(15,23,42,0.08)]"
                            onClick={() => setCreateDialogOpen(true)}
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5 stroke-[1.6]" />
                            New
                        </Button>
                    )}
                </div>
            </div>

            {/* View filter summary */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {describeViewFilters(activeView.filters).map((desc, i) => (
                        <span key={i} className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">
                            {desc}
                        </span>
                    ))}
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

            {/* Active filter chips — non-view mode only */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-xs font-medium text-slate-800 border border-border/50">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {tagFilter.map((tagId) => {
                        const tag = workspaceTags.find((t) => t.id === tagId)
                        return tag ? (
                            <span
                                key={tagId}
                                className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-xs font-medium text-slate-800 border border-border/50"
                            >
                                Tag: {tag.name}
                                <button
                                    onClick={() =>
                                        setTagFilter((prev) =>
                                            prev.filter((id) => id !== tagId)
                                        )
                                    }
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3 stroke-[1.6]" />
                                </button>
                            </span>
                        ) : null
                    })}
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
                            setHiddenColumns(new Set())
                            setTagFilter([])
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <ParticipantsTable
                    participants={filteredParticipants}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewParticipant={handleViewParticipant}
                    onAddSpeakingAssignment={handleAddSpeakingAssignment}
                    onDelete={canManage ? handleDelete : undefined}
                />
            </div>

            {/* Drawer */}
            <ParticipantDrawer
                participant={selectedParticipant}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onDelete={handleDelete}
                canManage={canManage}
                workspaceTags={workspaceTags}
                onTagCreated={(tag) => {
                    setWorkspaceTags((prev) =>
                        [...prev, tag].sort((a, b) =>
                            a.name.localeCompare(b.name)
                        )
                    )
                }}
            />

            {/* Create person dialog */}
            <Dialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add to Directory</DialogTitle>
                        <DialogDescription>
                            Add a new person to the directory for meeting
                            assignments
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Enter name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === "Enter" && handleCreate()
                            }
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!newName.trim() || isCreating}
                        >
                            {isCreating ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add speaking assignment dialog */}
            <Dialog
                open={speakerDialogOpen}
                onOpenChange={setSpeakerDialogOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Speaking Assignment</DialogTitle>
                        <DialogDescription>
                            Create a speaking assignment for{" "}
                            {speakerTarget?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Speaker Name</Label>
                            <Input
                                value={speakerTarget?.name ?? ""}
                                disabled
                                className="bg-muted"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="speaker-topic">Topic *</Label>
                            <Textarea
                                id="speaker-topic"
                                value={speakerTopic}
                                onChange={(e) =>
                                    setSpeakerTopic(e.target.value)
                                }
                                placeholder="What will they speak about?"
                                rows={3}
                                autoFocus
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <UICheckbox
                                id="speaker-confirmed"
                                checked={speakerConfirmed}
                                onCheckedChange={(checked) =>
                                    setSpeakerConfirmed(checked === true)
                                }
                            />
                            <Label
                                htmlFor="speaker-confirmed"
                                className="text-sm font-medium leading-none cursor-pointer"
                            >
                                Speaker is confirmed
                            </Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSpeakerDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateSpeaker}
                            disabled={
                                !speakerTopic.trim() || isCreatingSpeaker
                            }
                        >
                            {isCreatingSpeaker ? "Creating..." : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create tag dialog */}
            <CreateTagDialog
                open={createTagDialogOpen}
                onOpenChange={setCreateTagDialogOpen}
                onCreateTag={handleCreateTag}
                isLoading={isCreatingTag}
            />

            {/* Manage tags dialog */}
            <ManageTagsDialog
                open={manageTagsDialogOpen}
                onOpenChange={setManageTagsDialogOpen}
                tags={workspaceTags}
                onUpdateTag={handleUpdateTag}
                onDeleteTag={handleDeleteTag}
            />

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} entr
                            {selectedRows.size > 1 ? "ies" : "y"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected
                            entr{selectedRows.size > 1 ? "ies" : "y"} and
                            all associated assignments. This action cannot
                            be undone.
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
