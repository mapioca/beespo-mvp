"use client"

import { useState } from "react"
import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import { MeetingRowActions } from "./meeting-row-actions"
import { MeetingShareBadge } from "./meeting-share-badge"
import { ShareDialog } from "@/components/conduct/share-dialog"
import { ZoomIcon } from "@/components/ui/zoom-icon"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { Database } from "@/types/database"

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

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "draft", label: "Draft" },
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
]

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
    templates: Template[]
    workspaceSlug: string | null
    isLeader: boolean
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search (applied from Title header)
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: MeetingStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Template filter
    selectedTemplates?: string[]
    templateCounts?: Record<string, number>
    onTemplateToggle?: (templateId: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
}

// ── Component ───────────────────────────────────────────────────────────────

export function MeetingsTable({
    meetings,
    templates,
    workspaceSlug,
    isLeader,
    sortConfig,
    onSort,
    searchValue,
    onSearchChange,
    selectedStatuses = [],
    statusCounts,
    onStatusToggle,
    selectedTemplates = [],
    templateCounts,
    onTemplateToggle,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
}: MeetingsTableProps) {
    const [shareDialogMeeting, setShareDialogMeeting] = useState<Meeting | null>(null)

    const allSelected =
        meetings.length > 0 && selectedRows.size === meetings.length

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

    const visibleColumns =
        ["title", "template", "status", "scheduled_date"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    return (
        <>
        <Card shadow="none" size="compact" className="overflow-hidden border-0 p-0">
        <Table className="text-sm">
            <TableHeader>
                <TableRow>
                    {/* Checkbox */}
                    <TableHead className="w-10 px-3 py-2">
                        <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => onToggleAllRows?.()}
                        />
                    </TableHead>

                    {/* Title */}
                    {!hiddenColumns.has("title") && (
                        <DataTableColumnHeader
                            label="Title"
                            sortActive={sortConfig?.key === "title"}
                            sortDirection={sortConfig?.direction}
                            onSortAsc={() => onSort?.("title", "asc")}
                            onSortDesc={() => onSort?.("title", "desc")}
                            onHide={() => onHideColumn?.("title")}
                            className="min-w-[250px]"
                        />
                    )}

                    {/* Template */}
                    {!hiddenColumns.has("template") && (
                        <DataTableColumnHeader
                            label="Template"
                            sortActive={sortConfig?.key === "template"}
                            sortDirection={sortConfig?.direction}
                            onSortAsc={() => onSort?.("template", "asc")}
                            onSortDesc={() => onSort?.("template", "desc")}
                            filterOptions={templateFilterOptions}
                            selectedFilters={selectedTemplates}
                            onFilterToggle={onTemplateToggle}
                            onHide={() => onHideColumn?.("template")}
                            className="w-[200px]"
                        />
                    )}

                    {/* Status */}
                    {!hiddenColumns.has("status") && (
                        <DataTableColumnHeader
                            label="Status"
                            sortActive={sortConfig?.key === "status"}
                            sortDirection={sortConfig?.direction}
                            onSortAsc={() => onSort?.("status", "asc")}
                            onSortDesc={() => onSort?.("status", "desc")}
                            filterOptions={STATUS_OPTIONS.map((opt) => ({
                                ...opt,
                                count: statusCounts?.[opt.value] || 0,
                            }))}
                            selectedFilters={selectedStatuses}
                            onFilterToggle={onStatusToggle}
                            onHide={() => onHideColumn?.("status")}
                            className="w-[148px]"
                        />
                    )}

                    {/* Scheduled Date */}
                    {!hiddenColumns.has("scheduled_date") && (
                        <DataTableColumnHeader
                            label="Scheduled Date"
                            sortActive={sortConfig?.key === "scheduled_date"}
                            sortDirection={sortConfig?.direction}
                            onSortAsc={() => onSort?.("scheduled_date", "asc")}
                            onSortDesc={() => onSort?.("scheduled_date", "desc")}
                            onHide={() => onHideColumn?.("scheduled_date")}
                            className="w-[168px]"
                        />
                    )}

                    {/* Actions */}
                    <TableHead className="w-[52px]">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                </TableRow>
            </TableHeader>

            <TableBody>
                {meetings.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                        <TableCell
                            colSpan={visibleColumns}
                            className="h-32 text-center"
                        >
                            <div className="py-4">
                                <EmptyState
                                    title="No agendas found"
                                    description="Create your first agenda to get started."
                                    icon={<CalendarDays className="h-6 w-6" />}
                                />
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    meetings.map((meeting) => (
                        <TableRow
                            key={meeting.id}
                            data-state={selectedRows.has(meeting.id) ? "selected" : undefined}
                            className="group"
                        >
                            {/* Checkbox */}
                            <TableCell className="px-3 py-2.5">
                                <Checkbox
                                    checked={selectedRows.has(meeting.id)}
                                    className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
                                    onCheckedChange={() =>
                                        onToggleRow?.(meeting.id)
                                    }
                                />
                            </TableCell>

                            {/* Title */}
                            {!hiddenColumns.has("title") && (
                        <TableCell className="font-medium text-gray-900">
                            <div className="flex items-center gap-1.5">
                                <Link
                                    href={`/meetings/${meeting.id}`}
                                    className="text-sm font-semibold text-gray-900 transition-colors hover:text-gray-700 hover:underline underline-offset-2"
                                >
                                    {meeting.title}
                                </Link>
                                        {meeting.is_publicly_shared && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
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
                        <TableCell className="text-sm text-gray-500">
                            {meeting.templates?.name || (
                                <span className="italic">
                                    No Template
                                </span>
                            )}
                        </TableCell>
                            )}

                            {/* Status */}
                            {!hiddenColumns.has("status") && (
                        <TableCell className="capitalize">
                            <StatusIndicator
                                label={formatLabel(meeting.status)}
                                tone={STATUS_TONES[meeting.status] || "neutral"}
                                className="text-sm text-gray-600"
                            />
                        </TableCell>
                            )}

                            {/* Scheduled Date */}
                            {!hiddenColumns.has("scheduled_date") && (
                        <TableCell className="text-sm text-gray-500">
                            {meeting.scheduled_date
                                ? format(
                                      new Date(meeting.scheduled_date),
                                              "MMM d, yyyy h:mm a"
                                          )
                                        : "—"}
                                </TableCell>
                            )}

                            {/* Actions */}
                            <TableCell>
                                <MeetingRowActions
                                    meeting={meeting}
                                    workspaceSlug={workspaceSlug}
                                    isLeader={isLeader}
                                />
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
        </Card>

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
