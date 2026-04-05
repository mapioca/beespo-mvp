"use client"

import { useState, useCallback, useRef, Fragment } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
    Eye,
    Trash2,
    Users,
    Speech,
    Loader2,
    Calendar,
    ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import { StandardActionsHeadCell, StandardSelectAllHeadCell, StandardTableShell } from "@/components/ui/standard-data-table"
import {
    getParticipantHistory,
    getSpeakingAssignments,
    type ParticipantHistoryItem,
    type SpeakingAssignment,
} from "@/lib/actions/meeting-actions"
import { TagChip } from "@/components/ui/tag-chip"
import type { DirectoryTag } from "@/types/database"

// ── Types ───────────────────────────────────────────────────────────────────

export interface MeetingAssignmentSummary {
    id: string
    assignment_type: string
    is_confirmed: boolean
    created_at: string
    /** The scheduled_date of the meeting this assignment is linked to (null if standalone) */
    meeting_scheduled_date?: string | null
}

export interface Participant {
    id: string
    name: string
    created_at: string
    created_by: string | null
    profiles?: { full_name: string } | null
    tags?: DirectoryTag[]
    /** Enriched by the directory page for view-based filtering */
    meeting_assignments?: MeetingAssignmentSummary[]
}

interface ExpandedData {
    history: ParticipantHistoryItem[]
    speaking: SpeakingAssignment[]
}

const ITEM_TYPE_LABELS: Record<string, string> = {
    speaker: "Speaker",
    procedural: "Procedural",
    discussion: "Discussion",
    business: "Business",
    announcement: "Announcement",
}

// ── Props ───────────────────────────────────────────────────────────────────

