"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { addDays, format, startOfDay } from "date-fns"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { toast } from "@/lib/toast"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { BusinessItem } from "@/components/business/business-table"
import type { ConductScriptKey, ConductScriptTemplateMap } from "@/lib/conduct-script-templates"
import {
  BusinessStatusTabs,
  type BusinessLifecycleStatus,
} from "./business-status-tabs"
import {
  BusinessReviewPanel,
  BusinessScriptPreview,
} from "./business-live-preview"
import { BusinessMeetingAssignmentCard } from "./business-meeting-assignment-card"
import {
  isBusinessCategoryKey,
  BUSINESS_CATEGORY_LABEL,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"
import { resolveBusinessMeetingScripts } from "@/lib/business/meeting-scripts"
import { readPlannerDraftMeta, getDefaultMeetingTitle } from "@/lib/sundays"

interface BusinessPendingViewProps {
  items: BusinessItem[]
  workspaceId: string
  userId: string
  language: "ENG" | "SPA"
  onOpenItem?: (item: BusinessItem) => void
}

type BusinessMeetingScriptRow = {
  script_key: ConductScriptKey
  template_snapshot: string
  rendered_script: string
  is_custom: boolean
  business_item_ids: string[]
}

function lifecycleStatusFor(item: BusinessItem): BusinessLifecycleStatus {
  if (item.status === "completed") return "presented"
  if (item.action_date) return "scheduled"
  return "pending"
}

function isPastDueDate(date: string | null | undefined): boolean {
  if (!date) return false
  return date < format(new Date(), "yyyy-MM-dd")
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
    ordination: [],
    confirmation_ordinance: [],
    new_member_welcome: [],
    child_blessing: [],
    records_received: [],
    miscellaneous: [],
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
      groups.miscellaneous.push(item)
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
        const isPastDue = isoDate !== "unknown" && isPastDueDate(isoDate)

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
                {isPastDue ? (
                  <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11.5px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                    Past due
                  </span>
                ) : null}
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

export function BusinessPendingView({
  items,
  workspaceId,
  userId,
  language,
  onOpenItem,
}: BusinessPendingViewProps) {
  const router = useRouter()
  const [active, setActive] = useState<BusinessLifecycleStatus>("pending")
  const [meetingDate, setMeetingDate] = useState<string>(getNextSundayIso())
  const [scheduling, setScheduling] = useState(false)
  const [unschedulingItemId, setUnschedulingItemId] = useState<string | null>(null)
  const [scriptTemplates, setScriptTemplates] = useState<ConductScriptTemplateMap>({})
  const [meetingScriptsByDate, setMeetingScriptsByDate] = useState<Record<string, Record<string, BusinessMeetingScriptRow>>>({})
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

  // Auto-select all items when switching to pending or scheduled view
  useEffect(() => {
    if (active === "pending" || active === "scheduled") {
      setSelectedItemIds(new Set(activeItems.map(item => item.id)))
    }
  }, [active, activeItems])
  
  const grouped = useMemo(() => groupByCategory(activeItems), [activeItems])

  // Group scheduled items by date for the Schedule tab
  const byDate = useMemo(() => {
    if (active !== "scheduled") return []
    const map = new Map<string, BusinessItem[]>()
    for (const item of activeItems) {
      const date = item.action_date ?? "unknown"
      if (!map.has(date)) map.set(date, [])
      map.get(date)!.push(item)
    }
    // Sort dates ascending
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [active, activeItems])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("conduct_script_templates") as any)
        .select("script_key, template")
        .eq("workspace_id", workspaceId)
        .eq("language", language)

      if (cancelled || error) return

      const nextTemplates: ConductScriptTemplateMap = {}
      for (const row of (data ?? []) as Array<{ script_key: ConductScriptKey; template: string }>) {
        nextTemplates[row.script_key] = row.template
      }
      setScriptTemplates(nextTemplates)
    })()

    return () => {
      cancelled = true
    }
  }, [language, workspaceId])

  useEffect(() => {
    const scheduledDates = Array.from(
      new Set(
        byStatus.scheduled
          .map((item) => item.action_date)
          .filter((value): value is string => Boolean(value))
      )
    )

    if (scheduledDates.length === 0) {
      setMeetingScriptsByDate({})
      return
    }

    let cancelled = false
    const supabase = createClient()

    void (async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from("business_meeting_scripts") as any)
        .select("meeting_date, script_key, template_snapshot, rendered_script, is_custom, business_item_ids")
        .eq("workspace_id", workspaceId)
        .in("meeting_date", scheduledDates)

      if (cancelled || error) return

      const nextRows: Record<string, Record<string, BusinessMeetingScriptRow>> = {}
      for (const row of (data ?? []) as Array<BusinessMeetingScriptRow & { meeting_date: string }>) {
        nextRows[row.meeting_date] ??= {}
        nextRows[row.meeting_date][row.script_key] = row
      }
      setMeetingScriptsByDate(nextRows)
    })()

    return () => {
      cancelled = true
    }
  }, [byStatus.scheduled, workspaceId])

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

  const syncMeetingScriptsForDate = useCallback(async (date: string, scheduledItemsForDate: BusinessItem[]) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scriptsTable = supabase.from("business_meeting_scripts") as any

    await scriptsTable
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("meeting_date", date)

    if (scheduledItemsForDate.length === 0) {
      setMeetingScriptsByDate((prev) => {
        const next = { ...prev }
        delete next[date]
        return next
      })
      return
    }

    const resolvedScripts = resolveBusinessMeetingScripts(
      scheduledItemsForDate,
      language,
      scriptTemplates
    )

    const rows = resolvedScripts.map((script) => ({
      workspace_id: workspaceId,
      meeting_date: date,
      script_key: script.scriptKey,
      template_snapshot: script.templateSnapshot,
      rendered_script: script.renderedScript,
      business_item_ids: script.businessItemIds,
      is_custom: false,
      created_by: userId,
      updated_by: userId,
    }))

    const { error } = await scriptsTable.upsert(rows, { onConflict: "workspace_id,meeting_date,script_key" })
    if (error) throw error

    setMeetingScriptsByDate((prev) => ({
      ...prev,
      [date]: Object.fromEntries(
        rows.map((row) => [
          row.script_key,
          {
            script_key: row.script_key,
            template_snapshot: row.template_snapshot,
            rendered_script: row.rendered_script,
            is_custom: row.is_custom,
            business_item_ids: row.business_item_ids,
          },
        ])
      ),
    }))
  }, [language, scriptTemplates, userId, workspaceId])

  const handleUnschedule = useCallback(async (item: BusinessItem) => {
    setUnschedulingItemId(item.id)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_items") as any)
        .update({ action_date: null, status: "pending" })
        .eq("id", item.id)
    if (error) {
      toast.error(error.message || "Failed to move item back to pending.")
    } else {
      if (item.action_date) {
        try {
          const remainingItems = items.filter(
            (candidate) => candidate.action_date === item.action_date && candidate.id !== item.id
          )
          await syncMeetingScriptsForDate(item.action_date, remainingItems)
        } catch (syncError) {
          console.error(syncError)
          toast.warning("Business item was unscheduled, but meeting scripts could not be refreshed.")
        }
      }
      toast.success(`${item.person_name} moved back to pending.`)
      router.refresh()
    }
    setUnschedulingItemId(null)
  }, [items, router, syncMeetingScriptsForDate]);

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
      try {
        const existingScheduledItems = items.filter((item) => item.action_date === meetingDate)
        await syncMeetingScriptsForDate(meetingDate, [...existingScheduledItems, ...selectedItems])
      } catch (syncError) {
        console.error(syncError)
        toast.warning("Business items were scheduled, but meeting scripts could not be synced.")
      }
      const label = format(new Date(`${meetingDate}T12:00:00`), "MMM d, yyyy")
      toast.success(`${selectedItems.length} item${selectedItems.length === 1 ? "" : "s"} scheduled for ${label}`)
      setSelectedItemIds(new Set()); // Clear selection after successful scheduling
      router.refresh()
      setActive("scheduled")
    }
    setScheduling(false)
  }, [active, activeItems, items, meetingDate, router, selectedItemIds, syncMeetingScriptsForDate])

  const handleSaveMeetingScript = useCallback(async (
    date: string,
    scriptKey: ConductScriptKey,
    templateSnapshot: string,
    renderedScript: string,
    businessItemIds: string[]
  ) => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_meeting_scripts") as any)
      .upsert(
        {
          workspace_id: workspaceId,
          meeting_date: date,
          script_key: scriptKey,
          template_snapshot: templateSnapshot,
          rendered_script: renderedScript,
          business_item_ids: businessItemIds,
          is_custom: true,
          created_by: userId,
          updated_by: userId,
        },
        { onConflict: "workspace_id,meeting_date,script_key" }
      )

    if (error) {
      toast.error(error.message || "Failed to save meeting script.")
      return
    }

    setMeetingScriptsByDate((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] ?? {}),
        [scriptKey]: {
          script_key: scriptKey,
          template_snapshot: templateSnapshot,
          rendered_script: renderedScript,
          is_custom: true,
          business_item_ids: businessItemIds,
        },
      },
    }))
    toast.success("Meeting script saved.")
  }, [userId, workspaceId])

  const handleResetMeetingScript = useCallback(async (
    date: string,
    scriptKey: ConductScriptKey,
    businessItemIds: string[]
  ) => {
    const scheduledItemsForDate = items.filter((item) => item.action_date === date)
    const targetItems = scheduledItemsForDate.filter((item) => businessItemIds.includes(item.id))
    const [resolved] = resolveBusinessMeetingScripts(targetItems, language, scriptTemplates)
    if (!resolved || resolved.scriptKey !== scriptKey) return

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("business_meeting_scripts") as any)
      .upsert(
        {
          workspace_id: workspaceId,
          meeting_date: date,
          script_key: scriptKey,
          template_snapshot: resolved.templateSnapshot,
          rendered_script: resolved.renderedScript,
          business_item_ids: resolved.businessItemIds,
          is_custom: false,
          created_by: userId,
          updated_by: userId,
        },
        { onConflict: "workspace_id,meeting_date,script_key" }
      )

    if (error) {
      toast.error(error.message || "Failed to reset meeting script.")
      return
    }

    setMeetingScriptsByDate((prev) => ({
      ...prev,
      [date]: {
        ...(prev[date] ?? {}),
        [scriptKey]: {
          script_key: scriptKey,
          template_snapshot: resolved.templateSnapshot,
          rendered_script: resolved.renderedScript,
          is_custom: false,
          business_item_ids: resolved.businessItemIds,
        },
      },
    }))
    toast.success("Meeting script reset.")
  }, [items, language, scriptTemplates, userId, workspaceId])

  const handleRescheduleGroup = useCallback(async (fromDate: string, toDate: string) => {
    if (fromDate === toDate) return

    const sourceItems = items.filter((item) => item.action_date === fromDate && item.status !== "completed")
    if (sourceItems.length === 0) return

    const sourceResolvedScripts = resolveBusinessMeetingScripts(sourceItems, language, scriptTemplates)
    const destinationItems = items.filter((item) => item.action_date === toDate && item.status !== "completed")

    const supabase = createClient()
    const sourceMeetingScripts = meetingScriptsByDate[fromDate] ?? {}
    const destinationMeetingScripts = meetingScriptsByDate[toDate] ?? {}

    const updateResults = await Promise.all(
      sourceItems.map(async (item) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase.from("business_items") as any)
          .update({ action_date: toDate })
          .eq("id", item.id)
      )
    )

    const updateError = updateResults.find((result) => result.error)?.error
    if (updateError) {
      toast.error(updateError.message || "Failed to reschedule business items.")
      return
    }

    const combinedDestinationItems = [...destinationItems, ...sourceItems.map((item) => ({ ...item, action_date: toDate }))]
    const combinedResolvedScripts = resolveBusinessMeetingScripts(
      combinedDestinationItems,
      language,
      scriptTemplates
    )

    const rowsToUpsert = combinedResolvedScripts.map((script) => {
      const sourcePersisted = sourceMeetingScripts[script.scriptKey]
      const destinationPersisted = destinationMeetingScripts[script.scriptKey]

      if (
        destinationPersisted?.is_custom &&
        JSON.stringify([...(destinationPersisted.business_item_ids ?? [])].sort()) ===
          JSON.stringify([...script.businessItemIds].sort())
      ) {
        return {
          workspace_id: workspaceId,
          meeting_date: toDate,
          script_key: script.scriptKey,
          template_snapshot: destinationPersisted.template_snapshot,
          rendered_script: destinationPersisted.rendered_script,
          business_item_ids: destinationPersisted.business_item_ids,
          is_custom: true,
          created_by: userId,
          updated_by: userId,
        }
      }

      if (
        sourcePersisted?.is_custom &&
        JSON.stringify([...(sourcePersisted.business_item_ids ?? [])].sort()) ===
          JSON.stringify([...script.businessItemIds].sort())
      ) {
        return {
          workspace_id: workspaceId,
          meeting_date: toDate,
          script_key: script.scriptKey,
          template_snapshot: sourcePersisted.template_snapshot,
          rendered_script: sourcePersisted.rendered_script,
          business_item_ids: sourcePersisted.business_item_ids,
          is_custom: true,
          created_by: userId,
          updated_by: userId,
        }
      }

      return {
        workspace_id: workspaceId,
        meeting_date: toDate,
        script_key: script.scriptKey,
        template_snapshot: script.templateSnapshot,
        rendered_script: script.renderedScript,
        business_item_ids: script.businessItemIds,
        is_custom: false,
        created_by: userId,
        updated_by: userId,
      }
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase.from("business_meeting_scripts") as any)
      .upsert(rowsToUpsert, { onConflict: "workspace_id,meeting_date,script_key" })

    if (upsertError) {
      toast.error(upsertError.message || "Business items were moved, but scripts could not be preserved.")
      router.refresh()
      return
    }

    const sourceScriptKeys = sourceResolvedScripts.map((script) => script.scriptKey)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase.from("business_meeting_scripts") as any)
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("meeting_date", fromDate)
      .in("script_key", sourceScriptKeys)

    if (deleteError) {
      toast.warning("Business items were rescheduled and scripts preserved, but the old meeting scripts could not be cleaned up.")
      router.refresh()
      return
    }

    setMeetingScriptsByDate((prev) => {
      const next = { ...prev }
      delete next[fromDate]
      next[toDate] = {
        ...Object.fromEntries(
          Object.entries(next[toDate] ?? {}).filter(([scriptKey]) => !sourceScriptKeys.includes(scriptKey as ConductScriptKey))
        ),
        ...Object.fromEntries(
          rowsToUpsert.map((row) => [
            row.script_key,
            {
              script_key: row.script_key,
              template_snapshot: row.template_snapshot,
              rendered_script: row.rendered_script,
              is_custom: row.is_custom,
              business_item_ids: row.business_item_ids,
            },
          ])
        ),
      }
      return next
    })

    toast.success(`Moved ${sourceItems.length} unresolved item${sourceItems.length === 1 ? "" : "s"} to ${format(new Date(`${toDate}T12:00:00`), "MMM d, yyyy")}. Matching script groups were updated.`)
    router.refresh()
  }, [items, language, meetingScriptsByDate, router, scriptTemplates, userId, workspaceId])
