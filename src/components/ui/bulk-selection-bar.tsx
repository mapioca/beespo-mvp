"use client"

import { Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface BulkSelectionBarProps {
  selectedCount: number
  onClear: () => void
  onDelete: () => void
  clearLabel?: string
  deleteLabel?: string
  isDeleting?: boolean
  className?: string
}

export function BulkSelectionBar({
  selectedCount,
  onClear,
  onDelete,
  clearLabel = "Deselect",
  deleteLabel = "Delete",
  isDeleting = false,
  className,
}: BulkSelectionBarProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900 px-3 py-2 text-white shadow-lg",
        "dark:border-zinc-200 dark:bg-zinc-100 dark:text-zinc-900",
        className
      )}
    >
      <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[length:var(--table-header-font-size)] font-semibold tabular-nums text-white dark:bg-zinc-900/10 dark:text-zinc-900">
        {selectedCount} selected
      </span>
      <span className="h-4 w-px bg-white/20 dark:bg-zinc-900/20" aria-hidden />
      <button
        onClick={onClear}
        className="rounded-full px-2.5 py-1 text-[length:var(--table-header-font-size)] font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 dark:text-zinc-900/80 dark:hover:bg-zinc-900/10 dark:hover:text-zinc-900 dark:focus-visible:ring-zinc-900/40 dark:focus-visible:ring-offset-zinc-100"
      >
        {clearLabel}
      </button>
      <button
        onClick={onDelete}
        disabled={isDeleting}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-300/40 bg-rose-500/15 px-2.5 py-1 text-[length:var(--table-header-font-size)] font-semibold text-rose-200 transition-colors hover:bg-rose-500/25 disabled:opacity-[var(--agenda-interactive-disabled-opacity)] dark:border-rose-400/40 dark:bg-rose-500/15 dark:text-rose-700 dark:hover:bg-rose-500/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300/60 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 dark:focus-visible:ring-rose-500/40 dark:focus-visible:ring-offset-zinc-100"
      >
        <Trash2 className="h-3 w-3 stroke-[1.7]" />
        {deleteLabel}
      </button>
    </div>
  )
}
