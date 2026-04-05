"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc"

interface SortableTableHeaderProps {
  label: string
  sortKey: string
  sortConfig?: { key: string; direction: SortDirection } | null
  defaultDirection: SortDirection
  onSort?: (key: string, direction: SortDirection) => void
  className?: string
}

export function SortableTableHeader({
  label,
  sortKey,
  sortConfig,
  defaultDirection,
  onSort,
  className,
}: SortableTableHeaderProps) {
  const isActive = sortConfig?.key === sortKey
  const activeDirection = isActive ? sortConfig?.direction : undefined
  const showUp = isActive ? activeDirection === "asc" : defaultDirection === "asc"
  const Icon = showUp ? ArrowUp : ArrowDown

  const handleSort = () => {
    const nextDirection: SortDirection =
      sortConfig?.key === sortKey
        ? sortConfig.direction === "asc"
          ? "desc"
          : "asc"
        : defaultDirection
    onSort?.(sortKey, nextDirection)
  }

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={handleSort}
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 -mx-1.5",
          "transition-colors hover:bg-[hsl(var(--agenda-interactive-hover))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--agenda-interactive-focus-ring))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          isActive
            ? "bg-[hsl(var(--agenda-interactive-active))] text-foreground/85"
            : "text-foreground/55 hover:text-foreground/80"
        )}
        aria-label={`Sort by ${label}`}
      >
        <span className="text-[length:var(--table-header-font-size)] font-semibold [letter-spacing:var(--table-header-letter-spacing)]">
          {label}
        </span>
        <Icon
          className={cn(
            "h-3 w-3 transition-opacity",
            isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        />
      </button>
    </TableHead>
  )
}
