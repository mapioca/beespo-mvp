"use client"

import React, { useState } from "react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Calendar, CalendarDays, CalendarClock, CalendarCheck2, CalendarCog } from "lucide-react"
import { format } from "date-fns"
import { MeetingRowActions } from "./meeting-row-actions"
import { ShareDialog } from "@/components/conduct/share-dialog"
import { Database } from "@/types/database"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import {
    StandardActionsHeadCell,
    StandardSelectAllHeadCell,
    StandardSelectableRow,
    StandardTableShell,
} from "@/components/ui/standard-data-table"
import {useRouter} from "next/navigation";

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

// ── Props ───────────────────────────────────────────────────────────────────

interface MeetingsTableProps {
    meetings: Meeting[]
    workspaceSlug: string | null
    isLeader: boolean
    workspace?: "agendas" | "programs"
    emptyText?: string
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
    workspace = "agendas",
    emptyText = "No plans found.",
    sortConfig,
    onSort,
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
}: MeetingsTableProps) {
    const router = useRouter()
    const [shareDialogMeeting, setShareDialogMeeting] = useState<Meeting | null>(null)
    const allSelected =
        meetings.length > 0 && selectedRows.size === meetings.length

    const visibleColumns =
        ["title", "template", "status", "scheduled_date", "scheduled_time"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    const getMeetingHref = (meeting: Meeting) => {
        if (meeting.plan_type === "program") {
            return `/meetings/program/${meeting.id}`
        }
        if (meeting.plan_type === "agenda") {
            return `/meetings/agenda/${meeting.id}`
        }
        return `/meetings/${meeting.id}`
    }

    return (
        <>
        <StandardTableShell>
        <Table
            containerClassName="overflow-visible"
            className="text-[length:var(--table-body-font-size)] [--table-row-py:0.5rem] [&_tr]:border-0"
        >
            <TableHeader className="sticky top-0 z-30 bg-white">
                <TableRow className="table-header-row-standard hover:!bg-transparent [&>th:first-child]:rounded-tl-md [&>th:last-child]:rounded-tr-md">
                    <StandardSelectAllHeadCell
                        checked={allSelected}
                        onToggle={() => onToggleAllRows?.()}
                        className="bg-white"
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
                            className="sticky top-0 z-20 w-[140px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    {/* Scheduled Time */}
                    {!hiddenColumns.has("scheduled_time") && (
                        <SortableTableHeader
                            sortKey="scheduled_date"
                            label="Time"
                            defaultDirection="desc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            className="sticky top-0 z-20 w-[100px] bg-[hsl(var(--table-header-bg)/0.98)] backdrop-blur-sm"
                        />
                    )}

                    <StandardActionsHeadCell className="bg-white" />
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
                                    {emptyText}
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
                            selectOnRowClick={false}
                            onRowClick={() => router.push(getMeetingHref(meeting))}
                            actions={
                                <MeetingRowActions
                                    meeting={meeting}
                                    workspaceSlug={workspaceSlug}
                                    isLeader={isLeader}
                                    workspace={workspace}
                                />
                            }
                        >
                            {/* Title */}
                            {!hiddenColumns.has("title") && (
                        <TableCell className="table-cell-title">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href={getMeetingHref(meeting)}
                                        className="rounded-sm text-[length:var(--table-body-font-size)] font-semibold text-foreground/90 hover:text-foreground hover:underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        {meeting.title}
                                    </Link>
                                </div>

                            </div>
                                </TableCell>
                            )}

                            {/* Template */}
                            {!hiddenColumns.has("template") && (
                        <TableCell className="table-cell-meta text-[length:var(--table-meta-font-size)] text-foreground/58">
                            {meeting.templates?.name}
                        </TableCell>
                            )}

                            {/* Status */}
                            {!hiddenColumns.has("status") && (
                        <TableCell className="table-cell-meta">
                            {(() => {
                                const statusIcons: Record<string, React.ElementType> = {
                                    draft: CalendarCog,
                                    scheduled: CalendarClock,
                                    in_progress: CalendarDays,
                                    completed: CalendarCheck2,
                                    cancelled: CalendarDays,
                                };
                                const Icon = statusIcons[meeting.status] ?? CalendarDays;
                                return (
                                    <span className="inline-flex items-center gap-1.5">
                                        <Icon className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                                        <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/66 capitalize">
                                            {formatLabel(meeting.status)}
                                        </span>
                                    </span>
                                );
                            })()}
                        </TableCell>
                            )}

                            {/* Scheduled Date */}
                            {!hiddenColumns.has("scheduled_date") && (
                        <TableCell className="table-cell-meta">
                            {meeting.scheduled_date ? (
                                <span className="inline-flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
                                    <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/66">
                                        {format(new Date(meeting.scheduled_date), "MMM d")}
                                    </span>
                                </span>
                            ) : null}
                                </TableCell>
                            )}

                            {/* Scheduled Time */}
                            {!hiddenColumns.has("scheduled_time") && (
                        <TableCell className="table-cell-meta">
                            {meeting.scheduled_date ? (
                                <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/66">
                                    {format(new Date(meeting.scheduled_date), "h:mm a")}
                                </span>
                            ) : null}
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
