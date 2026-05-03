"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, Columns3, Plus, SlidersHorizontal, Table2, X } from "lucide-react"
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
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
import { toast } from "@/lib/toast"
import { deleteTable } from "@/lib/actions/table-actions"
import { TablesListTable, TableWithCount } from "@/components/tables/tables-list-table"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"
import {
    StandardPopoverMenu,
    StandardPopoverMenuContent,
    StandardPopoverMenuItem,
    StandardPopoverMenuSub,
    StandardPopoverMenuSubContent,
    StandardPopoverMenuSubTrigger,
    StandardPopoverMenuTrigger,
} from "@/components/ui/standard-popover-menu"
import { ToolbarIconButton } from "@/components/ui/toolbar-icon-button"

interface TablesClientProps {
    tables: TableWithCount[]
}

export function TablesClient({ tables }: TablesClientProps) {
    const router = useRouter()
    const [mounted, setMounted] = useState(false)

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
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)
    const [descriptionFilter, setDescriptionFilter] = useState<"all" | "with_description" | "without_description">("all")

    useEffect(() => {
        setMounted(true)
    }, [])

    // ── Derived data ─────────────────────────────────────────────────────────

    const filteredTables = useMemo(() => {
        let result = tables

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (t) =>
                    t.name.toLowerCase().includes(q) ||
                    t.description?.toLowerCase().includes(q)
            )
        }

        if (descriptionFilter !== "all") {
            result = result.filter((table) =>
                descriptionFilter === "with_description"
                    ? Boolean(table.description?.trim())
                    : !table.description?.trim()
            )
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const aValue: any = a[key as keyof TableWithCount]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const bValue: any = b[key as keyof TableWithCount]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [tables, search, descriptionFilter, sortConfig])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
        setSortConfig((current) => {
            if (current?.key === key && current.direction === direction) return null
            return { key, direction }
        })
    }, [])

    const handleToggleColumnVisibility = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            const visibleCount = ["name", "row_count", "created_at"].filter(
                (c) => !next.has(c)
            ).length
            const isVisible = !next.has(column)
            if (isVisible && visibleCount <= 1) return prev
            if (isVisible) next.add(column)
            else next.delete(column)
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
            if (prev.size === filteredTables.length) return new Set()
            return new Set(filteredTables.map((t) => t.id))
        })
    }, [filteredTables])

    const handleDelete = async (id: string) => {
        const result = await deleteTable(id)
        if (result.error) {
            toast.error(result.error || "Failed to delete table.")
        } else {
            toast.success("Table deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const ids = Array.from(selectedRows)
        let failed = 0
        for (const id of ids) {
            const result = await deleteTable(id)
            if (result.error) failed++
        }
        if (failed > 0) {
            toast.error(`Failed to delete ${failed} table${failed > 1 ? "s" : ""}.`)
        } else {
            toast.success(`${ids.length} table${ids.length > 1 ? "s" : ""} deleted.`)
        }
        setSelectedRows(new Set())
        router.refresh()
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    // ── Active filters ────────────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 || hiddenColumns.size > 0 || descriptionFilter !== "all"

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[{ label: "Tables", icon: <Table2 className="h-3.5 w-3.5" /> }]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
                action={
                    <div className="hidden items-center gap-1 sm:flex">
                        <TopbarSearchAction
                            value={search}
                            onChange={setSearch}
                            placeholder="Search tables..."
                            items={filteredTables.slice(0, 8).map((table) => ({
                                id: table.id,
                                label: table.name,
                                actionLabel: "Open",
                            }))}
                            onSelect={(tableId) => router.push(`/tables/${tableId}`)}
                            emptyText="No matching tables."
                        />
                        <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                            <Link href="/tables/new" className="flex items-center gap-1">
                                <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                                New table
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="flex items-center justify-between w-full px-6 pt-3.5 pb-3.5 shrink-0 flex-wrap gap-3 border-b border-border/45">
                <div className="flex items-center gap-2 flex-wrap min-h-8">
                    <StandardPopoverMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton title="Filters" aria-label="Open filters">
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                            </ToolbarIconButton>
                        </StandardPopoverMenuTrigger>
                        <StandardPopoverMenuContent align="start" className="w-56">
                            <StandardPopoverMenuSub>
                                <StandardPopoverMenuSubTrigger active={descriptionFilter !== "all"}>
                                    Description
                                </StandardPopoverMenuSubTrigger>
                                <StandardPopoverMenuSubContent>
                                    {[
                                        { value: "with_description", label: "With description" },
                                        { value: "without_description", label: "Without description" },
                                    ].map((opt) => (
                                        <StandardPopoverMenuItem
                                            key={opt.value}
                                            active={descriptionFilter === opt.value}
                                            onSelect={() => setDescriptionFilter(opt.value as "with_description" | "without_description")}
                                        >
                                            {opt.label}
                                        </StandardPopoverMenuItem>
                                    ))}
                                </StandardPopoverMenuSubContent>
                            </StandardPopoverMenuSub>
                            {descriptionFilter !== "all" && (
                                <StandardPopoverMenuItem
                                    onSelect={() => setDescriptionFilter("all")}
                                    className="text-muted-foreground"
                                >
                                    Clear filters
                                </StandardPopoverMenuItem>
                            )}
                        </StandardPopoverMenuContent>
                    </StandardPopoverMenu>

                    <StandardPopoverMenu open={displayOptionsOpen} onOpenChange={setDisplayOptionsOpen}>
                        <StandardPopoverMenuTrigger asChild>
                            <ToolbarIconButton title="Display options" aria-label="Display options">
                                <Columns3 className="h-3.5 w-3.5" />
                            </ToolbarIconButton>
                        </StandardPopoverMenuTrigger>
                        <StandardPopoverMenuContent align="start" className="w-56">
                            {[
                                { key: "name", label: "Name" },
                                { key: "row_count", label: "Rows" },
                                { key: "created_at", label: "Created" },
                            ].map((column) => {
                                const visible = !hiddenColumns.has(column.key)
                                return (
                                    <StandardPopoverMenuItem
                                        key={column.key}
                                        onSelect={() => handleToggleColumnVisibility(column.key)}
                                        className="gap-2"
                                    >
                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                                            {visible ? <Check className="h-3 w-3" /> : null}
                                        </span>
                                        <span>{column.label}</span>
                                    </StandardPopoverMenuItem>
                                )
                            })}
                            {hiddenColumns.size > 0 && (
                                <>
                                    <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                                    <StandardPopoverMenuItem
                                        onSelect={() => setHiddenColumns(new Set())}
                                        className="text-muted-foreground"
                                    >
                                        Show all columns
                                    </StandardPopoverMenuItem>
                                </>
                            )}
                        </StandardPopoverMenuContent>
                    </StandardPopoverMenu>
                </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-xs font-medium text-slate-800 border border-border/50">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {hiddenColumns.size > 0 && (
                        <button
                            onClick={() => setHiddenColumns(new Set())}
                            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                        >
                            Show all columns
                        </button>
                    )}
                    {descriptionFilter !== "all" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--chip-bg))] border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
                            {descriptionFilter === "with_description" ? "With description" : "Without description"}
                            <button
                                onClick={() => setDescriptionFilter("all")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    <button
                        onClick={() => {
                            setSearch("")
                            setHiddenColumns(new Set())
                            setDescriptionFilter("all")
                        }}
                        className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--chip-hover-bg))] transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <TablesListTable
                    tables={filteredTables}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    hiddenColumns={hiddenColumns}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onDelete={handleDelete}
                />
            </div>

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} table{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected table
                            {selectedRows.size > 1 ? "s" : ""} and all their data. This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
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

            {mounted && selectedRows.size > 0 && createPortal(
                <div className="fixed bottom-6 left-1/2 z-[95] flex -translate-x-1/2 pointer-events-none w-[90vw] sm:w-auto justify-center">
                    <BulkSelectionBar
                        selectedCount={selectedRows.size}
                        onClear={() => setSelectedRows(new Set())}
                        onDelete={() => setShowBulkDeleteDialog(true)}
                        isDeleting={isBulkDeleting}
                    />
                </div>,
                document.body
            )}
        </div>
    )
}
