"use client"

import { useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus, X, Trash2, CalendarDays, MessageSquare } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import {
    DiscussionsTable,
    Discussion,
    DiscussionStatus,
    DiscussionPriority,
    DiscussionCategory,
} from "./discussions-table"
import { DiscussionDrawer } from "./discussion-drawer"

interface DiscussionsClientProps {
    discussions: Discussion[]
    totalCount: number
    statusCounts: Record<string, number>
    priorityCounts: Record<string, number>
    categoryCounts: Record<string, number>
    currentFilters: {
        search: string
        status: string[]
    }
}

export function DiscussionsClient({
    discussions,
    statusCounts,
    priorityCounts,
    categoryCounts,
}: DiscussionsClientProps) {
    const router = useRouter()
    const [selectedDiscussion, setSelectedDiscussion] =
        useState<Discussion | null>(null)
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Search
    const [search, setSearch] = useState("")

    // Filters
    const [selectedStatuses, setSelectedStatuses] = useState<
        DiscussionStatus[]
    >([])
    const [selectedPriorities, setSelectedPriorities] = useState<
        DiscussionPriority[]
    >([])
    const [selectedCategories, setSelectedCategories] = useState<
        DiscussionCategory[]
    >([])

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

    // ── Derived data ────────────────────────────────────────────────────────

    const filteredDiscussions = useMemo(() => {
        let result = discussions

        // Search (client-side on title, description, workspace id)
        if (search) {
            const q = search.toLowerCase()
            result = result.filter(
                (d) =>
                    d.title?.toLowerCase().includes(q) ||
                    d.description?.toLowerCase().includes(q) ||
                    d.workspace_discussion_id?.toLowerCase().includes(q)
            )
        }

        // Status filter
        if (selectedStatuses.length > 0) {
            result = result.filter((d) =>
                selectedStatuses.includes(d.status as DiscussionStatus)
            )
        }

        // Priority filter
        if (selectedPriorities.length > 0) {
            result = result.filter((d) =>
                selectedPriorities.includes(
                    d.priority as DiscussionPriority
                )
            )
        }

        // Category filter
        if (selectedCategories.length > 0) {
            result = result.filter((d) =>
                selectedCategories.includes(
                    d.category as DiscussionCategory
                )
            )
        }

        // Sort
        if (sortConfig) {
            result = [...result].sort((a, b) => {
                const { key, direction } = sortConfig
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let aValue: any = a[key as keyof Discussion]
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                let bValue: any = b[key as keyof Discussion]

                if (aValue === null || aValue === undefined) return 1
                if (bValue === null || bValue === undefined) return -1

                if (key === "priority") {
                    const order = { high: 1, medium: 2, low: 3 }
                    aValue =
                        order[aValue as keyof typeof order] || 99
                    bValue =
                        order[bValue as keyof typeof order] || 99
                }

                if (aValue < bValue) return direction === "asc" ? -1 : 1
                if (aValue > bValue) return direction === "asc" ? 1 : -1
                return 0
            })
        }

        return result
    }, [
        discussions,
        search,
        selectedStatuses,
        selectedPriorities,
        selectedCategories,
        sortConfig,
    ])

    // ── Handlers ────────────────────────────────────────────────────────────

    const handleSort = useCallback(
        (key: string, direction: "asc" | "desc") => {
            setSortConfig((current) => {
                if (
                    current?.key === key &&
                    current.direction === direction
                )
                    return null
                return { key, direction }
            })
        },
        []
    )

    const handleStatusToggle = useCallback((status: string) => {
        setSelectedStatuses((prev) =>
            prev.includes(status as DiscussionStatus)
                ? prev.filter((s) => s !== status)
                : [...prev, status as DiscussionStatus]
        )
    }, [])

    const handlePriorityToggle = useCallback((priority: string) => {
        setSelectedPriorities((prev) =>
            prev.includes(priority as DiscussionPriority)
                ? prev.filter((p) => p !== priority)
                : [...prev, priority as DiscussionPriority]
        )
    }, [])

    const handleCategoryToggle = useCallback((category: string) => {
        setSelectedCategories((prev) =>
            prev.includes(category as DiscussionCategory)
                ? prev.filter((c) => c !== category)
                : [...prev, category as DiscussionCategory]
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
            if (prev.size === filteredDiscussions.length) return new Set()
            return new Set(filteredDiscussions.map((d) => d.id))
        })
    }, [filteredDiscussions])

    const handleDelete = async (id: string) => {
        const supabase = createClient()
        const { error } = await supabase
            .from("discussions")
            .delete()
            .eq("id", id)

        if (error) {
            toast.error(error.message || "Failed to delete discussion.")
        } else {
            toast.success("Discussion deleted.")
            router.refresh()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedRows.size === 0) return
        setIsBulkDeleting(true)
        const supabase = createClient()
        const ids = Array.from(selectedRows)
        const { error } = await supabase
            .from("discussions")
            .delete()
            .in("id", ids)

        if (error) {
            toast.error(error.message || "Failed to delete items")
        } else {
            toast.success(
                `${ids.length} discussion${ids.length > 1 ? "s" : ""} deleted`
            )
            setSelectedRows(new Set())
            router.refresh()
        }
        setIsBulkDeleting(false)
        setShowBulkDeleteDialog(false)
    }

    const handleViewDiscussion = (discussion: Discussion) => {
        setSelectedDiscussion(discussion)
        setDrawerOpen(true)
    }

    // ── Active filter chips ─────────────────────────────────────────────────

    const hasActiveFilters =
        search.length > 0 ||
        selectedStatuses.length > 0 ||
        selectedPriorities.length > 0 ||
        selectedCategories.length > 0 ||
        hiddenColumns.size > 0

    function formatCategoryLabel(c: string) {
        return c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    function formatStatusLabel(s: string) {
        return s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    }

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="flex flex-col h-full">
            {/* Breadcrumb */}
            <Breadcrumbs
                items={[
                    { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-3.5 w-3.5" /> },
                    { label: "Discussions", icon: <MessageSquare className="h-3.5 w-3.5" /> },
                ]}
            />

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 shrink-0">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Discussions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track ongoing topics and decisions
                    </p>
                </div>
                <Button asChild size="sm">
                    <Link href="/meetings/discussions/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Discussion
                    </Link>
                </Button>
            </div>

            {/* Selection action bar */}
            {selectedRows.size > 0 && (
                <div className="flex items-center gap-3 px-6 pb-3 shrink-0">
                    <span className="text-xs font-medium tabular-nums">
                        {selectedRows.size} selected
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                        onClick={() => setShowBulkDeleteDialog(true)}
                    >
                        <Trash2 className="mr-1.5 h-3 w-3" />
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

            {/* Active filter chips (hidden when selection bar is showing) */}
            {hasActiveFilters && selectedRows.size === 0 && (
                <div className="flex items-center gap-2 px-6 pb-3 flex-wrap">
                    {search && (
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                            Search: &quot;{search}&quot;
                            <button
                                onClick={() => setSearch("")}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    )}
                    {selectedStatuses.map((s) => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {formatStatusLabel(s)}
                            <button
                                onClick={() => handleStatusToggle(s)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {selectedPriorities.map((p) => (
                        <span
                            key={p}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize"
                        >
                            {p}
                            <button
                                onClick={() => handlePriorityToggle(p)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {selectedCategories.map((c) => (
                        <span
                            key={c}
                            className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs font-medium"
                        >
                            {formatCategoryLabel(c)}
                            <button
                                onClick={() => handleCategoryToggle(c)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                    {hiddenColumns.size > 0 && (
                        <button
                            onClick={() => setHiddenColumns(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                        >
                            Show all columns
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSearch("")
                            setSelectedStatuses([])
                            setSelectedPriorities([])
                            setSelectedCategories([])
                            setHiddenColumns(new Set())
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        Clear all
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto px-6">
                <DiscussionsTable
                    discussions={filteredDiscussions}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    searchValue={search}
                    onSearchChange={setSearch}
                    selectedStatuses={selectedStatuses}
                    statusCounts={statusCounts}
                    onStatusToggle={handleStatusToggle}
                    selectedPriorities={selectedPriorities}
                    priorityCounts={priorityCounts}
                    onPriorityToggle={handlePriorityToggle}
                    selectedCategories={selectedCategories}
                    categoryCounts={categoryCounts}
                    onCategoryToggle={handleCategoryToggle}
                    hiddenColumns={hiddenColumns}
                    onHideColumn={handleHideColumn}
                    selectedRows={selectedRows}
                    onToggleRow={handleToggleRow}
                    onToggleAllRows={handleToggleAllRows}
                    onViewDiscussion={handleViewDiscussion}
                    onDelete={handleDelete}
                />
            </div>

            {/* Drawer */}
            <DiscussionDrawer
                discussion={selectedDiscussion}
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                onDelete={handleDelete}
            />

            {/* Bulk delete confirmation */}
            <AlertDialog
                open={showBulkDeleteDialog}
                onOpenChange={setShowBulkDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {selectedRows.size} discussion
                            {selectedRows.size > 1 ? "s" : ""}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected
                            discussion
                            {selectedRows.size > 1 ? "s" : ""}. This action
                            cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isBulkDeleting}>
                            Cancel
                        </AlertDialogCancel>
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
        </div>
    )
}
