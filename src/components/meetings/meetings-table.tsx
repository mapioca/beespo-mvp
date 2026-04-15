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
import { CalendarDays } from "lucide-react"
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
import {
    standardTableHeaderRowVariants,
    standardTableHeaderVariants,
    standardTableVariants,
} from "@/components/ui/table-standard"
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
        <StandardTableShell variant="app">
        <Table
            containerClassName="overflow-visible"
            className={standardTableVariants({
                density: "compact",
                dividers: "subtle",
            })}
        >
            <TableHeader className={standardTableHeaderVariants({ sticky: true, variant: "app" })}>
                <TableRow className={standardTableHeaderRowVariants({ variant: "app" })}>
                    <StandardSelectAllHeadCell
                        checked={allSelected}
                        onToggle={() => onToggleAllRows?.()}
                        variant="app"
                    />

                    {/* Title */}
                    {!hiddenColumns.has("title") && (
                        <SortableTableHeader
                            sortKey="title"
                            label="Title"
                            defaultDirection="asc"
                            sortConfig={sortConfig}
                            onSort={onSort}
                            variant="app"
                            className="min-w-[240px]"
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
                            variant="app"
                            className="w-[168px]"
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
                            variant="app"
                            className="w-[128px]"
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
                            variant="app"
                            className="w-[104px]"
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
                            variant="app"
                            className="w-[96px]"
                        />
                    )}

                    <StandardActionsHeadCell variant="app" />
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
                        <TableCell className="table-cell-title pr-4">
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-1.5">
                                    <Link
                                        href={getMeetingHref(meeting)}
                                        className="table-cell-link rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        {meeting.title}
                                    </Link>
                                </div>

                            </div>
                                </TableCell>
                            )}

                            {/* Template */}
                            {!hiddenColumns.has("template") && (
                        <TableCell className="table-cell-meta text-[length:var(--table-meta-font-size)] text-foreground/54">
                            {meeting.templates?.name}
                        </TableCell>
                            )}

                            {/* Status */}
                            {!hiddenColumns.has("status") && (
                        <TableCell className="table-cell-meta whitespace-nowrap">
                            <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/68 capitalize">
                                {formatLabel(meeting.status)}
                            </span>
                        </TableCell>
                            )}

                            {/* Scheduled Date */}
                            {!hiddenColumns.has("scheduled_date") && (
                        <TableCell className="table-cell-meta whitespace-nowrap tabular-nums">
                            {meeting.scheduled_date ? (
                                <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/64">
                                    {format(new Date(meeting.scheduled_date), "MMM d")}
                                </span>
                            ) : null}
                                </TableCell>
                            )}

                            {/* Scheduled Time */}
                            {!hiddenColumns.has("scheduled_time") && (
                        <TableCell className="table-cell-meta whitespace-nowrap tabular-nums">
                            {meeting.scheduled_date ? (
                                <span className="text-[length:var(--table-meta-font-size)] font-medium text-foreground/64">
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
