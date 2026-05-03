"use client"

import * as React from "react"
import { PickerModal } from "@/components/ui/picker-modal"
import {
  getUpcomingSundays,
  getUpcomingDateParts,
  getUpcomingMeetingKind,
  getDefaultMeetingTitle,
  readPlannerDraftMeta,
  type PlannerDraftMeetingMeta,
} from "@/lib/sundays"
import { cn } from "@/lib/utils"

interface SundayPickerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value?: string
  onSelect: (isoDate: string) => void
  count?: number
}

export function SundayPickerModal({
  open,
  onOpenChange,
  value,
  onSelect,
  count = 26,
}: SundayPickerModalProps) {
  const [query, setQuery] = React.useState("")
  const [draftMeta, setDraftMeta] = React.useState<Record<string, PlannerDraftMeetingMeta>>({})

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setDraftMeta(readPlannerDraftMeta())
    }
  }, [open])

  const sundays = React.useMemo(() => getUpcomingSundays(count), [count])

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sundays
    return sundays.filter(
      (s) =>
        s.dateLabel.toLowerCase().includes(needle) ||
        s.dayLabel.toLowerCase().includes(needle)
    )
  }, [sundays, query])

  return (
    <PickerModal
      open={open}
      onOpenChange={onOpenChange}
      title="Select Sunday"
      searchSlot={
        <input
          className="w-full bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="Search by date..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      }
    >
      {filtered.map((sunday) => {
        const dateParts = getUpcomingDateParts(sunday.isoDate)
        const meta = draftMeta[sunday.isoDate]
        const specialType = meta?.specialType ?? "standard"
        const kind = getUpcomingMeetingKind(specialType)
        const title = meta?.title?.trim() || getDefaultMeetingTitle(specialType)
        const isSelected = sunday.isoDate === value

        return (
          <button
            key={sunday.isoDate}
            type="button"
            onClick={() => {
              onSelect(sunday.isoDate)
              onOpenChange(false)
            }}
            className={cn(
              "grid grid-cols-[48px_1fr] items-center gap-3 w-full px-[18px] py-2.5 text-left transition-colors hover:bg-surface-hover",
              isSelected && "bg-surface-active"
            )}
          >
            <div
              className={cn(
                "rounded-lg border border-border/70 py-1 text-center",
                isSelected ? "bg-background" : "bg-surface-sunken"
              )}
            >
              <div className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {dateParts.month}
              </div>
              <div className="mt-0.5 font-serif text-[17px] leading-none text-foreground">
                {dateParts.day}
              </div>
            </div>

            <div className="min-w-0">
              <div className="truncate font-serif text-[14px] italic text-foreground">
                {title}
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-[1px] text-[10px] font-medium uppercase tracking-[0.04em]",
                    kind.className
                  )}
                >
                  {kind.label}
                </span>
              </div>
            </div>
          </button>
        )
      })}

      {filtered.length === 0 && (
        <div className="px-5 py-8 text-center text-[13px] text-muted-foreground">
          No Sundays match.
        </div>
      )}
    </PickerModal>
  )
}
