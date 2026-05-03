"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckSquare, Eye, Trash2, CircleCheckBig, CircleDashed, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SortableTableHeader } from "@/components/ui/sortable-table-header"
import { StandardTableShell, StandardSelectAllHeadCell, StandardActionsHeadCell, StandardSelectableRow } from "@/components/ui/standard-data-table"
import { standardTableHeaderRowVariants, standardTableHeaderVariants, standardTableVariants } from "@/components/ui/table-standard"
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table"
import { TableRowActionTrigger } from "@/components/ui/table-row-action-trigger"

export interface AssignmentRecord {
  id: string
  assignment_type: string
  topic: string | null
  is_confirmed: boolean
  created_at: string
  directory: {
    id: string
    name: string
  } | null
  agenda_item: {
    id: string
    title: string
    meeting: {
      id: string
      title: string
      scheduled_date: string | null
    } | null
  } | null
}

interface AssignmentsTableProps {
  assignments: AssignmentRecord[]
  sortConfig?: { key: string; direction: "asc" | "desc" } | null
  onSort?: (key: string, direction: "asc" | "desc") => void
  hiddenColumns?: Set<string>
  selectedRows?: Set<string>
  onToggleRow?: (id: string) => void
  onToggleAllRows?: () => void
  onOpenAssignment?: (assignment: AssignmentRecord) => void
  onDelete?: (id: string) => Promise<void>
  onUpdateStatus?: (id: string, isConfirmed: boolean) => Promise<void>
  onUpdateAssignee?: (id: string, dirId: string) => Promise<void>
  onUpdateTopic?: (id: string, topic: string | null) => Promise<void>
  directoryEntries?: { id: string; name: string }[]
}

