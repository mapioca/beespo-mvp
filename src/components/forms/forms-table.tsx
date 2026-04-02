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
import { FileText, BarChart2, ExternalLink, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import { useState } from "react"
import type { Form } from "@/types/form-types"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { StatusIndicator } from "@/components/ui/status-indicator"

// ── Types ────────────────────────────────────────────────────────────────────

export type FormStatus = "published" | "draft"
export type FormWithCount = Form & { submissions_count: number }

// ── Filter option data ────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
]

const STATUS_TONES: Record<string, "neutral" | "info" | "success" | "warning" | "danger"> = {
    published: "success",
    draft: "neutral",
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface FormsTableProps {
    forms: FormWithCount[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: FormStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
    // Actions
    onDelete?: (id: string) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FormsTable({
    forms,
    sortConfig,
    onSort,
    searchValue,
    onSearchChange,
    selectedStatuses = [],
    statusCounts,
    onStatusToggle,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onDelete,
}: FormsTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<FormWithCount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected = forms.length > 0 && selectedRows.size === forms.length

    const visibleColumns =
        ["title", "status", "views", "responses", "created_at"].filter(
            (c) => !hiddenColumns.has(c)
        ).length + 2 // +2 for checkbox + actions

    return (
        <>
            <div className="table-shell-standard">
            <Table className="text-[13px]">
                <TableHeader>
                    <TableRow className="table-header-row-standard">
                        {/* Checkbox */}
                        <TableHead className="w-10 table-cell-check">
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
                                searchPlaceholder="Search forms..."
                                onHide={() => onHideColumn?.("title")}
                                className="min-w-[250px]"
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
                                className="w-[130px]"
                            />
                        )}

                        {/* Views */}
                        {!hiddenColumns.has("views") && (
                            <DataTableColumnHeader
                                label="Views"
                                sortActive={sortConfig?.key === "views_count"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("views_count", "asc")}
                                onSortDesc={() => onSort?.("views_count", "desc")}
                                onHide={() => onHideColumn?.("views")}
                                className="w-[100px]"
                            />
                        )}

                        {/* Responses */}
                        {!hiddenColumns.has("responses") && (
                            <DataTableColumnHeader
                                label="Responses"
                                sortActive={sortConfig?.key === "submissions_count"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("submissions_count", "asc")}
                                onSortDesc={() => onSort?.("submissions_count", "desc")}
                                onHide={() => onHideColumn?.("responses")}
                                className="w-[120px]"
                            />
                        )}

                        {/* Created */}
                        {!hiddenColumns.has("created_at") && (
                            <DataTableColumnHeader
                                label="Created"
                                sortActive={sortConfig?.key === "created_at"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() => onSort?.("created_at", "asc")}
                                onSortDesc={() => onSort?.("created_at", "desc")}
                                onHide={() => onHideColumn?.("created_at")}
                                className="w-[140px]"
                            />
                        )}

                        {/* Actions */}
                        <TableHead className="w-[52px]">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {forms.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={visibleColumns} className="h-32 text-center">
                                <div className="flex flex-col items-center justify-center py-4">
                                    <FileText className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">No forms found.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        forms.map((form) => (
                                <TableRow
                                    key={form.id}
                                    data-state={selectedRows.has(form.id) ? "selected" : undefined}
                                    className="group transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[hsl(var(--table-row-hover))] hover:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.28)] data-[state=selected]:bg-[hsl(var(--table-row-selected))] data-[state=selected]:shadow-[inset_0_0_0_1px_hsl(var(--table-shell-border)/0.4)]"
                                >
                                    {/* Checkbox */}
                                    <TableCell className="table-cell-check">
                                        <Checkbox
                                            checked={selectedRows.has(form.id)}
                                            className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
                                            onCheckedChange={() => onToggleRow?.(form.id)}
                                        />
                                    </TableCell>

                                    {/* Title */}
                                    {!hiddenColumns.has("title") && (
                                        <TableCell className="table-cell-title">
                                            <div className="flex flex-col">
                                                <Link
                                                    href={`/forms/${form.id}`}
                                                    className="hover:underline"
                                                >
                                                    {form.title}
                                                </Link>
                                                {form.description && (
                                                    <span className="text-[12px] text-muted-foreground/80 line-clamp-2">
                                                        {form.description}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    )}

                                    {/* Status */}
                                    {!hiddenColumns.has("status") && (
                                        <TableCell className="table-cell-meta !px-2 capitalize">
                                            <StatusIndicator
                                                label={form.is_published ? "Published" : "Draft"}
                                                tone={form.is_published ? STATUS_TONES.published : STATUS_TONES.draft}
                                                className="text-[11.5px] text-foreground/66"
                                            />
                                        </TableCell>
                                    )}

                                    {/* Views */}
                                    {!hiddenColumns.has("views") && (
                                        <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 tabular-nums">
                                            {form.views_count}
                                        </TableCell>
                                    )}

                                    {/* Responses */}
                                    {!hiddenColumns.has("responses") && (
                                        <TableCell className="table-cell-meta text-[11.5px] text-foreground/56 tabular-nums">
                                            {form.submissions_count}
                                        </TableCell>
                                    )}

                                    {/* Created */}
                                    {!hiddenColumns.has("created_at") && (
                                        <TableCell className="table-cell-meta !px-2 text-[11.5px] text-foreground/56">
                                            {format(new Date(form.created_at), "MMM d, yyyy")}
                                        </TableCell>
                                    )}

                                    {/* Actions */}
                                    <TableCell className="table-cell-actions">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <TableRowActionTrigger />
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/forms/${form.id}`}>
                                                        <FileText className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        Edit
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link href={`/forms/${form.id}/results`}>
                                                        <BarChart2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                        View Results
                                                    </Link>
                                                </DropdownMenuItem>
                                                {form.is_published && (
                                                    <DropdownMenuItem asChild>
                                                        <Link href={`/f/${form.slug}`} target="_blank">
                                                            <ExternalLink className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                            Open Form
                                                        </Link>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={() => setDeleteTarget(form)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </div>

            {/* Delete confirmation */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Form</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{deleteTarget?.title}&quot;?
                            This will permanently delete the form and all its responses. This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
