"use client"

import Link from "next/link"
import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
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
import { FileText, BarChart2, ExternalLink, Trash2, Star, StarOff } from "lucide-react"
import { format } from "date-fns"
import { useState } from "react"
import type { Form } from "@/types/form-types"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"
import { StatusIndicator } from "@/components/ui/status-indicator"
import { toggleFavorite } from "@/lib/actions/navigation-actions"
import { useNavigationStore } from "@/stores/navigation-store"
import { toast } from "@/lib/toast"
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

// ── Types ────────────────────────────────────────────────────────────────────

export type FormStatus = "published" | "draft"
export type FormWithCount = Form & { submissions_count: number }

// ── Filter option data ────────────────────────────────────────────────────────

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
    // Column visibility
    hiddenColumns?: Set<string>
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
    hiddenColumns = new Set(),
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onDelete,
}: FormsTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<FormWithCount | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const isFavorite = useNavigationStore((state) => state.isFavorite)
    const applyFavoriteToggle = useNavigationStore((state) => state.applyFavoriteToggle)

    const handleDelete = async () => {
        if (!deleteTarget || !onDelete) return
        setIsDeleting(true)
        await onDelete(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected = forms.length > 0 && selectedRows.size === forms.length

    const handleFavoriteToggle = async (form: FormWithCount) => {
        const navigationItem = {
            id: form.id,
            entityType: "form" as const,
            title: form.title,
            href: `/forms/${form.id}`,
            icon: "form" as const,
            parentTitle: null,
        }
        const currentlyFavorite = isFavorite("form", form.id)
        const nextFavorite = !currentlyFavorite

        applyFavoriteToggle(navigationItem, nextFavorite)

        const result = await toggleFavorite(navigationItem)
        if ("error" in result) {
            applyFavoriteToggle(navigationItem, currentlyFavorite)
            toast.error(result.error ?? "Unable to update favorite.")
            return
        }

        applyFavoriteToggle(result.item, result.favorited)
    }

    const visibleColumns =
        ["title", "status", "views", "responses", "created_at"].filter(
            (c) => !hiddenColumns.has(c)
        ).length + 2 // +2 for checkbox + actions

    return (
        <>
            <StandardTableShell variant="app" className="overflow-hidden">
            <Table className={standardTableVariants({ density: "compact", dividers: "subtle" })}>
                <TableHeader className={standardTableHeaderVariants({ sticky: true, variant: "app" })}>
                    <TableRow className={standardTableHeaderRowVariants({ variant: "app" })}>
                        {/* Checkbox */}
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
                                className="min-w-[250px]"
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
                                className="w-[130px]"
                            />
                        )}

                        {/* Views */}
                        {!hiddenColumns.has("views") && (
                            <SortableTableHeader
                                sortKey="views_count"
                                label="Views"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[100px]"
                            />
                        )}

                        {/* Responses */}
                        {!hiddenColumns.has("responses") && (
                            <SortableTableHeader
                                sortKey="submissions_count"
                                label="Responses"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[120px]"
                            />
                        )}

                        {/* Created */}
                        {!hiddenColumns.has("created_at") && (
                            <SortableTableHeader
                                sortKey="created_at"
                                label="Created"
                                defaultDirection="desc"
                                sortConfig={sortConfig}
                                onSort={onSort}
                                variant="app"
                                className="w-[140px]"
                            />
                        )}

                        {/* Actions */}
                        <StandardActionsHeadCell variant="app" />
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
                                <StandardSelectableRow
                                    key={form.id}
                                    id={form.id}
                                    selected={selectedRows.has(form.id)}
                                    onToggle={onToggleRow}
                                    className="focus-within:bg-transparent focus-within:shadow-none"
                                    actions={
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
                                                <DropdownMenuItem onClick={() => void handleFavoriteToggle(form)}>
                                                    {isFavorite("form", form.id) ? (
                                                        <StarOff className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                    ) : (
                                                        <Star className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                    )}
                                                    {isFavorite("form", form.id)
                                                        ? "Remove from favorites"
                                                        : "Add to favorites"}
                                                </DropdownMenuItem>
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
                                    }
                                >

                                    {/* Title */}
                                    {!hiddenColumns.has("title") && (
                                        <TableCell className="table-cell-title">
                                            <Link
                                                href={`/forms/${form.id}`}
                                                className="table-cell-link"
                                            >
                                                {form.title}
                                            </Link>
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

                                </StandardSelectableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            </StandardTableShell>

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
