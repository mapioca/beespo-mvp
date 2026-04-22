"use client"

import { useCallback, useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { createClient } from "@/lib/supabase/client"
import type { BusinessItem } from "@/components/business/business-table"
import {
  BusinessStatusTabs,
  type BusinessLifecycleStatus,
} from "./business-status-tabs"
import { BusinessCategorySection } from "./business-category-section"
import { BusinessPersonCard } from "./business-person-card"
import {
  BusinessLivePreview,
  type ProgramRenderMode,
} from "./business-live-preview"
import {
  BUSINESS_CATEGORY_ORDER,
  isBusinessCategoryKey,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"

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

export function BusinessPendingView({ items, onOpenItem }: BusinessPendingViewProps) {
  const router = useRouter()
  const [active, setActive] = useState<BusinessLifecycleStatus>("pending")
  const [meetingDate, setMeetingDate] = useState<string>(getNextSundayIso())
  const [mode, setMode] = useState<ProgramRenderMode>("combined")
  const [scheduling, setScheduling] = useState(false)

  const byStatus = useMemo(() => {
    const map: Record<BusinessLifecycleStatus, BusinessItem[]> = {
      pending: [],
      scheduled: [],
      presented: [],
    }
    for (const item of items) {
      map[lifecycleStatusFor(item)].push(item)
    }
    return map
  }, [items])

  const counts = useMemo(
    () => ({
      pending: byStatus.pending.length,
      scheduled: byStatus.scheduled.length,
      presented: byStatus.presented.length,
    }),
    [byStatus]
  )

  const activeItems = byStatus[active]
  const grouped = useMemo(() => groupByCategory(activeItems), [activeItems])

  const handleSchedule = useCallback(async () => {
    if (active !== "pending" || activeItems.length === 0 || !meetingDate) return
    setScheduling(true)
    const supabase = createClient()
    const ids = activeItems.map((i) => i.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_items") as any)
      .update({ action_date: meetingDate })
      .in("id", ids)

    if (error) {
      toast.error(error.message || "Failed to schedule business items.")
    } else {
      const label = format(new Date(`${meetingDate}T12:00:00`), "MMM d, yyyy")
      toast.success(`${ids.length} item${ids.length === 1 ? "" : "s"} scheduled for ${label}`)
      router.refresh()
      setActive("scheduled")
    }
    setScheduling(false)
  }, [active, activeItems, meetingDate, router])

  const meetingDateLabel = meetingDate
    ? format(new Date(`${meetingDate}T12:00:00`), "EEE, MMM d, yyyy")
    : ""

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <BusinessStatusTabs active={active} counts={counts} onChange={setActive} />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
        {/* Left column */}
        <div className="min-w-0">
          <PendingHeader
            active={active}
            meetingDateLabel={meetingDateLabel}
            totalItems={activeItems.length}
          />

          {activeItems.length === 0 ? (
            <EmptyState status={active} />
          ) : (
            <div className="mt-5 flex flex-col gap-6">
              {BUSINESS_CATEGORY_ORDER.map((key) => {
                const group = grouped[key]
                if (group.length === 0) return null
                return (
                  <BusinessCategorySection
                    key={key}
                    category={key}
                    items={group}
                    scriptFormat={mode}
                    onOpenItem={onOpenItem}
                  />
                )
              })}

              {mode === "individual" && (
                <section className="flex flex-col gap-2">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    All items
                  </div>
                  {activeItems.map((item) => (
                    <BusinessPersonCard
                      key={item.id}
                      name={item.person_name}
                      subtitle={item.position_calling}
                      category={
                        isBusinessCategoryKey(item.category)
                          ? item.category
                          : "other"
                      }
                      onOpen={onOpenItem ? () => onOpenItem(item) : undefined}
                    />
                  ))}
                </section>
              )}
            </div>
          )}
        </div>

        {/* Right column — Live Preview */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <BusinessLivePreview
            items={activeItems}
            groupedByCategory={grouped}
            meetingDate={meetingDate}
            onMeetingDateChange={setMeetingDate}
            mode={mode}
            onModeChange={setMode}
            onSchedule={handleSchedule}
            scheduling={scheduling}
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