return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
      <BusinessStatusTabs active={active} counts={counts} onChange={setActive} />

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)] xl:gap-10">
        {/* Primary column */}
        <div className="min-w-0">
          {activeItems.length === 0 ? (
            <EmptyState status={active} />
          ) : active === "pending" ? (
            <BusinessMeetingAssignmentCard
              meetingDate={meetingDate}
              items={activeItems}
              onOpenItem={onOpenItem}
            />
          ) : active === "scheduled" ? (
            <div className="space-y-6">
              {byDate.map(([isoDate, dateItems]) => {
                const dateGrouped = groupByCategory(dateItems)
                return (
                  <BusinessScriptPreview
                    key={isoDate}
                    items={dateItems}
                    groupedByCategory={dateGrouped}
                    meetingDate={isoDate}
                    language={language}
                    scriptTemplates={scriptTemplates}
                    meetingScripts={meetingScriptsByDate[isoDate]}
                    onSaveMeetingScript={(scriptKey, templateSnapshot, renderedScript, businessItemIds) =>
                      handleSaveMeetingScript(isoDate, scriptKey, templateSnapshot, renderedScript, businessItemIds)
                    }
                    onResetMeetingScript={(scriptKey, businessItemIds) =>
                      handleResetMeetingScript(isoDate, scriptKey, businessItemIds)
                    }
                  />
                )
              })}
            </div>
          ) : (
            <ScheduledMeetingCards items={activeItems} onOpenItem={onOpenItem} />
          )}
        </div>

        {/* Secondary column */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <BusinessReviewPanel
            items={activeItems}
            groupedByCategory={grouped}
            language={language}
            meetingDate={meetingDate}
            onMeetingDateChange={setMeetingDate}
            activeStatus={active}
            onSchedule={handleSchedule}
            scheduling={scheduling}
            onOpenItem={onOpenItem}
            selectedItemIds={selectedItemIds}
            onToggleItemSelection={handleToggleItemSelection}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onUnscheduleItem={active === "scheduled" ? handleUnschedule : undefined}
            onRescheduleGroup={active === "scheduled" ? handleRescheduleGroup : undefined}
            unschedulingItemId={unschedulingItemId}
          />
        </div>
      </div>
    </div>
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
