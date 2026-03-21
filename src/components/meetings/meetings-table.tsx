"use client"

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
import { CalendarDays } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import { MeetingRowActions } from "./meeting-row-actions"
import { Database } from "@/types/database"

// ── Types ───────────────────────────────────────────────────────────────────

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"]

export type MeetingStatus = "scheduled" | "in_progress" | "completed" | "cancelled"

export interface Template {
    id: string
    name: string
}

export interface Meeting extends MeetingRow {
    workspace_meeting_id?: string | null
    templates: { id: string; name: string } | null
}

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "scheduled", label: "Scheduled" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
]

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function getStatusStyle(status: string): string {
    switch (status) {
        case "scheduled":
            return "bg-blue-50 text-blue-700"
        case "in_progress":
            return "bg-amber-50 text-amber-700"
        case "completed":
            return "bg-emerald-50 text-emerald-700"
        case "cancelled":
            return "bg-gray-100 text-gray-600"
        default:
            return "bg-gray-100 text-gray-600"
    }
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
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                    {/* Checkbox */}
                    <TableHead className="w-10 px-3">
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
                            searchable
                            searchValue={searchValue}
                            onSearchChange={onSearchChange}
                            searchPlaceholder="Search agendas..."
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
                            className="w-[160px]"
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
                            className="w-[180px]"
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
                            <div className="flex flex-col items-center justify-center py-4">
                                <CalendarDays className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-muted-foreground">
                                    No agendas found.
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    meetings.map((meeting) => (
                        <TableRow key={meeting.id} className="group">
                            {/* Checkbox */}
                            <TableCell className="px-3">
                                <Checkbox
                                    checked={selectedRows.has(meeting.id)}
                                    onCheckedChange={() =>
                                        onToggleRow?.(meeting.id)
                                    }
                                />
                            </TableCell>

                            {/* Title */}
                            {!hiddenColumns.has("title") && (
                                <TableCell className="font-medium px-3">
                                    <Link
                                        href={`/meetings/${meeting.id}`}
                                        className="hover:underline"
                                    >
                                        {meeting.title}
                                    </Link>
                                </TableCell>
                            )}

                            {/* Template */}
                            {!hiddenColumns.has("template") && (
                                <TableCell className="px-3 text-sm text-muted-foreground">
                                    {meeting.templates?.name || (
                                        <span className="italic">
                                            No Template
                                        </span>
                                    )}
                                </TableCell>
                            )}

                            {/* Status */}
                            {!hiddenColumns.has("status") && (
                                <TableCell className="px-3">
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wide font-semibold",
                                            getStatusStyle(meeting.status)
                                        )}
                                    >
                                        {formatLabel(meeting.status)}
                                    </span>
                                </TableCell>
                            )}

                            {/* Scheduled Date */}
                            {!hiddenColumns.has("scheduled_date") && (
                                <TableCell className="px-3 text-muted-foreground">
                                    {meeting.scheduled_date
                                        ? format(
                                              new Date(meeting.scheduled_date),
                                              "MMM d, yyyy h:mm a"
                                          )
                                        : "—"}
                                </TableCell>
                            )}

                            {/* Actions */}
                            <TableCell className="px-3 text-right">
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
    )
}
