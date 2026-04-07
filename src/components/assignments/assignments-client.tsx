"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { useRouter } from "next/navigation"
import { Check, ClipboardList, Columns3, Plus, SlidersHorizontal, X } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { AssignmentsTable, AssignmentRecord } from "@/components/assignments/assignments-table"
import { AssignmentForm, AssignmentFormData } from "@/components/assignments/assignment-form"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BulkSelectionBar } from "@/components/ui/bulk-selection-bar"
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
import { TopbarSearchAction } from "@/components/ui/topbar-search-action"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/lib/toast"
import { CreateViewDialog } from "@/components/common/create-view-dialog"
import { AssignmentView, AssignmentViewFilters, createAssignmentView, deleteAssignmentView, TableView } from "@/lib/table-views"
import { cn } from "@/lib/utils"

interface AssignmentsClientProps {
  assignments: AssignmentRecord[]
  initialViews?: AssignmentView[]
}

function toTitleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

const ASSIGNMENT_FILTER_SECTIONS = [
  {
    sectionLabel: "Type",
    key: "assignmentTypes",
    optional: true,
    options: [] as Array<{ value: string; label: string }>,
  },
  {
    sectionLabel: "Status",
    key: "statuses",
    optional: true,
    options: [
      { value: "confirmed", label: "Confirmed" },
      { value: "pending", label: "Pending" },
    ],
  },
]

