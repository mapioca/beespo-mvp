"use client"

import { useState } from "react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { MeetingRowActions } from "./meeting-row-actions"
import { MeetingShareBadge } from "./meeting-share-badge"
import { ShareDialog } from "@/components/conduct/share-dialog"
import { ZoomIcon } from "@/components/ui/zoom-icon"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Database } from "@/types/database"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import {
    StandardActionsHeadCell,
    StandardSelectAllHeadCell,
    StandardSelectableRow,
    StandardTableShell,
} from "@/components/ui/standard-data-table"

// ── Types ───────────────────────────────────────────────────────────────────

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"]

export type MeetingStatus = "draft" | "scheduled" | "in_progress" | "completed" | "cancelled"

export interface Template {
    id: string
    name: string
}

export interface Meeting extends MeetingRow {
    workspace_meeting_id?: string | null
    templates: { id: string; name: string } | null
    // Share metadata — populated by meetings-client for display purposes
    _shareType?: "owned" | "shared_with_me"
    _sharePermission?: "viewer" | "editor"
    _sharedByName?: string
    _sharedFromWorkspace?: string
    _isSharedOutward?: boolean
}

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    draft: "warning",
    scheduled: "info",
    in_progress: "success",
    completed: "neutral",
    cancelled: "danger",
}

// ── Props ───────────────────────────────────────────────────────────────────

interface MeetingsTableProps {
    meetings: Meeting[]
    workspaceSlug: string | null
    isLeader: boolean
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Column visibility
    hiddenColumns?: Set<string>
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function MeetingsTable({
    meetings,
    workspaceSlug,
    isLeader,
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
}: MeetingsTableProps) {
    const [shareDialogMeeting, setShareDialogMeeting] = useState<Meeting | null>(null)

    const allSelected =
        meetings.length > 0 && selectedRows.size === meetings.length

    const visibleColumns =
        ["title", "template", "status", "scheduled_date"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    return (
        <>
        <StandardTableShell>
        <Table
            containerClassName="overflow-visible"
            className="text-[length:var(--table-body-font-size)] [--table-row-py:0.5rem]"
        >
            <TableHeader className="sticky top-0 z-30">
                <TableRow className="table-header-row-standard !bg-transparent hover:!bg-transparent [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
                    <StandardSelectAllHeadCell
                        checked={allSelected}
                        onToggle={() => onToggleAllRows?.()}
                    />

                    {/* Title */}
                    {!hiddenColumns.has("title") && (
                        <SortableTableHeader
                            sortKey="title"
                            label="Title"
                            defaultDirection="asc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            className="sticky top-0 z-20 min-w-[250px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    {/* Template */}
                    {!hiddenColumns.has("template") && (
                        <SortableTableHeader
                            sortKey="template"
                            label="Template"
                            defaultDirection="asc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            className="sticky top-0 z-20 w-[200px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    {/* Status */}
                    {!hiddenColumns.has("status") && (
                        <SortableTableHeader
                            sortKey="status"
                            label="Status"
                            defaultDirection="asc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            className="sticky top-0 z-20 w-[148px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    {/* Scheduled Date */}
                    {!hiddenColumns.has("scheduled_date") && (
                        <SortableTableHeader
                            sortKey="scheduled_date"
                            label="Date"
                            defaultDirection="desc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            className="sticky top-0 z-20 w-[168px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    <StandardActionsHeadCell />
                </TableRow>
            </TableHeader>

            <TableBody>
                {meetings.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                        <TableCell
                            colSpan={visibleColumns}
                            className="h-32 text-center"
                        >
                            <div className="flex flex-col items-center justify-center py-4">
                                <CalendarDays className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                <p className="text-muted-foreground">
                                    No agendas found.
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    meetings.map((meeting) => (
                        <StandardSelectableRow
                            key={meeting.id}
                            id={meeting.id}
                            selected={selectedRows.has(meeting.id)}
                            onToggle={onToggleRow}
                            actions={
                                <MeetingRowActions
                                    meeting={meeting}
                                    workspaceSlug={workspaceSlug}
                                    isLeader={isLeader}
                                />
                            }
                        >
                            {/* Title */}
                            {!hiddenColumns.has("title") && (
                        <TableCell className="table-cell-title">
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href={`/meetings/${meeting.id}`}
                                    className="rounded-sm text-[length:var(--table-body-font-size)] font-semibold text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                >
                                    {meeting.title}
                                </Link>
                                        {meeting.is_publicly_shared && (
                                            <span className="inline-flex items-center gap-1 text-[length:var(--table-micro-font-size)] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Live
                                            </span>
                                        )}
                                        {meeting._shareType === "shared_with_me" && (
                                            <MeetingShareBadge
                                                type="shared_with_me"
                                                sharedBy={meeting._sharedByName}
                                                fromWorkspace={meeting._sharedFromWorkspace}
                                            />
                                        )}
                                        {meeting._isSharedOutward && meeting._shareType !== "shared_with_me" && (
                                            <MeetingShareBadge
                                                type="shared_outward"
                                                onClick={() => setShareDialogMeeting(meeting)}
                                            />
                                        )}
                                        {meeting.zoom_meeting_id && (
                                            <ZoomIcon className="h-4 w-4 shrink-0" />
                                        )}
                                    </div>
                                </TableCell>
                            )}

                            {/* Template */}
                            {!hiddenColumns.has("template") && (
                        <TableCell className="table-cell-meta text-[length:var(--table-meta-font-size)] text-foreground/58">
                            {meeting.templates?.name || (
                                <span className="italic">
                                    No Template
                                </span>
                            )}
                        </TableCell>
                            )}

                            {/* Status */}
                            {!hiddenColumns.has("status") && (
                        <TableCell className="table-cell-meta !px-2 capitalize">
                            <StatusIndicator
                                label={formatLabel(meeting.status)}
                                tone={STATUS_TONES[meeting.status] || "neutral"}
                                className="text-[length:var(--table-meta-font-size)] text-foreground/64"
                            />
                        </TableCell>
                            )}

                            {/* Scheduled Date */}
                            {!hiddenColumns.has("scheduled_date") && (
                        <TableCell className="table-cell-meta !px-2 text-[length:var(--table-meta-font-size)] text-foreground/58">
                            {meeting.scheduled_date
                                ? format(
                                      new Date(meeting.scheduled_date),
                                              "MMM d, yyyy h:mm a"
                                          )
                                        : "—"}
                                </TableCell>
                            )}
                        </StandardSelectableRow>
                    ))
                )}
            </TableBody>
        </Table>
        </StandardTableShell>

        {/* Share dialog — opened by clicking the shared_outward badge */}
        {shareDialogMeeting && (
            <ShareDialog
                meeting={shareDialogMeeting}
                workspaceSlug={workspaceSlug}
                open={true}
                onOpenChange={(open) => { if (!open) setShareDialogMeeting(null) }}
                hideTrigger
                defaultTab="invite"
            />
        )}
        </>
    )
}
