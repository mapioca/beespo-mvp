"use client"

import * as React from "react"

import { Checkbox } from "@/components/ui/checkbox"
import { TableCell, TableHead, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface StandardTableShellProps {
  children: React.ReactNode
  className?: string
}

export function StandardTableShell({ children, className }: StandardTableShellProps) {
  return <div className={cn("table-shell-standard !overflow-visible", className)}>{children}</div>
}

interface StandardSelectAllHeadCellProps {
  checked: boolean
  onToggle: () => void
  className?: string
}

export function StandardSelectAllHeadCell({
  checked,
  onToggle,
  className,
}: StandardSelectAllHeadCellProps) {
  return (
    <TableHead
      className={cn(
        "sticky top-0 z-20 w-10 bg-gray-100 px-3 py-2",
        className
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
      />
    </TableHead>
  )
}

interface StandardActionsHeadCellProps {
  className?: string
}

export function StandardActionsHeadCell({ className }: StandardActionsHeadCellProps) {
  return (
    <TableHead
      className={cn(
        "sticky top-0 z-20 w-[52px] bg-gray-100",
        className
      )}
    >
      <span className="sr-only">Actions</span>
    </TableHead>
  )
}

interface StandardSelectableRowProps {
  id: string
  selected: boolean
  onToggle?: (id: string) => void
  onRowClick?: () => void
  selectOnRowClick?: boolean
  children: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'a, button, input, select, textarea, label, [role="button"], [role="checkbox"], [role="menuitem"], [data-row-interactive="true"]'
    )
  )
}

export function StandardSelectableRow({
  id,
  selected,
  onToggle,
  onRowClick,
  selectOnRowClick = true,
  children,
  actions,
  className,
}: StandardSelectableRowProps) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      className={cn(
        "group transition-[background-color,box-shadow] duration-150 ease-out hover:bg-[hsl(var(--table-row-hover))] focus-within:bg-[hsl(var(--table-row-hover))] data-[state=selected]:bg-[hsl(var(--table-row-selected))]",
        onRowClick && "cursor-pointer",
        className
      )}
      onClick={(event) => {
        if (isInteractiveTarget(event.target)) return
        if (onRowClick) {
          onRowClick()
          return
        }
        if (selectOnRowClick) onToggle?.(id)
      }}
    >
      <TableCell className="px-3 py-2.5">
        <Checkbox
          checked={selected}
          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=checked]:opacity-100"
          onCheckedChange={() => onToggle?.(id)}
        />
      </TableCell>

      {children}

      <TableCell className="table-cell-actions">{actions}</TableCell>
    </TableRow>
  )
}
