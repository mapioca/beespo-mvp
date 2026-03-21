"use client"

import { useState, useMemo, useCallback } from "react"
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

interface ParticipantsClientProps {
    participants: Participant[]
    userRole: string
    totalCount: number
    currentSearch: string
}

// Export as both names for backward compat and new directory route
export function DirectoryClient(props: ParticipantsClientProps) {
    return <ParticipantsClient {...props} />
}

export function ParticipantsClient({
    participants,
    userRole,
}: ParticipantsClientProps) {
    const router = useRouter()
    const canManage = userRole === "leader" || userRole === "admin"

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

    // ── Derived data ────────────────────────────────────────────────────────

    const filteredParticipants = useMemo(() => {
        let result = participants

        if (search) {
            const q = search.toLowerCase()
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
            )
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
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
    }, [participants, search, sortConfig])

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

        // Create meeting_assignment with type 'speaker' using the directory entry
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

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters = search.length > 0 || hiddenColumns.size > 0

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/30">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Directory", href: "/directory", icon: <Users className="h-3.5 w-3.5" /> },
                    { label: "Members", icon: <BookUser className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Directory
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage people and assignments
                    </p>
                </div>
                {canManage && (
                    <Button
                        size="sm"
                        onClick={() => setCreateDialogOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Person
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

            {/* Active filter chips */}
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
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6">
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
            />

            {/* Create dialog */}
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
        </div>
    )
}
