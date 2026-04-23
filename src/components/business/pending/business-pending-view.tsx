"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { BusinessItem } from "@/components/business/business-table"
import {
  BusinessStatusTabs,
  type BusinessLifecycleStatus,
} from "./business-status-tabs"
import {
  BusinessReviewPanel,
  BusinessScriptPreview,
} from "./business-live-preview"
import {
  isBusinessCategoryKey,
  BUSINESS_CATEGORY_LABEL,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"
import { readPlannerDraftMeta, getDefaultMeetingTitle } from "@/lib/sundays"

interface BusinessPendingViewProps {
  items: BusinessItem[]
  onOpenItem?: (item: BusinessItem) => void
}

function lifecycleStatusFor(item: BusinessItem): BusinessLifecycleStatus {
  if (item.status === "completed") return "presented"
  if (item.action_date) return "scheduled"
  return "pending"
}

function getNextSundayIso(): string {
  const today = startOfDay(new Date())
  const dow = today.getDay()
  const offset = dow === 0 ? 7 : 7 - dow
  return format(addDays(today, offset), "yyyy-MM-dd")
}

function emptyGrouping(): Record<BusinessCategoryKey, BusinessItem[]> {
  return {
    sustaining: [],
    release: [],
    confirmation: [],
    ordination: [],
    other: [],
  }
}

function groupByCategory(
  items: BusinessItem[]
): Record<BusinessCategoryKey, BusinessItem[]> {
  const groups = emptyGrouping()
  for (const item of items) {
    if (isBusinessCategoryKey(item.category)) {
      groups[item.category].push(item)
    } else {
      groups.other.push(item)
    }
  }
  return groups
}

function itemSubtitle(item: BusinessItem): string {
  if (isBusinessCategoryKey(item.category)) {
    return item.position_calling?.trim() || BUSINESS_CATEGORY_LABEL[item.category as BusinessCategoryKey]
  }
  return item.position_calling?.trim() || item.category
}

function ScheduledMeetingCards({
  items,
  onOpenItem,
  onReschedule,
}: {
  items: BusinessItem[]
  onOpenItem?: (item: BusinessItem) => void
  onReschedule?: (item: BusinessItem) => void
}) {
  const draftMeta = useMemo(() => readPlannerDraftMeta(), [])

  // Group by action_date
  const byDate = useMemo(() => {
    const map = new Map<string, BusinessItem[]>()
    for (const item of items) {
      const date = item.action_date ?? "unknown"
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(item)
    }
    // Sort dates ascending
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  return (
    <div className="mt-5 space-y-4">
      {byDate.map(([isoDate, dateItems]) => {
        const meta = draftMeta[isoDate]
        const meetingTitle = meta?.title?.trim() || getDefaultMeetingTitle(meta?.specialType ?? "standard")
        const dateLabel = isoDate !== "unknown"
          ? format(new Date(`${isoDate}T12:00:00`), "EEEE, MMMM d, yyyy")
          : "Unknown date"

        return (
          <div key={isoDate} className="rounded-2xl border border-border/70 bg-surface-raised overflow-hidden shadow-[var(--shadow-builder-card)]">
            {/* Card header */}
            <div className="border-b border-border/70 px-6 py-5 sm:px-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Ward Business
                  </div>
                  <h2 className="mt-2 font-serif text-[30px] font-normal leading-none tracking-normal text-foreground">
                    {meetingTitle}
                  </h2>
                  <div className="mt-2 text-[13px] text-muted-foreground">{dateLabel}</div>
                </div>
                <span className="shrink-0 rounded-full border border-border/60 bg-surface-sunken px-2.5 py-1 text-[11.5px] font-medium text-muted-foreground">
                  {dateItems.length} item{dateItems.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            {/* Items list */}
            <div className="bg-surface-body px-5 py-5 sm:px-7 sm:py-6">
              <div className="space-y-2">
                {dateItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenItem?.(item)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border/60 bg-surface-raised px-3 py-2.5",
                      onOpenItem && "cursor-pointer transition-colors hover:border-border hover:bg-surface-hover"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-[14px] text-foreground">{item.person_name}</div>
                      <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{itemSubtitle(item)}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-border/60 bg-surface-sunken px-2 py-[3px] text-[10.5px] font-medium capitalize leading-none text-muted-foreground">
                      {item.category}
                    </span>
                    {onReschedule && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onReschedule(item) }}
                        className="h-7 shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 text-[11px] font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300 dark:hover:bg-amber-900"
                      >
                        Unschedule
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BusinessPendingView({ items, onOpenItem }: BusinessPendingViewProps) {
  const router = useRouter()
  const [active, setActive] = useState<BusinessLifecycleStatus>("pending")
  const [meetingDate, setMeetingDate] = useState<string>(getNextSundayIso())
  const [scheduling, setScheduling] = useState(false)
  const [scriptOverrides, setScriptOverrides] = useState<Record<BusinessCategoryKey, string | null>>({
    sustaining: null,
    release: null,
    confirmation: null,
    ordination: null,
    other: null,
  })
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  const byStatus = useMemo(() => {
    const map: Record<BusinessLifecycleStatus, BusinessItem[]> = {
      pending: [],
      scheduled: [],
      presented: [],
    }
    for (const item of items) {
      const status = lifecycleStatusFor(item)
      map[status].push(item)
    }
    return map
  }, [items])

  const activeItems = byStatus[active]

  const counts = useMemo(() => ({
    pending: byStatus.pending.length,
    scheduled: byStatus.scheduled.length,
    presented: byStatus.presented.length,
  }), [byStatus])

  // Auto-select all pending items when switching to pending view
  useEffect(() => {
    if (active === "pending") {
      setSelectedItemIds(new Set(activeItems.map(item => item.id)))
    }
  }, [active, activeItems])
  const grouped = useMemo(() => groupByCategory(activeItems), [activeItems])

  const handleScriptOverrideChange = useCallback(
    (category: BusinessCategoryKey, script: string | null) => {
      setScriptOverrides((prev) => ({ ...prev, [category]: script }))
    },
    []
  )

  const handleToggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedItemIds(new Set(activeItems.map(item => item.id)));
  }, [activeItems]);

  const handleDeselectAll = useCallback(() => {
    setSelectedItemIds(new Set());
  }, []);

  const handleReschedule = useCallback(async (item: BusinessItem) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_items") as any)
      .update({ action_date: null })
      .eq("id", item.id)
    if (error) {
      toast.error("Failed to unschedule item.")
    } else {
      toast.success(`${item.person_name} moved back to pending.`)
      router.refresh()
    }
  }, [router])

  const handleSchedule = useCallback(async () => {
    if (active !== "pending" || selectedItemIds.size === 0 || !meetingDate) return
    setScheduling(true)
    const supabase = createClient()

    // Get selected items
    const selectedItems = activeItems.filter(item => selectedItemIds.has(item.id));

    // Update each selected business item with action_date
    const updatePromises = selectedItems.map(async (item) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (supabase.from("business_items") as any)
        .update({ action_date: meetingDate })
        .eq("id", item.id)
    });

    const results = await Promise.all(updatePromises);
    const errors = results.filter(result => result.error);

    if (errors.length > 0) {
      toast.error(errors[0].error?.message || "Failed to schedule business items.")
    } else {
      const label = format(new Date(`${meetingDate}T12:00:00`), "MMM d, yyyy")
      toast.success(`${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} scheduled for ${label}`)
      setSelectedItemIds(new Set()); // Clear selection after successful scheduling
      router.refresh()
      setActive("scheduled")
    }
    setScheduling(false)
  }, [active, activeItems, selectedItemIds, meetingDate, router])

  const meetingDateLabel = meetingDate
    ? format(new Date(`${meetingDate}T12:00:00`), "EEE, MMM d, yyyy")
    : ""

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <BusinessStatusTabs active={active} counts={counts} onChange={setActive} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)] xl:gap-10">
        {/* Primary column */}
        <div className="min-w-0">
          <PendingHeader
            active={active}
            meetingDateLabel={meetingDateLabel}
            totalItems={activeItems.length}
          />

          {activeItems.length === 0 ? (
            <EmptyState status={active} />
          ) : active === "scheduled" ? (
            <ScheduledMeetingCards items={activeItems} onOpenItem={onOpenItem} onReschedule={handleReschedule} />
          ) : (
            <BusinessScriptPreview
              className="mt-5"
              items={activeItems}
              groupedByCategory={grouped}
              meetingDate={meetingDate}
              scriptOverrides={scriptOverrides}
              onScriptOverrideChange={handleScriptOverrideChange}
              selectedItemIds={selectedItemIds}
              onToggleItemSelection={handleToggleItemSelection}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          )}
        </div>

        {/* Secondary column */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <BusinessReviewPanel
            items={activeItems}
            groupedByCategory={grouped}
            meetingDate={meetingDate}
            onMeetingDateChange={setMeetingDate}
            activeStatus={active}
            onSchedule={handleSchedule}
            scheduling={scheduling}
            onOpenItem={onOpenItem}
            scriptOverrides={scriptOverrides}
            onScriptOverrideChange={handleScriptOverrideChange}
            selectedItemIds={selectedItemIds}
            onToggleItemSelection={handleToggleItemSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
          />
        </div>
      </div>
    </div>
  )
}

function PendingHeader({
  active,
  meetingDateLabel,
  totalItems,
}: {
  active: BusinessLifecycleStatus
  meetingDateLabel: string
  totalItems: number
}) {
  if (active === "pending") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-serif text-[17px] font-semibold text-foreground">
          Ready for presentation
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand)/0.08)] px-2.5 py-[5px] text-[11.5px] font-medium text-[hsl(var(--brand))]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[hsl(var(--brand))]" />
          {meetingDateLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <InfoDot />
          These items will auto-populate in the Program Planner
        </span>
      </div>
    )
  }

  if (active === "scheduled") {
    return (
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-[17px] font-semibold text-foreground">
          Scheduled for upcoming meetings
        </h2>
        <p className="text-[12px] text-muted-foreground">
          {totalItems} item{totalItems === 1 ? "" : "s"} ready to be presented &mdash; grouped by assigned meeting date.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <h2 className="font-serif text-[17px] font-semibold text-foreground">
        Presented
      </h2>
      <p className="text-[12px] text-muted-foreground">
        History of business items presented in past meetings.
      </p>
    </div>
  )
}

function InfoDot() {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border/80 text-[9px] leading-none text-muted-foreground"
      )}
    >
      i
    </span>
  )
}

function EmptyState({ status }: { status: BusinessLifecycleStatus }) {
  const label =
    status === "pending"
      ? "No pending business items yet. New items you create will appear here."
      : status === "scheduled"
        ? "Nothing is scheduled yet. Schedule pending items to queue them for a meeting."
        : "No business items have been presented yet."

  return (
    <div className="mt-8 rounded-2xl border border-dashed border-border/70 bg-surface-sunken/40 px-6 py-10 text-center text-[13px] text-muted-foreground">
      {label}
    </div>
  )
}