export function AssignmentsClient({ assignments, initialViews = [] }: AssignmentsClientProps) {
  const router = useRouter()
  const [, startDeleteTransition] = useTransition()
  const [mounted, setMounted] = useState(false)
  const [views, setViews] = useState<AssignmentView[]>(initialViews)
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<"all" | "confirmed" | "pending">("all")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [displayOptionsOpen, setDisplayOptionsOpen] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [createFilterDialogOpen, setCreateFilterDialogOpen] = useState(false)
  const [newAssignmentModalOpen, setNewAssignmentModalOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const typeOptions = useMemo(() => {
    const counts = new Map<string, number>()
    assignments.forEach((assignment) => {
      counts.set(assignment.assignment_type, (counts.get(assignment.assignment_type) ?? 0) + 1)
    })
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: toTitleCase(value), count }))
  }, [assignments])

  const assignmentFilterSections = useMemo(() => {
    const dynamicTypeOptions = typeOptions.map((typeOption) => ({
      value: typeOption.value,
      label: typeOption.label,
    }))
    return [
      {
        ...ASSIGNMENT_FILTER_SECTIONS[0],
        options: dynamicTypeOptions,
      },
      ASSIGNMENT_FILTER_SECTIONS[1],
    ]
  }, [typeOptions])

  const activeView = useMemo(
    () => views.find((view) => view.id === activeViewId) ?? null,
    [views, activeViewId]
  )

  const filteredAssignments = useMemo(() => {
    let result = assignments

    const effectiveTypes =
      activeView?.filters.assignmentTypes && activeView.filters.assignmentTypes.length > 0
        ? activeView.filters.assignmentTypes
        : selectedTypes
    const effectiveStatus =
      activeView?.filters.statuses && activeView.filters.statuses.length > 0
        ? activeView.filters.statuses
        : selectedStatus === "all"
          ? []
          : [selectedStatus]

    if (search) {
      const query = search.toLowerCase()
      result = result.filter((assignment) => {
        const assignmentTitle = assignment.topic || assignment.agenda_item?.title || ""
        const assignee = assignment.directory?.name || ""
        const meeting = assignment.agenda_item?.meeting?.title || ""
        return (
          assignmentTitle.toLowerCase().includes(query) ||
          assignee.toLowerCase().includes(query) ||
          meeting.toLowerCase().includes(query) ||
          toTitleCase(assignment.assignment_type).toLowerCase().includes(query)
        )
      })
    }

    if (effectiveTypes.length > 0) {
      result = result.filter((assignment) => effectiveTypes.includes(assignment.assignment_type))
    }

    if (effectiveStatus.length > 0) {
      result = result.filter((assignment) => {
        const assignmentStatus = assignment.is_confirmed ? "confirmed" : "pending"
        return effectiveStatus.includes(assignmentStatus)
      })
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const { key, direction } = sortConfig
        const aMeetingDate = a.agenda_item?.meeting?.scheduled_date || ""
        const bMeetingDate = b.agenda_item?.meeting?.scheduled_date || ""

        const valueByKey: Record<string, [string | number, string | number]> = {
          assignee: [a.directory?.name || "", b.directory?.name || ""],
          assignment: [a.topic || a.agenda_item?.title || "", b.topic || b.agenda_item?.title || ""],
          type: [a.assignment_type, b.assignment_type],
          status: [a.is_confirmed ? 1 : 0, b.is_confirmed ? 1 : 0],
          meeting: [a.agenda_item?.meeting?.title || "", b.agenda_item?.meeting?.title || ""],
          date: [aMeetingDate, bMeetingDate],
        }

        const [aValue, bValue] = valueByKey[key] ?? ["", ""]
        if (aValue < bValue) return direction === "asc" ? -1 : 1
        if (aValue > bValue) return direction === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [assignments, search, selectedTypes, selectedStatus, activeView, sortConfig])

  const hasActiveFilters =
    !activeView &&
    (search.length > 0 ||
      selectedTypes.length > 0 ||
      selectedStatus !== "all" ||
      hiddenColumns.size > 0)

  const handleSort = useCallback((key: string, direction: "asc" | "desc") => {
    setSortConfig((current) => {
      if (current?.key === key && current.direction === direction) return null
      return { key, direction }
    })
  }, [])

  const handleToggleType = useCallback((type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((value) => value !== type) : [...prev, type]
    )
  }, [])

  const handleToggleColumnVisibility = useCallback((column: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev)
      const visibleCount = ["assignee", "assignment", "type", "status", "meeting", "date"].filter(
        (currentColumn) => !next.has(currentColumn)
      ).length
      const currentlyVisible = !next.has(column)

      if (currentlyVisible && visibleCount <= 1) return prev
      if (currentlyVisible) next.add(column)
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
      if (prev.size === filteredAssignments.length) return new Set()
      return new Set(filteredAssignments.map((assignment) => assignment.id))
    })
  }, [filteredAssignments])

  const handleDelete = async (id: string) => {
    const supabase = createClient()
    const { error } = await (supabase.from("meeting_assignments") as ReturnType<typeof supabase.from>)
      .delete()
      .eq("id", id)
    if (error) {
      toast.error(error.message || "Failed to delete assignment.")
      return
    }
    toast.success("Assignment deleted.")
    router.refresh()
  }

  const handleBulkDelete = async () => {
    if (selectedRows.size === 0) return
    setIsBulkDeleting(true)
    const supabase = createClient()
    const ids = Array.from(selectedRows)
    const { error } = await (supabase.from("meeting_assignments") as ReturnType<typeof supabase.from>)
      .delete()
      .in("id", ids)
    if (error) {
      toast.error(error.message || "Failed to delete assignments.")
    } else {
      toast.success(`${ids.length} assignment${ids.length > 1 ? "s" : ""} deleted.`)
      setSelectedRows(new Set())
      router.refresh()
    }
    setIsBulkDeleting(false)
    setShowBulkDeleteDialog(false)
  }

  const handleOpenAssignment = (assignment: AssignmentRecord) => {
    const meetingId = assignment.agenda_item?.meeting?.id
    if (!meetingId) return
    router.push(`/meetings/${meetingId}`)
  }

  const handleCreateAssignment = async (formData: AssignmentFormData) => {
    setIsCreating(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Not authenticated. Please log in again.")
      setIsCreating(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single()

    if (!profile || !["leader", "admin"].includes(profile.role)) {
      toast.error("Only leaders and admins can create assignments.")
      setIsCreating(false)
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("meeting_assignments") as any)
      .insert({
        directory_id: formData.directoryId,
        assignment_type: formData.assignmentType,
        topic: formData.topic || null,
        is_confirmed: formData.isConfirmed,
        workspace_id: profile.workspace_id,
        created_by: user.id,
        agenda_item_id: formData.agendaItemId || null,
      })

    if (error) {
      toast.error(error.message || "Failed to create assignment.")
      setIsCreating(false)
      return
    }

    toast.success("Assignment created successfully!")
    setIsCreating(false)
    setNewAssignmentModalOpen(false)
    router.refresh()
  }

  function handleViewCreated(view: TableView) {
    setViews((prev) => [...prev, view as AssignmentView])
    setActiveViewId(view.id)
  }

  async function handleSaveView(name: string, filters: Record<string, string[]>) {
    return createAssignmentView(name, filters as AssignmentViewFilters)
  }

  function handleDeleteView(viewId: string) {
    setDeletingViewId(viewId)
  }

  async function confirmDeleteView() {
    if (!deletingViewId) return
    const id = deletingViewId
    setDeletingViewId(null)

    startDeleteTransition(async () => {
      const result = await deleteAssignmentView(id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setViews((prev) => prev.filter((view) => view.id !== id))
      if (activeViewId === id) setActiveViewId(null)
      toast.success("Filter deleted")
    })
  }

  return (
    <div className="flex h-full flex-col bg-muted/30">
      <Breadcrumbs
        items={[{ label: "Assignments", icon: <ClipboardList className="h-3.5 w-3.5" /> }]}
        className="rounded-none border-b border-border/60 bg-transparent px-4 py-1.5 ring-0"
        action={
          <div className="hidden items-center gap-1 sm:flex">
            <TopbarSearchAction
              value={search}
              onChange={setSearch}
              placeholder="Search assignments..."
              items={filteredAssignments.slice(0, 8).map((assignment) => ({
                id: assignment.id,
                label: `${assignment.directory?.name || "Unknown"} — ${assignment.topic || assignment.agenda_item?.title || toTitleCase(assignment.assignment_type)}`,
                actionLabel: "Open",
              }))}
              onSelect={(assignmentId) => {
                const selectedAssignment = filteredAssignments.find((item) => item.id === assignmentId)
                if (!selectedAssignment) return
                handleOpenAssignment(selectedAssignment)
              }}
              emptyText="No matching assignments."
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNewAssignmentModalOpen(true)}
              className="h-7 gap-1 rounded-full px-2.5 text-[length:var(--agenda-control-font-size)] text-nav transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
              New assignment
            </Button>
          </div>
        }
      />

      <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/45 px-6 pb-3.5 pt-3.5">
        <div className="flex min-h-8 flex-wrap items-center gap-2">
          {views.map((view) => (
            <span key={view.id} className="group/view relative inline-flex items-center">
              <button
                onClick={() => setActiveViewId(view.id)}
                className={cn(
                  "rounded-full border py-1.5 pl-3.5 pr-7 text-[11px] leading-none shadow-sm transition-all",
                  activeViewId === view.id
                    ? "border-transparent bg-[hsl(var(--chip-active-bg))] font-semibold text-[hsl(var(--chip-active-text))]"
                    : "border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] font-medium text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))] hover:text-[hsl(var(--chip-active-text))]"
                )}
              >
                {view.name}
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  handleDeleteView(view.id)
                }}
                title="Delete filter"
                className={cn(
                  "absolute right-2 top-1/2 flex h-3.5 w-3.5 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/view:opacity-100",
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
              className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[hsl(var(--chip-hover-bg))] hover:text-foreground"
            >
              Clear filter
            </button>
          )}

          <StandardPopoverMenu open={filtersOpen} onOpenChange={setFiltersOpen}>
            <StandardPopoverMenuTrigger asChild>
              <ToolbarIconButton title="Filters" aria-label="Open filters">
                <SlidersHorizontal className="h-3.5 w-3.5" />
              </ToolbarIconButton>
            </StandardPopoverMenuTrigger>
            <StandardPopoverMenuContent align="start" className="w-64">
              <StandardPopoverMenuSub>
                <StandardPopoverMenuSubTrigger active={selectedTypes.length > 0}>
                  Type
                </StandardPopoverMenuSubTrigger>
                <StandardPopoverMenuSubContent>
                  {typeOptions.map((option) => {
                    const selected = selectedTypes.includes(option.value)
                    return (
                      <StandardPopoverMenuItem
                        key={option.value}
                        active={selected}
                        onSelect={() => handleToggleType(option.value)}
                      >
                        <span className="flex items-center gap-2">
                          <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border/60">
                            {selected ? <Check className="h-3 w-3" /> : null}
                          </span>
                          {option.label}
                        </span>
                        <span className="ml-auto text-[length:var(--table-header-font-size)] text-muted-foreground">
                          {option.count}
                        </span>
                      </StandardPopoverMenuItem>
                    )
                  })}
                </StandardPopoverMenuSubContent>
              </StandardPopoverMenuSub>

              <StandardPopoverMenuSub>
                <StandardPopoverMenuSubTrigger active={selectedStatus !== "all"}>
                  Status
                </StandardPopoverMenuSubTrigger>
                <StandardPopoverMenuSubContent>
                  {[
                    { value: "confirmed", label: "Confirmed" },
                    { value: "pending", label: "Pending" },
                  ].map((option) => (
                    <StandardPopoverMenuItem
                      key={option.value}
                      active={selectedStatus === option.value}
                      onSelect={() => setSelectedStatus(option.value as "confirmed" | "pending")}
                    >
                      {option.label}
                    </StandardPopoverMenuItem>
                  ))}
                </StandardPopoverMenuSubContent>
              </StandardPopoverMenuSub>

              {(selectedTypes.length > 0 || selectedStatus !== "all") && !activeView && (
                <StandardPopoverMenuItem
                  onSelect={() => {
                    setSelectedTypes([])
                    setSelectedStatus("all")
                  }}
                  className="text-muted-foreground"
                >
                  Clear filters
                </StandardPopoverMenuItem>
              )}

              <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />

              <StandardPopoverMenuSub>
                <StandardPopoverMenuSubTrigger active={!!activeView}>
                  Advanced filters
                </StandardPopoverMenuSubTrigger>
                <StandardPopoverMenuSubContent className="w-64">
                  {views.length === 0 ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      No saved filters yet.
                    </p>
                  ) : (
                    views.map((view) => (
                      <StandardPopoverMenuItem
                        key={view.id}
                        active={activeViewId === view.id}
                        onSelect={() => {
                          setActiveViewId(view.id)
                          setFiltersOpen(false)
                        }}
                      >
                        <span className="truncate">{view.name}</span>
                      </StandardPopoverMenuItem>
                    ))
                  )}

                  <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />

                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen(false)
                      setCreateFilterDialogOpen(true)
                    }}
                    className="flex w-full items-center justify-start gap-2 rounded-md px-2.5 py-1.5 text-[length:var(--menu-item-font-size)] text-[hsl(var(--menu-text))] hover:bg-[hsl(var(--menu-hover))]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create new filter
                  </button>
                </StandardPopoverMenuSubContent>
              </StandardPopoverMenuSub>
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
                { key: "assignee", label: "Assignee" },
                { key: "assignment", label: "Assignment" },
                { key: "type", label: "Type" },
                { key: "status", label: "Status" },
                { key: "meeting", label: "Meeting" },
                { key: "date", label: "Date" },
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
              {hiddenColumns.size > 0 ? (
                <>
                  <div className="my-1 h-px bg-[hsl(var(--menu-separator))]" />
                  <StandardPopoverMenuItem onSelect={() => setHiddenColumns(new Set())} className="text-muted-foreground">
                    Show all columns
                  </StandardPopoverMenuItem>
                </>
              ) : null}
            </StandardPopoverMenuContent>
          </StandardPopoverMenu>
        </div>
      </div>

      {hasActiveFilters && selectedRows.size === 0 && (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          {search ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
              Search: &quot;{search}&quot;
              <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}

          {selectedTypes.map((type) => (
            <span
              key={type}
              className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]"
            >
              {toTitleCase(type)}
              <button onClick={() => handleToggleType(type)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedStatus !== "all" ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 text-[11px] font-medium leading-none text-[hsl(var(--chip-text))]">
              {selectedStatus === "confirmed" ? "Confirmed" : "Pending"}
              <button onClick={() => setSelectedStatus("all")} className="text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ) : null}

          {hiddenColumns.size > 0 ? (
            <button
              onClick={() => setHiddenColumns(new Set())}
              className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[hsl(var(--chip-hover-bg))] hover:text-foreground"
            >
              Show all columns
            </button>
          ) : null}

          <button
            onClick={() => {
              setSearch("")
              setSelectedTypes([])
              setSelectedStatus("all")
              setHiddenColumns(new Set())
            }}
            className="inline-flex items-center rounded-full border border-[hsl(var(--chip-border))] px-2.5 py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-[hsl(var(--chip-hover-bg))] hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}

      {activeView && (
        <div className="flex flex-wrap items-center gap-2 px-6 pb-3 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Filters:</span>
          {activeView.filters.assignmentTypes?.map((type) => (
            <span
              key={type}
              className="rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 leading-none text-[hsl(var(--chip-text))]"
            >
              {toTitleCase(type)}
            </span>
          ))}
          {activeView.filters.statuses?.map((status) => (
            <span
              key={status}
              className="rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 leading-none text-[hsl(var(--chip-text))]"
            >
              {toTitleCase(status)}
            </span>
          ))}
          {search && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--chip-border))] bg-[hsl(var(--chip-bg))] px-2.5 py-1.5 leading-none text-[hsl(var(--chip-text))]">
              Search: &quot;{search}&quot;
              <button onClick={() => setSearch("")} className="ml-1 text-muted-foreground hover:text-foreground">
                <X className="inline h-3 w-3 stroke-[1.6]" />
              </button>
            </span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto px-6 pb-6">
        <AssignmentsTable
          assignments={filteredAssignments}
          sortConfig={sortConfig}
          onSort={handleSort}
          hiddenColumns={hiddenColumns}
          selectedRows={selectedRows}
          onToggleRow={handleToggleRow}
          onToggleAllRows={handleToggleAllRows}
          onOpenAssignment={handleOpenAssignment}
          onDelete={handleDelete}
        />
      </div>

      {/* New Assignment Modal */}
      <Dialog open={newAssignmentModalOpen} onOpenChange={setNewAssignmentModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <DialogHeader className="px-5 py-4 space-y-3">
            <DialogTitle>New Assignment</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Create a new assignment for a directory member.
            </p>
          </DialogHeader>
          <AssignmentForm
            onSubmit={handleCreateAssignment}
            isLoading={isCreating}
            onCancel={() => setNewAssignmentModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedRows.size} assignment{selectedRows.size > 1 ? "s" : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the selected assignment{selectedRows.size > 1 ? "s" : ""}.
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

      <CreateViewDialog
        filterSections={assignmentFilterSections}
        onSave={handleSaveView}
        onCreated={handleViewCreated}
        open={createFilterDialogOpen}
        onOpenChange={setCreateFilterDialogOpen}
        hideTrigger
      />

      <AlertDialog open={!!deletingViewId} onOpenChange={(open) => !open && setDeletingViewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this filter?</AlertDialogTitle>
            <AlertDialogDescription>
              This saved filter will be removed for everyone in your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingViewId(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteView}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete filter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {mounted && selectedRows.size > 0
        ? createPortal(
            <div className="pointer-events-none fixed bottom-6 left-1/2 z-[95] flex w-[90vw] -translate-x-1/2 justify-center sm:w-auto">
              <BulkSelectionBar
                selectedCount={selectedRows.size}
                onClear={() => setSelectedRows(new Set())}
                onDelete={() => setShowBulkDeleteDialog(true)}
                isDeleting={isBulkDeleting}
              />
            </div>,
            document.body
          )
        : null}
    </div>
  )
}
