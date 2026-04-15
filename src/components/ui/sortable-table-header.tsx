"use client"

import { ArrowDown, ArrowUp } from "lucide-react"
import { TableHead } from "@/components/ui/table"
import {
  sortableTableHeaderButtonVariants,
  standardStickyHeadCellVariants,
} from "@/components/ui/table-standard"
import { cn } from "@/lib/utils"

type SortDirection = "asc" | "desc"

interface SortableTableHeaderProps {
  label: string
  sortKey: string
  sortConfig?: { key: string; direction: SortDirection } | null
  defaultDirection: SortDirection
  onSort?: (key: string, direction: SortDirection) => void
  className?: string
  variant?: "default" | "app"
}

export function SortableTableHeader({
  label,
  sortKey,
  sortConfig,
  defaultDirection,
  onSort,
  className,
  variant = "default",
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
    <TableHead
      className={cn(
        "bg-gray-100",
        variant === "app" && standardStickyHeadCellVariants({ variant, kind: "data" }),
        className
      )}
    >
      <button
        type="button"
        onClick={handleSort}
        className={cn(
          sortableTableHeaderButtonVariants({ variant, active: isActive })
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
