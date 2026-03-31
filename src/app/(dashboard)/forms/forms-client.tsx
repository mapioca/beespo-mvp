"use client"

import { useState, useMemo, useCallback, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2, ClipboardList, Database } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { FormsTable, FormStatus, FormWithCount } from "@/components/forms/forms-table"
import { CreateViewDialog } from "@/components/common/create-view-dialog"
import {
    FormView,
    FormViewFilters,
    createFormView,
    deleteFormView,
    TableView,
} from "@/lib/table-views"
import { cn } from "@/lib/utils"

// ── Filter sections config ────────────────────────────────────────────────────

const FORM_FILTER_SECTIONS = [
    {
        sectionLabel: "Status",
        key: "statuses",
        optional: true,
        options: [
            { value: "published", label: "Published" },
            { value: "draft", label: "Draft" },
        ],
    },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface FormsClientProps {
    forms: FormWithCount[]
    statusCounts: Record<string, number>
    initialViews?: FormView[]
}

export function FormsClient({ forms, statusCounts, initialViews = [] }: FormsClientProps) {
    const router = useRouter()
    const [, startDeleteTransition] = useTransition()

    // ── Views state ──────────────────────────────────────────────────────────
    const [views, setViews] = useState<FormView[]>(initialViews)
    const [activeViewId, setActiveViewId] = useState<string | null>(null)
    const [deletingViewId, setDeletingViewId] = useState<string | null>(null)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<FormStatus[]>([])

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

    // ── Derived data ─────────────────────────────────────────────────────────

    const activeView = useMemo(
        () => views.find((v) => v.id === activeViewId) ?? null,
        [views, activeViewId]
    )

    const filteredForms = useMemo(() => {
        let result = forms

        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (f) =>
                    f.title.toLowerCase().includes(q) ||
                    f.description?.toLowerCase().includes(q)
            )
        }

        // Status filter — view overrides manual selection
        const effectiveStatuses =
            activeView?.filters.statuses && activeView.filters.statuses.length > 0
                ? activeView.filters.statuses
                : selectedStatuses
        if (effectiveStatuses.length > 0) {
            result = result.filter((f) => {
                const status = f.is_published ? "published" : "draft"
                return effectiveStatuses.includes(status as FormStatus)
            })
        }

        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof FormWithCount]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof FormWithCount]

                if (key === "status") {
                    aValue = a.is_published ? "published" : "draft"
                    bValue = b.is_published ? "published" : "draft"
                }

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1
                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [forms, search, selectedStatuses, activeView, sortConfig])

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
        setSortConfig((current) => {
            if (current?.key === key && current.direction === direction) return null
            return { key, direction }
        })
    }, [])

    const handleStatusToggle = useCallback((status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status as FormStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as FormStatus]
        )
    }, [])

    const handleHideColumn = useCallback((column: string) => {
        setHiddenColumns((prev) => {
            const next = new Set(prev)
            next.add(column)
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
            if (prev.size === filteredForms.length) return new Set()
            return new Set(filteredForms.map((f) => f.id))
        })
    }, [filteredForms])

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("forms") as any).delete().eq("id", id)
        if (error) {
            toast.error(error.message || "Failed to delete form.")
        } else {
            toast.success("Form deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("forms") as any).delete().in("id", ids)
        if (error) {
            toast.error(error.message || "Failed to delete forms.")
        } else {
            toast.success(`${ids.length} form${ids.length > 1 ? "s" : ""} deleted.`)
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    function handleViewCreated(view: TableView) {
        setViews((prev) => [...prev, view as FormView])
        setActiveViewId(view.id)
    }

    async function handleSaveView(name: string, filters: Record<string, string[]>) {
        return createFormView(name, filters as FormViewFilters)
    }

    function handleDeleteView(viewId: string) {
        setDeletingViewId(viewId)
    }

    async function confirmDeleteView() {
        if (!deletingViewId) return
        const id = deletingViewId
        setDeletingViewId(null)

        startDeleteTransition(async () => {
            const result = await deleteFormView(id)
            if (result.error) {
                toast.error(result.error)
                return
            }
            setViews((prev) => prev.filter((v) => v.id !== id))
            if (activeViewId === id) setActiveViewId(null)
            toast.success("View deleted")
        })
    }

    // ── Active filters ────────────────────────────────────────────────────────

    const hasActiveFilters =
        !activeView &&
        (search.length > 0 || selectedStatuses.length > 0 || hiddenColumns.size > 0)

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Data", icon: <Database className="h-4 w-4 stroke-[1.6]" /> },
                    { label: "Forms", icon: <ClipboardList className="h-4 w-4 stroke-[1.6]" /> },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
            />

            {/* Action Bar + View Tabs */}
            <div className="flex items-center justify-between w-full px-6 pt-4 pb-3 shrink-0 flex-wrap gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Custom view tabs */}
                    {views.map((view) => (
                        <span key={view.id} className="relative group/view inline-flex items-center">
                            <button
                                onClick={() => setActiveViewId(view.id)}
                                className={cn(
                                    "rounded-full border pl-3.5 pr-7 py-1 text-xs font-medium transition-all shadow-sm",
                                    activeViewId === view.id
                                        ? "bg-[hsl(var(--accent-warm))] text-foreground border-border/60"
                                        : "text-muted-foreground border-border/60 hover:text-foreground hover:bg-[hsl(var(--accent-warm)/0.5)] hover:border-border/60"
                                )}
                            >
                                {view.name}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteView(view.id)
                                }}
                                title="Delete view"
                                className={cn(
                                    "absolute right-2 top-1/2 -translate-y-1/2",
                                    "flex items-center justify-center h-3.5 w-3.5 rounded-full",
                                    "opacity-0 group-hover/view:opacity-100 transition-opacity",
                                    activeViewId === view.id
                                        ? "text-muted-foreground/70 hover:text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <X className="h-2.5 w-2.5 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}

                    {activeViewId && (
                        <button
                            onClick={() => setActiveViewId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                        >
                            Clear view
                        </button>
                    )}

                    <CreateViewDialog
                        filterSections={FORM_FILTER_SECTIONS}
                        onSave={handleSaveView}
                        onCreated={handleViewCreated}
                    />
                </div>

                <Button asChild variant="ghost" className="rounded-full border px-3.5 py-1 text-xs font-medium text-foreground border-border/60 bg-[hsl(var(--accent-warm))] hover:bg-[hsl(var(--accent-warm-hover))] transition-all shadow-[0_1px_0_rgba(15,23,42,0.08)]">
                    <Link href="/forms/new" className="flex items-center gap-1.5">
                        <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                        New
                    </Link>
                </Button>
            </div>

            {/* View filter summary bar */}
            {activeView && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>
                    {activeView.filters.statuses?.map((s) => (
                        <span key={s} className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800 capitalize">
                            {s}
                        </span>
                    ))}
                    {search && (
                        <span className="rounded-md bg-[hsl(var(--accent-warm))] border border-border/50 px-2 py-0.5 text-slate-800">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 inline stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                </div>
            )}

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="inline-flex items-center rounded-full bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-[11px] font-medium text-slate-800 border border-border/50 tabular-nums">
                        {selectedRows.size} selected
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setShowBulkDeleteDialog(true)}
                    >
                        <Trash2 className="mr-1.5 h-3 w-3 stroke-[1.6]" />
                        Delete
                    </Button>
                    <button
                        onClick={() => setSelectedRows(new Set())}
                        className="text-xs text-muted-foreground hover:text-foreground ml-auto"
                    >
                        Deselect all
                    </button>
                </div>
            )}

            {/* Active filter chips */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-xs font-medium text-slate-800 border border-border/50">
                            Search: &quot;{search}&quot;
                            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span key={s} className="inline-flex items-center gap-1.5 rounded-md bg-[hsl(var(--accent-warm))] px-2.5 py-1 text-xs font-medium text-slate-800 border border-border/50 capitalize">
                            {s}
                            <button onClick={() => handleStatusToggle(s)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-3 w-3 stroke-[1.6]" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button onClick={() => setHiddenColumns(new Set())} className="text-xs text-muted-foreground hover:text-foreground underline">
                            Show all columns
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSearch("")
                            setSelectedStatuses([])
                            setHiddenColumns(new Set())
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                <FormsTable
                    forms={filteredForms}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={activeView?.filters.statuses as FormStatus[] ?? selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={activeView ? undefined : handleStatusToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onDelete={handleDelete}
                />
            </div>

            {/* Bulk delete confirmation */}
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} form{selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected form{selectedRows.size > 1 ? "s" : ""} and all their responses. This action cannot be undone.
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

            {/* Delete view confirmation */}
            <AlertDialog open={!!deletingViewId} onOpenChange={(o) => { if (!o) setDeletingViewId(null) }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this view?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This view will be removed for everyone in your workspace. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingViewId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDeleteView}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete view
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
