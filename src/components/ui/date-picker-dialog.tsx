"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DatePickerDialogProps {
  /** Whether the dialog is open. */
  open: boolean
  /** Callback when open state changes. */
  onOpenChange: (open: boolean) => void
  /** Bold portion of the header, e.g. "date" in "Set **date**". */
  titleAccent?: string
  /** Full title prefix shown before the accent. Defaults to "Set". */
  titlePrefix?: string
  /** Descriptive text below the title. */
  description?: string
  /** Label for the save button. */
  saveLabel?: string
  /** The currently-persisted date (ISO yyyy-MM-dd). */
  value?: string
  /** Called with the ISO date string when the user clicks Save. */
  onSave: (iso: string) => void
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const

/** Get the number of days in a given month (0-indexed month). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Get the weekday index (0 = Sunday) of the 1st of a month. */
function startDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

/** Format a Date to ISO-like yyyy-MM-dd */
function toIso(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

/** Format month + year for caption, e.g. "April 2026". */
function formatCaption(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

/** Return { year, month } shifted by `offset` months from base. */
function shiftMonth(year: number, month: number, offset: number) {
  const d = new Date(year, month + offset, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/* ------------------------------------------------------------------ */
/*  Single-month grid                                                  */
/* ------------------------------------------------------------------ */

interface MonthGridProps {
  year: number
  month: number
  todayIso: string
  selectedIso: string
  onSelect: (iso: string) => void
}

function MonthGrid({ year, month, todayIso, selectedIso, onSelect }: MonthGridProps) {
  const totalDays = daysInMonth(year, month)
  const startDay = startDayOfMonth(year, month)

  // Build rows of 7 cells
  const cells: (number | null)[] = []
  for (let i = 0; i < startDay; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  // Pad trailing so we get full rows
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div className="flex flex-col gap-1">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="select-none py-1 text-xs font-medium text-muted-foreground"
          >
            {label}
          </span>
        ))}
      </div>

      {/* Day rows */}
      {rows.map((row, ri) => (
        <div key={ri} className="grid grid-cols-7 text-center">
          {row.map((day, ci) => {
            if (day === null) {
              return <span key={ci} className="h-8 w-8" />
            }

            const iso = toIso(year, month, day)
            const isToday = iso === todayIso
            const isSelected = iso === selectedIso
            const isWeekend = ci === 0 || ci === 6

            return (
              <button
                key={ci}
                type="button"
                onClick={() => onSelect(iso)}
                className={cn(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-normal transition-colors",
                  "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isWeekend && !isToday && !isSelected && "text-muted-foreground/60",
                  isToday && !isSelected && "bg-accent text-accent-foreground font-medium",
                  isSelected && "bg-primary text-primary-foreground font-medium",
                )}
              >
                {day}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  DatePickerDialog                                                   */
/* ------------------------------------------------------------------ */

export function DatePickerDialog({
  open,
  onOpenChange,
  titleAccent = "date",
  titlePrefix = "Set",
  description,
  saveLabel = "Save date",
  value,
  onSave,
}: DatePickerDialogProps) {
  const now = new Date()
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate())

  // Base month is what the LEFT calendar shows; the right shows base+1.
  const [baseYear, setBaseYear] = React.useState(now.getFullYear())
  const [baseMonth, setBaseMonth] = React.useState(now.getMonth())

  // Staged selection — committed only on Save.
  const [staged, setStaged] = React.useState(value ?? "")

  // Reset staged when dialog opens / value prop changes.
  React.useEffect(() => {
    if (open) {
      setStaged(value ?? "")
      // Reset calendar to today when opening fresh
      if (!value) {
        setBaseYear(now.getFullYear())
        setBaseMonth(now.getMonth())
      } else {
        // Navigate to the month of the existing value
        const [y, m] = value.split("-").map(Number)
        if (y && m) {
          setBaseYear(y)
          setBaseMonth(m - 1)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value])

  const right = shiftMonth(baseYear, baseMonth, 1)

  const goPrev = () => {
    const p = shiftMonth(baseYear, baseMonth, -1)
    setBaseYear(p.year)
    setBaseMonth(p.month)
  }

  const goNext = () => {
    const n = shiftMonth(baseYear, baseMonth, 1)
    setBaseYear(n.year)
    setBaseMonth(n.month)
  }

  const handleSave = () => {
    if (staged) {
      onSave(staged)
      onOpenChange(false)
    }
  }

  // Format the staged date for the input preview
  const formattedPreview = staged
    ? new Date(staged + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : ""

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] gap-0 p-0">
        <DialogHeader className="space-y-1 px-6 pt-5 pb-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {titlePrefix}{" "}
            <span className="font-bold">{titleAccent}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-[13px] leading-snug text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Selected date preview input */}
        <div className="px-6 pb-4">
          <div
            className={cn(
              "flex h-9 w-full items-center rounded-md border px-3 text-sm",
              staged
                ? "border-input text-foreground"
                : "border-input text-muted-foreground"
            )}
          >
            {formattedPreview || "\u00A0"}
          </div>
        </div>

        {/* Two-month calendar grid */}
        <div className="relative px-6 pb-4">
          {/* Navigation arrows — positioned at top-right of the calendar area */}
          <div className="absolute right-6 top-0 z-10 flex items-center gap-1">
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Left month */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {formatCaption(baseYear, baseMonth)}
              </p>
              <MonthGrid
                year={baseYear}
                month={baseMonth}
                todayIso={todayIso}
                selectedIso={staged}
                onSelect={setStaged}
              />
            </div>

            {/* Right month */}
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                {formatCaption(right.year, right.month)}
              </p>
              <MonthGrid
                year={right.year}
                month={right.month}
                todayIso={todayIso}
                selectedIso={staged}
                onSelect={setStaged}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 border-t px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded-full px-3 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!staged}
            onClick={handleSave}
            className="h-8 rounded-full px-3 text-xs"
          >
            {saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
