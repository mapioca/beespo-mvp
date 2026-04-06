"use client"

import { useState } from "react"
import { format } from "date-fns"
import { CheckSquare, Eye, Trash2 } from "lucide-react"

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
import { StatusIndicator } from "@/components/ui/status-indicator"
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
      <StandardTableShell className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="table-header-row-standard">
              <StandardSelectAllHeadCell
                checked={allSelected}
                onToggle={() => onToggleAllRows?.()}
                className="w-10 table-cell-check static px-[var(--table-cell-px)] py-[var(--table-row-py)] backdrop-blur-none"
              />

              {!hiddenColumns.has("assignee") && (
                <SortableTableHeader
                  sortKey="assignee"
                  label="Assignee"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
                  className="min-w-[220px]"
                />
              )}

              {!hiddenColumns.has("assignment") && (
                <SortableTableHeader
                  sortKey="assignment"
                  label="Assignment"
                  defaultDirection="asc"
                  sortConfig={sortConfig}
                  onSort={onSort}
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
                  className="w-[170px]"
                />
              )}

              <StandardActionsHeadCell className="static backdrop-blur-none" />
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
                const assignmentTitle = assignment.topic || assignment.agenda_item?.title || toTitleCase(assignment.assignment_type)
                const meetingTitle = assignment.agenda_item?.meeting?.title || "—"
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
                      <TableCell className="table-cell-title">{assignment.directory?.name || "Unknown"}</TableCell>
                    )}

                    {!hiddenColumns.has("assignment") && (
                      <TableCell className="table-cell-title">{assignmentTitle}</TableCell>
                    )}

                    {!hiddenColumns.has("type") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {toTitleCase(assignment.assignment_type)}
                      </TableCell>
                    )}

                    {!hiddenColumns.has("status") && (
                      <TableCell className="table-cell-meta !px-2">
                        <StatusIndicator
                          label={assignment.is_confirmed ? "Confirmed" : "Pending"}
                          tone={assignment.is_confirmed ? "success" : "warning"}
                          className="text-[11.5px] text-foreground/66"
                        />
                      </TableCell>
                    )}

                    {!hiddenColumns.has("meeting") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {meetingTitle}
                      </TableCell>
                    )}

                    {!hiddenColumns.has("date") && (
                      <TableCell className="table-cell-meta text-[11.5px] text-foreground/56">
                        {scheduledDate ? format(new Date(scheduledDate), "MMM d, yyyy h:mm a") : "—"}
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

