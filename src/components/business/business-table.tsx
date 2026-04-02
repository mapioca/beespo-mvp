"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
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
import { MoreHorizontal, Eye, Trash2, Briefcase } from "lucide-react"
import { format } from "date-fns"
import { DataTableColumnHeader } from "@/components/ui/data-table-header"
import type { BusinessItemDetails } from "@/lib/business-script-generator"

// ── Types ───────────────────────────────────────────────────────────────────

export type BusinessStatus = "pending" | "completed"
export type BusinessCategory =
    | "sustaining"
    | "release"
    | "confirmation"
    | "ordination"
    | "setting_apart"
    | "other"

export interface BusinessItem {
    id: string
    person_name: string
    position_calling?: string | null
    category: string
    status: string
    action_date?: string | null
    notes?: string | null
    details?: BusinessItemDetails | null
    workspace_business_id?: string | null
    created_at: string
    created_by?: string | null
    creator?: { full_name?: string | null } | null
}

// ── Filter option data ──────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending" },
    { value: "completed", label: "Completed" },
]

const CATEGORY_OPTIONS = [
    { value: "sustaining", label: "Sustaining" },
    { value: "release", label: "Release" },
    { value: "confirmation", label: "Confirmation" },
    { value: "ordination", label: "Ordination" },
    { value: "setting_apart", label: "Setting Apart" },
    { value: "other", label: "Other" },
]

// ── Badge helpers ───────────────────────────────────────────────────────────

