"use client"

import { useMemo } from "react"
import { CalendarDays, Orbit } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  BUSINESS_CATEGORY_LABEL,
  BUSINESS_CATEGORY_ORDER,
  BUSINESS_CATEGORY_PLURAL,
  describeOrdination,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"
import type { BusinessItem } from "@/components/business/business-table"

export type ProgramRenderMode = "combined" | "individual"

interface BusinessLivePreviewProps {
  items: BusinessItem[]
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>
  meetingDate: string
  onMeetingDateChange: (value: string) => void
  mode: ProgramRenderMode
  onModeChange: (value: ProgramRenderMode) => void
  onSchedule: () => void | Promise<void>
  scheduling?: boolean
  className?: string
}

function formatMeetingLabel(isoDate: string): string {
  if (!isoDate) return ""
  try {
    return format(new Date(`${isoDate}T12:00:00`), "MMM d")
  } catch {
    return isoDate
  }
}

function formatLongMeetingLabel(isoDate: string): string {
  if (!isoDate) return ""
  try {
    return format(new Date(`${isoDate}T12:00:00`), "EEE, MMM d")
  } catch {
    return isoDate
  }
}

function joinNames(names: string[]): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} & ${names[1]}`
  if (names.length === 3) return `${names[0]}, ${names[1]} & ${names[2]}`
  return `${names[0]}, ${names[1]} & ${names.length - 2} more`
}

function subtitleForIndividual(
  item: BusinessItem,
  key: BusinessCategoryKey
): string {
  if (key === "ordination") {
    const desc = describeOrdination(item)
    if (desc) return desc
  }
  const calling = item.position_calling?.trim() ?? ""
  const cat = BUSINESS_CATEGORY_LABEL[key]
  return calling ? `${calling} · ${cat}` : cat
}

interface PreviewRow {
  id: string
  title: string
  subtitle: string
  count: number
}

export function BusinessLivePreview({
  items,
  groupedByCategory,
  meetingDate,
  onMeetingDateChange,
  mode,
  onModeChange,
  onSchedule,
  scheduling,
  className,
}: BusinessLivePreviewProps) {
  const totalItems = items.length
  const shortDate = formatMeetingLabel(meetingDate)
  const longDate = formatLongMeetingLabel(meetingDate)

  const rows: PreviewRow[] = useMemo(() => {
    if (mode === "combined") {
      return BUSINESS_CATEGORY_ORDER.flatMap((key) => {
        const group = groupedByCategory[key] ?? []
        if (group.length === 0) return []
        return [
          {
            id: `cat-${key}`,
            title: BUSINESS_CATEGORY_PLURAL[key],
            subtitle: joinNames(group.map((i) => i.person_name)),
            count: group.length,
          },
        ]
      })
    }
    return BUSINESS_CATEGORY_ORDER.flatMap((key) => {
      const group = groupedByCategory[key] ?? []
      return group.map((item) => ({
        id: item.id,
        title: item.person_name,
        subtitle: subtitleForIndividual(item, key),
        count: 1,
      }))
    })
  }, [mode, groupedByCategory])

  return (
    <aside
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border/70 bg-surface-raised p-5 shadow-[var(--shadow-builder-card)]",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Live Preview
          </div>
          <div className="mt-2 font-serif text-[17px] font-semibold uppercase tracking-wide text-foreground">
            Ward Business
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {longDate || "Pick a meeting date"}
          </div>
        </div>
        <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-[hsl(var(--brand))]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand))]" />
          Conductor View
        </span>
      </div>

      {/* Agenda preview */}
      <ol className="flex flex-col gap-0">
        {rows.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            No items to preview.
          </li>
        ) : (
          rows.map((row, idx) => (
            <li
              key={row.id}
              className="flex items-start gap-2.5 border-b border-dashed border-[hsl(var(--border)/0.45)] py-2 last:border-b-0"
            >
              <span className="mt-[2px] min-w-[16px] text-right font-serif text-[12px] font-semibold text-muted-foreground tabular-nums">
                {idx + 1}.
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {row.title}
                  </span>
                  {mode === "combined" && row.count > 1 && (
                    <span className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-foreground px-[5px] text-[9.5px] font-semibold leading-none text-background">
                      {row.count}
                    </span>
                  )}
                </span>
                {row.subtitle && (
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {row.subtitle}
                  </span>
                )}
              </span>
            </li>
          ))
        )}
      </ol>

      {/* Show in program as */}
      <div className="space-y-2">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Show in program as
        </div>

        <ModeOption
          selected={mode === "combined"}
          onSelect={() => onModeChange("combined")}
          title="Combined script"
          titleBadge="(recommended)"
          description='Matches Program Planner "Business 7 items" card'
        />
        <ModeOption
          selected={mode === "individual"}
          onSelect={() => onModeChange("individual")}
          title="Individual items"
          description="List each person separately"
        />
      </div>

      {/* Schedule button */}
      <Button
        type="button"
        onClick={() => onSchedule()}
        disabled={scheduling || totalItems === 0}
        className="h-10 w-full gap-2 rounded-xl bg-[hsl(var(--brand))] text-[13.5px] font-medium text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand-active))] disabled:opacity-60"
      >
        <CalendarDays className="h-4 w-4" />
        {scheduling ? "Scheduling…" : "Schedule for meeting"}
      </Button>

      <div className="flex items-center justify-between gap-3">
        <label className="relative inline-flex items-center">
          <CalendarDays className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => onMeetingDateChange(e.target.value)}
            className="h-7 rounded-md border border-border/60 bg-background pl-7 pr-2 text-[11.5px] text-foreground outline-none focus-visible:border-[hsl(var(--brand))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]"
          />
        </label>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Orbit className="h-3.5 w-3.5 text-[hsl(var(--brand))]" />
          {totalItems} item{totalItems === 1 ? "" : "s"} will appear in {shortDate} agenda
        </span>
      </div>

      <p className="text-center text-[11px] leading-snug text-muted-foreground">
        Business items auto-generate scripts to avoid duplication &mdash; matches current logic.
      </p>
    </aside>
  )
}

function ModeOption({
  selected,
  onSelect,
  title,
  titleBadge,
  description,
}: {
  selected: boolean
  onSelect: () => void
  title: string
  titleBadge?: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-[hsl(var(--brand))] bg-[hsl(var(--brand)/0.06)]"
          : "border-border/70 bg-transparent hover:bg-surface-hover"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-[3px] flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-[hsl(var(--brand))]"
            : "border-border/80"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-colors",
            selected ? "bg-[hsl(var(--brand))]" : "bg-transparent"
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
          {title}
          {titleBadge && (
            <span className="font-normal text-muted-foreground">{titleBadge}</span>
          )}
        </span>
        <span className="mt-0.5 block text-[11.5px] text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  )
}
