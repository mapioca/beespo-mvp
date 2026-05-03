"use client"

import { useState, useMemo, useCallback, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Checkbox as UICheckbox } from "@/components/ui/checkbox"
import { Check, Columns3, Plus, SlidersHorizontal, X, BookUser } from "lucide-react"
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"
import { clearDirectoryCache } from "@/lib/cache/form-data-cache"
import { canEdit } from "@/lib/auth/role-permissions"
import { toast } from "@/lib/toast"
import {
    DirectoryTable,
    Participant,
} from "@/components/participants/directory-table"
import { ParticipantDrawer } from "@/components/participants/participant-drawer"
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
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"

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

interface DirectoryClientProps {
    participants: Participant[]
    userRole: string
    totalCount: number
    currentSearch: string
    initialViews?: DirectoryView[]
}

// Export as both names for backward compat and new directory route
export function DirectoryClient(props: DirectoryClientProps) {
    return <DirectoryPageClient {...props} />
}

export function DirectoryPageClient({
    participants,
    userRole,
    initialViews = [],
}: DirectoryClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()
    const [mounted, setMounted] = useState(false)
    const canManage = canEdit(userRole)

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
    const [newGender, setNewGender] = useState<"male" | "female" | "unspecified">("unspecified")
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
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)
    const [createFilterDialogOpen, setCreateFilterDialogOpen] = useState(false)

    // Tags
    const [tagFilter, setTagFilter] = useState<string[]>([])
    const [workspaceTags, setWorkspaceTags] = useState<DirectoryTag[]>([])
    const [createTagDialogOpen, setCreateTagDialogOpen] = useState(false)
    const [isCreatingTag, setIsCreatingTag] = useState(false)
    const [manageTagsDialogOpen, setManageTagsDialogOpen] = useState(false)

    // Fetch workspace tags on mount
    useEffect(() => {
        getDirectoryTags()
            .then(({ data, error }) => {
                if (error) {
                    toast.error(error)
                    return
                }
                if (data) setWorkspaceTags(data)
            })
            .catch((error) => {
                console.error("Failed to fetch directory tags:", error)
                toast.error("Failed to load tags")
            })
    }, [])

    useEffect(() => {
        setMounted(true)
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
        } catch (error) {
            console.error("Failed to create tag:", error)
            toast.error("Failed to create tag")
        } finally {
            setIsCreatingTag(false)
        }
    }

    const handleUpdateTag = async (id: string, name: string, color: string) => {
        try {
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
        } catch (error) {
            console.error("Failed to update tag:", error)
            toast.error("Failed to update tag")
        }
    }

    const handleDeleteTag = async (id: string) => {
        try {
            const { error } = await deleteDirectoryTag(id)
            if (error) {
                toast.error(error)
            } else {
                setWorkspaceTags((prev) => prev.filter((t) => t.id !== id))
                setTagFilter((prev) => prev.filter((tId) => tId !== id))
                toast.success("Tag deleted")
                router.refresh()
            }
        } catch (error) {
            console.error("Failed to delete tag:", error)
            toast.error("Failed to delete tag")
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

    const handleToggleColumnVisibility = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            const visibleCount = ["name", "gender"].filter((c) => !next.has(c)).length
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
            gender: newGender === "unspecified" ? null : newGender,
            workspace_id: profile.workspace_id,
            created_by: user.id,
        })

        if (error) {
            toast.error("Failed to add to directory")
        } else {
            clearDirectoryCache()
            toast.success("Added to directory")
            setNewName("")
            setNewGender("unspecified")
            setCreateDialogOpen(false)
            router.refresh()
        }
        setIsCreating(false)
    }

    const handleUpdateGender = async (id: string, gender: "male" | "female") => {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("directory") as any)
            .update({ gender })
            .eq("id", id)
        if (error) {
            toast.error("Failed to update gender")
        } else {
            clearDirectoryCache()
            router.refresh()
        }
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
            clearDirectoryCache()
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
            clearDirectoryCache()
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

    const tagCounts = useMemo(() => {
        const counts: Record<string, number> = {}
        participants.forEach((participant) => {
            if (!participant.tags || participant.tags.length === 0) {
                counts.untagged = (counts.untagged || 0) + 1
                return
            }
            participant.tags.forEach((tag) => {
                counts[tag.id] = (counts[tag.id] || 0) + 1
            })
        })
        return counts
    }, [participants])

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Directory", icon: <BookUser className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <TopbarSearchAction
                            value={search}
                            onChange={setSearch}
                            placeholder="Search directory..."
                            items={filteredParticipants.slice(0, 8).map((participant) => ({
                                id: participant.id,
                                label: participant.name,
                                actionLabel: "Open",
                            }))}
                            onSelect={(participantId) => {
                                const participant = filteredParticipants.find((item) => item.id === participantId)
                                if (!participant) return
                                handleViewParticipant(participant)
                            }}
                            emptyText="No matching directory members."
                        />
                        {canManage && (
                            <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={() => setCreateDialogOpen(true)}
                                            aria-label="New member"
                                            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="left"
                                        sideOffset={6}
                                        showArrow={false}
                                        className="rounded-[4px] bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium tracking-tight shadow-sm"
                                    >
                                        New member
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                }
            />

            {/* Action Bar + Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-3.5 pb-3.5 shrink-0 flex-wrap gap-3 border-b border-border/45">
                <div className="flex items-center gap-2 flex-wrap min-h-8">
                    {/* All tab */}
                <button
                    onClick={() => setActiveViewId(null)}
                    className={
                        activeViewId === null
                            ? "rounded-full border border-transparent px-3.5 py-1.5 text-[11px] font-semibold leading-none bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))] transition-all shadow-[0_1px_0_rgba(15,23,42,0.1)]"
                            : "rounded-full border px-3.5 py-1.5 text-[11px] font-medium leading-none bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-[hsl(var(--chip-active-text))] transition-all"
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
                                "rounded-full border pl-3.5 pr-7 py-1.5 text-[11px] leading-none transition-all shadow-sm",
                                activeViewId === view.id
                                    ? "bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))] border-transparent font-semibold"
                                    : "bg-[hsl(var(--chip-bg))] text-[hsl(var(--chip-text))] border-[hsl(var(--chip-border))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-[hsl(var(--chip-active-text))] font-medium"
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

                <StandardPopoverMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <StandardPopoverMenuTrigger asChild>
                        <ToolbarIconButton title="Filters" aria-label="Open filters">
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                        </ToolbarIconButton>
                    </StandardPopoverMenuTrigger>
                    <StandardPopoverMenuContent align="start" className="w-64">
                        <StandardPopoverMenuSub>
                            <StandardPopoverMenuSubTrigger
                                active={tagFilter.length > 0}
                                disabled={!!activeView}
                            >
                                Tags
                            </StandardPopoverMenuSubTrigger>
                            <StandardPopoverMenuSubContent className="max-h-72 overflow-y-auto">
                                <StandardPopoverMenuItem
                                    active={tagFilter.includes("untagged")}
                                    onSelect={() => {
                                        if (activeView) return
                                        setTagFilter((prev) =>
                                            prev.includes("untagged")
                                                ? prev.filter((id) => id !== "untagged")
                                                : [...prev, "untagged"]
                                        )
                                    }}
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                            {tagFilter.includes("untagged") ? <Check className="h-3 w-3" /> : null}
                                        </span>
                                        Untagged
                                    </span>
                                    <span className="ml-auto text-[length:var(--table-header-font-size)] text-muted-foreground">
                                        {tagCounts.untagged || 0}
                                    </span>
                                </StandardPopoverMenuItem>
                                {workspaceTags.map((tag) => {
                                    const selected = tagFilter.includes(tag.id)
                                    return (
                                        <StandardPopoverMenuItem
                                            key={tag.id}
                                            active={selected}
                                            onSelect={() => {
                                                if (activeView) return
                                                setTagFilter((prev) =>
                                                    prev.includes(tag.id)
                                                        ? prev.filter((id) => id !== tag.id)
                                                        : [...prev, tag.id]
                                                )
                                            }}
                                        >
                                            <span className="flex min-w-0 items-center gap-2">
                                                <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-border/60">
                                                    {selected ? <Check className="h-3 w-3" /> : null}
                                                </span>
                                                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                                <span className="truncate">{tag.name}</span>
                                            </span>
                                            <span className="ml-auto shrink-0 text-[length:var(--table-header-font-size)] text-muted-foreground">
                                                {tagCounts[tag.id] || 0}
                                            </span>
                                        </StandardPopoverMenuItem>
                                    )
                                })}

                                {canManage && (
                                    <>
                                        <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                                        <StandardPopoverMenuItem onSelect={() => setCreateTagDialogOpen(true)}>
                                            <Plus className="h-3.5 w-3.5" />
                                            Create new tag
                                        </StandardPopoverMenuItem>
                                        <StandardPopoverMenuItem onSelect={() => setManageTagsDialogOpen(true)}>
                                            Manage tags
                                        </StandardPopoverMenuItem>
                                    </>
                                )}
                            </StandardPopoverMenuSubContent>
                        </StandardPopoverMenuSub>

                        {!activeView && tagFilter.length > 0 && (
                            <StandardPopoverMenuItem
                                onSelect={() => setTagFilter([])}
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
                        <ToolbarIconButton title="Display options" aria-label="Display options">
                            <Columns3 className="h-3.5 w-3.5" />
                        </ToolbarIconButton>
                    </StandardPopoverMenuTrigger>
                    <StandardPopoverMenuContent align="start" className="w-56">
                        <StandardPopoverMenuItem
                            onSelect={() => handleToggleColumnVisibility("name")}
                            className="gap-2"
                        >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                {!hiddenColumns.has("name") ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span>Name</span>
                        </StandardPopoverMenuItem>
                        <StandardPopoverMenuItem
                            onSelect={() => handleToggleColumnVisibility("gender")}
                            className="gap-2"
                        >
                            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                {!hiddenColumns.has("gender") ? <Check className="h-3 w-3" /> : null}
                            </span>
                            <span>Gender</span>
                        </StandardPopoverMenuItem>
                    </StandardPopoverMenuContent>
                </StandardPopoverMenu>
                </div>
            </div>

            {/* View filter summary */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {describeViewFilters(activeView.filters).map((desc, i) => (
                        <span key={i} className="rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[hsl(var(--chip-text))] leading-none">
                            {desc}
                        </span>
                    ))}
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
                </div>
            )}

            {/* Active filter chips — non-view mode only */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
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
                                className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]"
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
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
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
                        className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <DirectoryTable
                    participants={filteredParticipants}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    hiddenColumns={hiddenColumns}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewParticipant={handleViewParticipant}
                    onAddSpeakingAssignment={handleAddSpeakingAssignment}
                    onDelete={canManage ? handleDelete : undefined}
                    onUpdateGender={canManage ? handleUpdateGender : undefined}
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
                        <div className="space-y-3">
                            <Input
                                placeholder="Enter name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && handleCreate()
                                }
                                autoFocus
                            />
                            <div className="space-y-2">
                                <Label htmlFor="new-member-gender">Gender (optional)</Label>
                                <Select
                                    value={newGender}
                                    onValueChange={(value) =>
                                        setNewGender(value as "male" | "female" | "unspecified")
                                    }
                                >
                                    <SelectTrigger id="new-member-gender">
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unspecified">Unspecified</SelectItem>
                                        <SelectItem value="male">Male</SelectItem>
                                        <SelectItem value="female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
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

            <CreateDirectoryViewDialog
                workspaceTags={workspaceTags}
                onCreated={handleViewCreated}
                open={createFilterDialogOpen}
                onOpenChange={setCreateFilterDialogOpen}
                hideTrigger
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

// Backward-compatible alias while imports are migrated.
export { DirectoryPageClient as ParticipantsClient }