function formatCategory(category: string): string {
    return category.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

// ── Props ───────────────────────────────────────────────────────────────────

interface BusinessTableProps {
    items: BusinessItem[]
    // Sort
    sortConfig?: { key: string; direction: "asc" | "desc" } | null
    onSort?: (key: string, direction: "asc" | "desc") => void
    // Search (applied from Person Name header)
    searchValue?: string
    onSearchChange?: (value: string) => void
    // Status filter
    selectedStatuses?: BusinessStatus[]
    statusCounts?: Record<string, number>
    onStatusToggle?: (status: string) => void
    // Category filter
    selectedCategories?: BusinessCategory[]
    categoryCounts?: Record<string, number>
    onCategoryToggle?: (category: string) => void
    // Column visibility
    hiddenColumns?: Set<string>
    onHideColumn?: (column: string) => void
    // Row selection
    selectedRows?: Set<string>
    onToggleRow?: (id: string) => void
    onToggleAllRows?: () => void
    // Actions
    onViewItem?: (item: BusinessItem) => void
    onDeleteItem?: (id: string) => Promise<void>
}

// ── Component ───────────────────────────────────────────────────────────────

export function BusinessTable({
    items,
    sortConfig,
    onSort,
    searchValue,
    onSearchChange,
    selectedStatuses = [],
    statusCounts,
    onStatusToggle,
    selectedCategories = [],
    categoryCounts,
    onCategoryToggle,
    hiddenColumns = new Set(),
    onHideColumn,
    selectedRows = new Set(),
    onToggleRow,
    onToggleAllRows,
    onViewItem,
    onDeleteItem,
}: BusinessTableProps) {
    const [deleteTarget, setDeleteTarget] = useState<BusinessItem | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!deleteTarget || !onDeleteItem) return
        setIsDeleting(true)
        await onDeleteItem(deleteTarget.id)
        setIsDeleting(false)
        setDeleteTarget(null)
    }

    const allSelected =
        items.length > 0 && selectedRows.size === items.length

    // Count visible columns for empty state colspan
    const visibleColumns =
        ["person_name", "position_calling", "category", "status", "action_date"]
            .filter((c) => !hiddenColumns.has(c)).length + 2 // +2 for checkbox + actions

    return (
        <>
            <div className="rounded-xl border-y border-border/60 bg-background/80 shadow-[0_1px_0_rgba(15,23,42,0.04)] overflow-hidden">
            <Table className="text-[13px]">
                <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/60">
                        {/* Checkbox */}
                        <TableHead className="w-10 px-3 py-2.5">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={() => onToggleAllRows?.()}
                            />
                        </TableHead>

                        {/* Person Name */}
                        {!hiddenColumns.has("person_name") && (
                            <DataTableColumnHeader
                                label="Person Name"
                                sortActive={
                                    sortConfig?.key === "person_name"
                                }
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() =>
                                    onSort?.("person_name", "asc")
                                }
                                onSortDesc={() =>
                                    onSort?.("person_name", "desc")
                                }
                                searchable
                                searchValue={searchValue}
                                onSearchChange={onSearchChange}
                                searchPlaceholder="Search names..."
                                onHide={() => onHideColumn?.("person_name")}
                                className="min-w-[200px]"
                            />
                        )}

                        {/* Position/Calling */}
                        {!hiddenColumns.has("position_calling") && (
                            <DataTableColumnHeader
                                label="Position / Calling"
                                sortActive={
                                    sortConfig?.key === "position_calling"
                                }
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() =>
                                    onSort?.("position_calling", "asc")
                                }
                                onSortDesc={() =>
                                    onSort?.("position_calling", "desc")
                                }
                                onHide={() =>
                                    onHideColumn?.("position_calling")
                                }
                            />
                        )}

                        {/* Category */}
                        {!hiddenColumns.has("category") && (
                            <DataTableColumnHeader
                                label="Category"
                                sortActive={sortConfig?.key === "category"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() =>
                                    onSort?.("category", "asc")
                                }
                                onSortDesc={() =>
                                    onSort?.("category", "desc")
                                }
                                filterOptions={CATEGORY_OPTIONS.map((opt) => ({
                                    ...opt,
                                    count: categoryCounts?.[opt.value] || 0,
                                }))}
                                selectedFilters={selectedCategories}
                                onFilterToggle={onCategoryToggle}
                                onHide={() => onHideColumn?.("category")}
                                className="w-[140px]"
                            />
                        )}

                        {/* Status */}
                        {!hiddenColumns.has("status") && (
                            <DataTableColumnHeader
                                label="Status"
                                sortActive={sortConfig?.key === "status"}
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() =>
                                    onSort?.("status", "asc")
                                }
                                onSortDesc={() =>
                                    onSort?.("status", "desc")
                                }
                                filterOptions={STATUS_OPTIONS.map((opt) => ({
                                    ...opt,
                                    count: statusCounts?.[opt.value] || 0,
                                }))}
                                selectedFilters={selectedStatuses}
                                onFilterToggle={onStatusToggle}
                                onHide={() => onHideColumn?.("status")}
                                className="w-[120px]"
                            />
                        )}

                        {/* Action Date */}
                        {!hiddenColumns.has("action_date") && (
                            <DataTableColumnHeader
                                label="Action Date"
                                sortActive={
                                    sortConfig?.key === "action_date"
                                }
                                sortDirection={sortConfig?.direction}
                                onSortAsc={() =>
                                    onSort?.("action_date", "asc")
                                }
                                onSortDesc={() =>
                                    onSort?.("action_date", "desc")
                                }
                                onHide={() => onHideColumn?.("action_date")}
                                className="w-[130px]"
                            />
                        )}

                        {/* Actions (screen-reader only label) */}
                        <TableHead className="w-[52px]">
                            <span className="sr-only">Actions</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {items.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={visibleColumns}
                                className="h-32 text-center"
                            >
                                <div className="flex flex-col items-center justify-center py-4">
                                    <Briefcase className="h-8 w-8 text-muted-foreground mb-2 stroke-[1.6]" />
                                    <p className="text-muted-foreground">
                                        No business items found.
                                    </p>
                                </div>
                            </TableCell>
                        </TableRow>
                    ) : (
                        items.map((item) => (
                            <TableRow
                                key={item.id}
                                className="group transition-colors hover:bg-[hsl(var(--table-row-hover))]"
                            >
                                {/* Checkbox */}
                                <TableCell className="px-3 py-3">
                                    <Checkbox
                                        checked={selectedRows.has(item.id)}
                                        onCheckedChange={() =>
                                            onToggleRow?.(item.id)
                                        }
                                    />
                                </TableCell>

                                {/* Person Name */}
                                {!hiddenColumns.has("person_name") && (
                                    <TableCell className="font-medium px-3 py-3 text-[13px]">
                                        <button
                                            onClick={() =>
                                                onViewItem?.(item)
                                            }
                                            className="hover:underline text-left"
                                        >
                                            {item.person_name}
                                        </button>
                                    </TableCell>
                                )}

                                {/* Position/Calling */}
                                {!hiddenColumns.has("position_calling") && (
                                    <TableCell className="px-3 py-3 text-[12px] text-muted-foreground">
                                        {item.position_calling || "—"}
                                    </TableCell>
                                )}

                                {/* Category */}
                                {!hiddenColumns.has("category") && (
                                    <TableCell className="px-3 py-3 text-[12px] text-muted-foreground capitalize">
                                        {formatCategory(item.category)}
                                    </TableCell>
                                )}

                                {/* Status */}
                                {!hiddenColumns.has("status") && (
                                    <TableCell className="px-3 py-3 text-[12px] text-muted-foreground capitalize">
                                        {item.status === "pending"
                                            ? "Pending"
                                            : "Completed"}
                                    </TableCell>
                                )}

                                {/* Action Date */}
                                {!hiddenColumns.has("action_date") && (
                                    <TableCell className="px-3 py-3 text-[12px] text-muted-foreground">
                                        {item.action_date
                                            ? format(
                                                  new Date(item.action_date),
                                                  "MMM d, yyyy"
                                              )
                                            : "—"}
                                    </TableCell>
                                )}

                                {/* Actions */}
                                <TableCell className="px-3 py-3 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="h-4 w-4 stroke-[1.6]" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    onViewItem?.(item)
                                                }
                                            >
                                                <Eye className="mr-2 h-4 w-4 stroke-[1.6]" />
                                                View
                                            </DropdownMenuItem>
                                            {onDeleteItem && (
                                                <>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() =>
                                                            setDeleteTarget(
                                                                item
                                                            )
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
                        ))
                    )}
                </TableBody>
            </Table>
            </div>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={(open) => !open && setDeleteTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete Business Item
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {deleteTarget?.person_name}&quot;? This action
                            cannot be undone.
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