function TopicCell({
  assignment,
  onUpdateTopic,
}: {
  assignment: AssignmentRecord
  onUpdateTopic?: (id: string, topic: string | null) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const defaultTopic = assignment.topic || ""
  const [value, setValue] = useState(defaultTopic)

  const handleSave = () => {
    if (onUpdateTopic) {
      onUpdateTopic(assignment.id, value.trim() || null)
    }
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
  }

  // The display text logic stays the same - fallback to agenda title or type if no explicit topic
  const displayText = assignment.topic || assignment.agenda_item?.title || toTitleCase(assignment.assignment_type)

  if (!onUpdateTopic) {
    return <span className="table-cell-meta text-[11.5px] text-foreground/56">{displayText}</span>
  }

  return (
    <Popover open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen)
      if (newOpen) setValue(assignment.topic || "")
    }}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="table-cell-meta text-[11.5px] text-foreground/56 hover:underline underline-offset-4 decoration-border outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-1 -ml-1 text-left"
      >
        {displayText}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2 bg-popover/95 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Enter topic..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-[13px]"
            autoFocus
          />
          <button
            onClick={handleSave}
            className="h-7 rounded-sm bg-primary px-3 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors self-end"
          >
            Save
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function AssigneeCell({
  assignment,
  directoryEntries,
  onUpdateAssignee,
}: {
  assignment: AssignmentRecord
  directoryEntries?: { id: string; name: string }[]
  onUpdateAssignee?: (id: string, dirId: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")

  const filtered = search && directoryEntries
    ? directoryEntries.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : directoryEntries || []

  if (!onUpdateAssignee || !directoryEntries || directoryEntries.length === 0) {
    return (
      <span className="table-cell-link rounded-sm">
        {assignment.directory?.name || "Unassigned"}
      </span>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        onClick={(e) => e.stopPropagation()}
        className="table-cell-link rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background text-left"
      >
        {assignment.directory?.name || "Unassigned"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1 bg-popover/95 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-2 pb-1.5 pt-1">
          <Input
            placeholder="Search assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 text-[13px] bg-transparent border-border/50"
            autoFocus
          />
        </div>
        <div className="max-h-48 overflow-y-auto outline-none">
          {filtered.length === 0 ? (
            <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">No matches.</p>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateAssignee(assignment.id, entry.id)
                  setOpen(false)
                  setSearch("")
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors",
                  assignment.directory?.id === entry.id
                    ? "bg-accent/60 text-accent-foreground font-medium"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <span className="inline-flex h-3 w-3 items-center justify-center shrink-0">
                  {assignment.directory?.id === entry.id && <Check className="h-3 w-3" />}
                </span>
                <span className="truncate">{entry.name}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function toTitleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

export function AssignmentsTable({
  assignments,
  sortConfig,
  onSort,
  hiddenColumns = new Set(),
  selectedRows = new Set(),
  onToggleRow,
  onToggleAllRows,
  onOpenAssignment,
  onDelete,
  onUpdateStatus,
  onUpdateAssignee,
  onUpdateTopic,
  directoryEntries = [],
}: AssignmentsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<AssignmentRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const allSelected = assignments.length > 0 && selectedRows.size === assignments.length

  const visibleColumns =
    ["assignee", "assignment", "type", "status", "meeting", "date"].filter((column) => !hiddenColumns.has(column)).length + 2

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return
    setIsDeleting(true)
    await onDelete(deleteTarget.id)
    setIsDeleting(false)
    setDeleteTarget(null)
  }

  return (
    <>
      <StandardTableShell variant="app" className="overflow-hidden">
        <Table className={standardTableVariants({ density: "compact", dividers: "subtle" })}>
          <TableHeader className={standardTableHeaderVariants({ sticky: true, variant: "app" })}>
            <TableRow className={standardTableHeaderRowVariants({ variant: "app" })}>
              <StandardSelectAllHeadCell
                checked={allSelected}
                onToggle={() => onToggleAllRows?.()}
                variant="app"
              />

              {!hiddenColumns.has("assignee") && (
                <SortableTableHeader
                  sortKey="assignee"
                  label="Assignee"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="min-w-[220px]"
                />
              )}

              {!hiddenColumns.has("assignment") && (
                <SortableTableHeader
                  sortKey="assignment"
                  label="Topic"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="min-w-[220px]"
                />
              )}

              {!hiddenColumns.has("type") && (
                <SortableTableHeader
                  sortKey="type"
                  label="Type"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="w-[130px]"
                />
              )}

              {!hiddenColumns.has("status") && (
                <SortableTableHeader
                  sortKey="status"
                  label="Status"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="w-[120px]"
                />
              )}

              {!hiddenColumns.has("meeting") && (
                <SortableTableHeader
                  sortKey="meeting"
                  label="Meeting"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="w-[210px]"
                />
              )}

              {!hiddenColumns.has("date") && (
                <SortableTableHeader
                  sortKey="date"
                  label="Date"
                  defaultDirection="desc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  variant="app"
                  className="w-[170px]"
                />
              )}

              <StandardActionsHeadCell variant="app" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {assignments.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleColumns} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center py-4">
                    <CheckSquare className="mb-2 h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground">No assignments found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((assignment) => {
                const meetingTitle = assignment.agenda_item?.meeting?.title || ""
                const scheduledDate = assignment.agenda_item?.meeting?.scheduled_date
                return (
                  <StandardSelectableRow
                    key={assignment.id}
                    id={assignment.id}
                    selected={selectedRows.has(assignment.id)}
                    onToggle={onToggleRow}
                    className="focus-within:bg-transparent focus-within:shadow-none"
                    actions={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <TableRowActionTrigger />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onOpenAssignment?.(assignment)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Open meeting
                          </DropdownMenuItem>
                          {onDelete ? (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(assignment)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                  >
                    {!hiddenColumns.has("assignee") && (
                      <TableCell className="table-cell-title">
                        <AssigneeCell
                          assignment={assignment}
                          directoryEntries={directoryEntries}
                          onUpdateAssignee={onUpdateAssignee}
                        />
                      </TableCell>
                    )}

                    {!hiddenColumns.has("assignment") && (
                      <TableCell className="table-cell-title">
                        <TopicCell 
                          assignment={assignment} 
                          onUpdateTopic={onUpdateTopic} 
                        />
                      </TableCell>
                    )}

                    {!hiddenColumns.has("type") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {toTitleCase(assignment.assignment_type)}
                      </TableCell>
                    )}

                    {!hiddenColumns.has("status") && (
                      <TableCell className="table-cell-meta !px-2">
                        {onUpdateStatus ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={(e) => e.stopPropagation()}
                              className="flex h-7 items-center gap-1.5 rounded-full px-2 hover:bg-black/5 dark:hover:bg-white/10 outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ring"
                            >
                              {assignment.is_confirmed ? (
                                <CircleCheckBig className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
                              ) : (
                                <CircleDashed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              )}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-36">
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(assignment.id, false) }} 
                                className="gap-2 text-[13px]"
                              >
                                <CircleDashed className="h-3.5 w-3.5" /> Pending
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(assignment.id, true) }} 
                                className="gap-2 text-[13px]"
                              >
                                <CircleCheckBig className="h-3.5 w-3.5" /> Confirmed
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="flex items-center gap-1.5 h-7 px-2">
                            {assignment.is_confirmed ? (
                              <CircleCheckBig className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
                            ) : (
                              <CircleDashed className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}

                    {!hiddenColumns.has("meeting") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {meetingTitle}
                      </TableCell>
                    )}

                    {!hiddenColumns.has("date") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {scheduledDate ? format(new Date(scheduledDate), "MMM d") : ""}
                      </TableCell>
                    )}
                  </StandardSelectableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </StandardTableShell>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete assignment</AlertDialogTitle>
            <AlertDialogDescription>
              This assignment will be permanently removed.
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