interface DirectoryTableProps {
    participants: Participant[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Column visibility
    hiddenColumns?: Set<string>
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
    // Actions
    onViewParticipant?: (participant: Participant) => void
    onAddSpeakingAssignment?: (participant: Participant) => void
    onDelete?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function DirectoryTable({
    participants,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewParticipant,
    onAddSpeakingAssignment,
    onDelete,
}: DirectoryTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Track which rows are currently open (visibility only)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    // Track which rows are currently loading
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
    // Persistent data cache — survives collapse/re-expand cycles
    const dataCache = useRef<Map<string, ExpandedData>>(new Map())

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        participants.length > 0 && selectedRows.size === participants.length

    const visibleColumns =
        ["name"].filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    const toggleExpand = useCallback(
        async (participant: Participant) => {
            const id = participant.id

            // Collapse if already open
            if (expandedIds.has(id)) {
                setExpandedIds((prev) => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
                return
            }

            // Open immediately
            setExpandedIds((prev) => new Set(prev).add(id))

            // Skip fetch if data is already cached
            if (dataCache.current.has(id)) return

            // Mark as loading and fetch
            setLoadingIds((prev) => new Set(prev).add(id))

            try {
                const [historyResult, speakingResult] = await Promise.all([
                    getParticipantHistory(id),
                    getSpeakingAssignments(id),
                ])

                dataCache.current.set(id, {
                    history: historyResult.items,
                    speaking: speakingResult.items,
                })
            } catch (error) {
                console.error("Failed to fetch directory row details:", error)
                dataCache.current.set(id, {
                    history: [],
                    speaking: [],
                })
            } finally {
                setLoadingIds((prev) => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
            }
        },
        [expandedIds]
    )

    return (
        <>
            <StandardTableShell className="overflow-hidden">
            <Table className="text-[13px]">
                <TableHeader>
                    <TableRow className="table-header-row-standard">
                        <StandardSelectAllHeadCell
                            checked={allSelected}
                            onToggle={() => onToggleAllRows?.()}
                            className="w-10 table-cell-check static px-[var(--table-cell-px)] py-[var(--table-row-py)] backdrop-blur-none"
                        />

                        {/* Name */}
                        {!hiddenColumns.has("name") && (
                            <SortableTableHeader
                                sortKey="name"
                                label="Name"
                                defaultDirection="asc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                            />
                        )}

                        <StandardActionsHeadCell className="static backdrop-blur-none" />
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {participants.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Users className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">
                                        No directory entries found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        participants.map((participant) => {
                            const isExpanded = expandedIds.has(participant.id)
                            const isLoading = loadingIds.has(participant.id)
                            const cached = dataCache.current.get(participant.id)

                            return (
                                <Fragment key={participant.id}>
                                    <TableRow
                                        data-state={selectedRows.has(participant.id) ? "selected" : undefined}
                                        className={cn(
                                            "group cursor-pointer transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[hsl(var(--table-row-hover))] hover:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.28)] data-[state=selected]:bg-[hsl(var(--table-row-selected))] data-[state=selected]:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.4)]",
                                            isExpanded && "bg-[hsl(var(--table-row-hover))]"
                                        )}
                                        onClick={() =>
                                            toggleExpand(participant)
                                        }
                                    >
                                        {/* Checkbox */}
                                        <TableCell
                                            className="table-cell-check"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={selectedRows.has(
                                                    participant.id
                                                )}
                                                className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
                                                onCheckedChange={() =>
                                                    onToggleRow?.(
                                                        participant.id
                                                    )
                                                }
                                            />
                                        </TableCell>

                                        {/* Name + Tags */}
                                        {!hiddenColumns.has("name") && (
                                        <TableCell className="table-cell-title">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <ChevronRight
                                                        className={cn(
                                                            "h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 stroke-[1.6]",
                                                            isExpanded && "rotate-90"
                                                        )}
                                                    />
                                                    <span>{participant.name}</span>
                                                    </div>
                                                    {participant.tags && participant.tags.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {participant.tags.map((tag) => (
                                                                <TagChip key={tag.id} tag={tag} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        )}

                                        {/* Actions */}
                                        <TableCell
                                            className="table-cell-actions"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <TableRowActionTrigger />
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onViewParticipant?.(participant)
                                                        }
                                                    >
                                                        <Eye className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() =>
                                                            onAddSpeakingAssignment?.(participant)
                                                        }
                                                    >
                                                        <Speech className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        Add Speaking Assignment
                                                    </DropdownMenuItem>
                                                    {onDelete && (
                                                        <>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() =>
                                                                    setDeleteTarget(participant)
                                                                }
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>

                                    {/* Expanded row */}
                                    {isExpanded && (
                                        <TableRow
                                            key={`${participant.id}-expanded`}
                                            className="hover:bg-transparent"
                                        >
                                            <TableCell
                                                colSpan={visibleColumns}
                                                className="px-3 py-0"
                                            >
                                                <div className="pl-12 pr-4 py-4 border-b">
                                                    {isLoading ? (
                                                        <div className="flex items-center gap-2 py-2">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                                            <span className="text-xs text-muted-foreground">
                                                                Loading assignments...
                                                            </span>
                                                        </div>
                                                    ) : !cached || (cached.history.length === 0 && cached.speaking.length === 0) ? (
                                                        <p className="text-xs text-muted-foreground italic py-1">
                                                            No assignment history found.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-4">
                                                            {/* Meeting assignments (prayer, procedural, etc.) */}
                                                            {cached.history.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                                                        Meeting Assignments
                                                                    </p>
                                                                    <div className="space-y-2">
                                                                        {cached.history.map((item) => (
                                                                            <div key={item.id} className="space-y-0.5">
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <div className="min-w-0">
                                                                                        <span className="text-xs font-medium leading-snug">
                                                                                            {item.title}
                                                                                        </span>
                                                                                        {item.item_type === "speaker" && item.speaker_topic && (
                                                                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                                                                {item.speaker_topic}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5 bg-muted px-1.5 py-0.5 rounded">
                                                                                        {ITEM_TYPE_LABELS[item.item_type] ?? item.item_type}
                                                                                    </span>
                                                                                </div>
                                                                                {item.meeting && (
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Calendar className="h-3 w-3 text-muted-foreground/60 shrink-0 stroke-[1.6]" />
                                                                                        <span className="text-[11px] text-muted-foreground">
                                                                                            {format(new Date(item.meeting.scheduled_date), "MMM d, yyyy")}
                                                                                        </span>
                                                                                        <span className="text-muted-foreground/40 text-[11px]">·</span>
                                                                                        <span className="text-[11px] text-muted-foreground truncate">
                                                                                            {item.meeting.title}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Speaking assignments */}
                                                            {cached.speaking.length > 0 && (
                                                                <div className="space-y-2">
                                                                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                                                        Speaking Assignments
                                                                    </p>
                                                                    <div className="space-y-2">
                                                                        {cached.speaking.map((item) => (
                                                                            <div key={item.id} className="space-y-0.5">
                                                                                <div className="flex items-start justify-between gap-3">
                                                                                    <div className="min-w-0">
                                                                                        <span className="text-xs font-medium leading-snug">
                                                                                            Speaker
                                                                                        </span>
                                                                                        {item.topic && (
                                                                                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                                                                {item.topic}
                                                                                            </p>
                                                                                        )}
                                                                                    </div>
                                                                                    <span
                                                                                        className={cn(
                                                                                            "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-semibold shrink-0",
                                                                                            item.is_confirmed
                                                                                                ? "bg-emerald-50 text-emerald-700"
                                                                                                : "bg-gray-100 text-gray-600"
                                                                                        )}
                                                                                    >
                                                                                        {item.is_confirmed ? "Confirmed" : "Pending"}
                                                                                    </span>
                                                                                </div>
                                                                                {item.meeting && (
                                                                                    <div className="flex items-center gap-1.5">
                                                                                        <Calendar className="h-3 w-3 text-muted-foreground/60 shrink-0 stroke-[1.6]" />
                                                                                        <span className="text-[11px] text-muted-foreground">
                                                                                            {format(new Date(item.meeting.scheduled_date), "MMM d, yyyy")}
                                                                                        </span>
                                                                                        <span className="text-muted-foreground/40 text-[11px]">·</span>
                                                                                        <span className="text-[11px] text-muted-foreground truncate">
                                                                                            {item.meeting.title}
                                                                                        </span>
                                                                                    </div>
                                                                                )}
                                                                                {!item.meeting && (
                                                                                    <p className="text-[11px] text-muted-foreground/60 italic">
                                                                                        Not assigned to a meeting
                                                                                    </p>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </Fragment>
                            )
                        })
                    )}
                </TableBody>
            </Table>
            </StandardTableShell>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Participant</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {deleteTarget?.name}&quot;? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

// Backward-compatible alias while remaining imports are migrated.
export { DirectoryTable as ParticipantsTable }
