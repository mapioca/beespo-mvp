"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, CalendarDays, CheckCircle2, Orbit, Wrench, Pencil, Check, RotateCcw } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SundayPickerModal } from "@/components/ui/sunday-picker-modal"
import {
  BUSINESS_CATEGORY_LABEL,
  BUSINESS_CATEGORY_ORDER,
  BUSINESS_CATEGORY_PLURAL,
  describeOrdination,
  generateCombinedBusinessScript,
  type BusinessCategoryKey,
} from "@/lib/business/combined-script"
import { validateBusinessItemDetails } from "@/lib/business-script-generator"
import { scriptToTemplate, templateToScript, type ScriptVariable } from "@/lib/business/script-template"
import type { BusinessLifecycleStatus } from "./business-status-tabs"
import type { BusinessItem } from "@/components/business/business-table"
import { BusinessScriptEditor } from "./business-script-editor"

interface BusinessScriptPreviewProps {
  items: BusinessItem[]
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>
  meetingDate: string
  scriptOverrides?: Record<BusinessCategoryKey, string | null>
  onScriptOverrideChange?: (category: BusinessCategoryKey, script: string | null) => void
  selectedItemIds?: Set<string>
  onToggleItemSelection?: (itemId: string) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  className?: string
}

interface BusinessReviewPanelProps {
  items: BusinessItem[]
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>
  meetingDate: string
  onMeetingDateChange: (value: string) => void
  activeStatus: BusinessLifecycleStatus
  onSchedule: () => void | Promise<void>
  scheduling?: boolean
  onOpenItem?: (item: BusinessItem) => void
  selectedItemIds?: Set<string>
  onToggleItemSelection?: (itemId: string) => void
  onSelectAll?: () => void
  onDeselectAll?: () => void
  onUnscheduleItem?: (item: BusinessItem) => void | Promise<void>
  unschedulingItemId?: string | null
  className?: string
}

type ScriptSection = {
  key: BusinessCategoryKey
  title: string
  items: BusinessItem[]
  script: string
  issues: string[]
  unresolvedPlaceholders: string[]
}

type ActionIssue = {
  id: string
  item: BusinessItem
  issue: string
  category: BusinessCategoryKey
}

type ScheduledDateGroup = {
  date: string
  items: BusinessItem[]
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>
}

const PLACEHOLDER_PATTERN = /\[[^\]]+]|\{\{[^}]+}}/g
const CONDUCTING_CUES = new Set([
  "[Pause]",
  "[Pause for voting]",
  "[Pausa para la votación]",
])

function formatLongMeetingLabel(isoDate: string): string {
  if (!isoDate) return ""
  try {
    return format(new Date(`${isoDate}T12:00:00`), "EEEE, MMMM d, yyyy")
  } catch {
    return isoDate
  }
}

function formatShortMeetingLabel(isoDate: string): string {
  if (!isoDate) return ""
  try {
    return format(new Date(`${isoDate}T12:00:00`), "MMM d")
  } catch {
    return isoDate
  }
}

function formatCompactMeetingLabel(isoDate: string): string {
  if (!isoDate || isoDate === "unknown") return "Unassigned date"
  try {
    return format(new Date(`${isoDate}T12:00:00`), "EEE, MMM d")
  } catch {
    return isoDate
  }
}

function itemSubtitle(item: BusinessItem, category: BusinessCategoryKey): string {
  if (category === "ordination") {
    const ordination = describeOrdination(item)
    if (ordination) return ordination
  }

  return item.position_calling?.trim() || BUSINESS_CATEGORY_LABEL[category]
}

function itemIssues(item: BusinessItem): string[] {
  const validation = validateBusinessItemDetails(
    item.category,
    item.position_calling,
    item.details
  )
  return validation.errors
}

function unresolvedPlaceholdersFor(script: string): string[] {
  const matches = script.match(PLACEHOLDER_PATTERN) ?? []
  return Array.from(new Set(matches.filter((match) => !CONDUCTING_CUES.has(match))))
}

function buildActionIssues(
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>
): ActionIssue[] {
  return BUSINESS_CATEGORY_ORDER.flatMap((key) => {
    const group = groupedByCategory[key] ?? []
    return group.flatMap((item) =>
      itemIssues(item).map((issue) => ({
        id: `${item.id}-${issue}`,
        item,
        issue,
        category: key,
      }))
    )
  })
}

function buildScriptSections(
  groupedByCategory: Record<BusinessCategoryKey, BusinessItem[]>,
  selectedItemIds?: Set<string>
): ScriptSection[] {
  return BUSINESS_CATEGORY_ORDER.flatMap((key) => {
    const group = groupedByCategory[key] ?? []
    const filteredGroup = selectedItemIds 
      ? group.filter(item => selectedItemIds.has(item.id))
      : group
    
    if (filteredGroup.length === 0) return []

    // Generate combined script for selected items in this category
    const script = generateCombinedBusinessScript(key, filteredGroup)

    const issues = filteredGroup.flatMap((item) =>
      itemIssues(item).map((issue) => `${item.person_name}: ${issue}`)
    )
    const unresolvedPlaceholders = unresolvedPlaceholdersFor(script)

    return [
      {
        key,
        title: BUSINESS_CATEGORY_PLURAL[key],
        items: filteredGroup,
        script,
        issues,
        unresolvedPlaceholders,
      },
    ]
  })
}

function emptyCategoryGrouping(): Record<BusinessCategoryKey, BusinessItem[]> {
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

function groupScheduledItemsByDate(items: BusinessItem[]): ScheduledDateGroup[] {
  const map = new Map<string, ScheduledDateGroup>()

  for (const item of items) {
    const date = item.action_date ?? "unknown"
    if (!map.has(date)) {
      map.set(date, {
        date,
        items: [],
        groupedByCategory: emptyCategoryGrouping(),
      })
    }

    const group = map.get(date)!
    const category = BUSINESS_CATEGORY_ORDER.includes(item.category as BusinessCategoryKey)
      ? item.category as BusinessCategoryKey
      : "miscellaneous"

    group.items.push(item)
    group.groupedByCategory[category].push(item)
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function readinessFor(item: BusinessItem) {
  const issues = itemIssues(item)
  if (issues.length > 0) {
    return {
      label: "Needs info",
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    }
  }

  if (item.details?.customText?.trim() || item.details?.customScript?.trim()) {
    return {
      label: "Custom",
      className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
    }
  }

  return {
    label: "Ready",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  }
}

interface EditableScriptSectionProps {
  section: ScriptSection
  scriptOverride?: string | null
  onScriptOverrideChange?: (script: string | null) => void
}

function EditableScriptSection({
  section,
  scriptOverride,
  onScriptOverrideChange,
}: EditableScriptSectionProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [variables, setVariables] = useState<ScriptVariable[]>([])
  const [hasValidationErrors, setHasValidationErrors] = useState(false)

  const activeScript = scriptOverride && scriptOverride.trim().length > 0 ? scriptOverride : section.script

  const handleEditStart = () => {
    const { template, variables: vars } = scriptToTemplate(activeScript, section.items)
    setDraft(template)
    setVariables(vars)
    setEditing(true)
  }

  const handleSave = () => {
    const renderedScript = templateToScript(draft, variables)
    const trimmed = renderedScript.trim()
    if (trimmed === section.script.trim() || trimmed.length === 0) {
      onScriptOverrideChange?.(null)
    } else {
      onScriptOverrideChange?.(trimmed)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft(activeScript)
    setEditing(false)
  }

  const handleResetToGenerated = () => {
    const { template, variables: vars } = scriptToTemplate(section.script, section.items)
    setDraft(template)
    setVariables(vars)
    onScriptOverrideChange?.(null)
  }

  return (
    <section className="rounded-xl border border-border/60 bg-surface-raised px-5 py-5 shadow-[var(--shadow-builder-card)]">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <h3 className="font-serif text-[20px] font-semibold text-foreground">
          {section.title}
        </h3>
        <span className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-foreground px-1.5 text-[10.5px] font-semibold leading-none text-background">
          {section.items.length}
        </span>
        {section.unresolvedPlaceholders.length > 0 || section.issues.length > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Review needed
          </span>
        ) : editing && hasValidationErrors ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" />
            Requires attention
          </span>
        ) : !editing && onScriptOverrideChange ? (
          <button
            type="button"
            onClick={handleEditStart}
            className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-[hsl(var(--brand))] transition-colors hover:text-[hsl(var(--brand-active))]"
          >
            <Pencil className="h-3 w-3 stroke-[1.8]" />
            Edit script
          </button>
        ) : null}
      </div>

      <div className="mb-4 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
        <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Shared script covers
        </div>
        <div className="space-y-1.5">
          {section.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 text-[12px]">
              <span className="truncate font-medium text-foreground">{item.person_name}</span>
              <span className="truncate text-right text-muted-foreground">
                {itemSubtitle(item, section.key)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <BusinessScriptEditor
            value={draft}
            variables={variables}
            onChange={setDraft}
            onValidationChange={setHasValidationErrors}
          />
          <div className="flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={handleResetToGenerated}
              className="text-muted-foreground hover:text-foreground"
            >
              Reset to generated script
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleCancel}
                className="mr-3 text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                disabled={hasValidationErrors}
                className="h-7 gap-1 bg-[hsl(var(--brand))] px-2.5 text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand-active))] disabled:opacity-50"
              >
                <Check className="h-3.5 w-3.5" />
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="whitespace-pre-line font-serif text-[20px] leading-[1.7] tracking-normal text-foreground">
            {activeScript.split(/(\[Pause[^\]]*])/g).map((part, i) => {
              if (part.match(/^\[Pause[^\]]*]$/)) {
                return (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 align-middle font-sans text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                  >
                    {part.replace(/[\[\]]/g, '')}
                  </span>
                )
              }
              return part
            })}
          </div>

          {section.issues.length > 0 || section.unresolvedPlaceholders.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {section.issues.map((issue) => (
                <div key={issue}>{issue}</div>
              ))}
              {section.unresolvedPlaceholders.map((placeholder) => (
                <div key={placeholder}>Script contains unresolved placeholder {placeholder}</div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}

export function BusinessScriptPreview({
  items,
  groupedByCategory,
  meetingDate,
  scriptOverrides,
  onScriptOverrideChange,
  selectedItemIds,
  className,
}: BusinessScriptPreviewProps) {
  const sections = useMemo(
    () => buildScriptSections(groupedByCategory, selectedItemIds),
    [groupedByCategory, selectedItemIds]
  )
  const longDate = formatLongMeetingLabel(meetingDate)
  const issueCount = sections.reduce(
    (total, section) => total + section.issues.length + section.unresolvedPlaceholders.length,
    0
  )
  const sharedScriptCount = sections.length

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-surface-raised shadow-[var(--shadow-builder-card)]",
        className
      )}
    >
      <div className="border-b border-border/70 px-6 py-5 sm:px-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Scheduled Meeting
            </div>
            <h2 className="mt-2 font-serif text-[30px] font-normal leading-none tracking-normal text-foreground">
              {longDate || "Pick a meeting date"}
            </h2>
            <div className="mt-2 text-[13px] text-muted-foreground">
              Ward Business · {items.length} item{items.length === 1 ? "" : "s"} · {sharedScriptCount} shared script{sharedScriptCount === 1 ? "" : "s"}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium",
              issueCount > 0
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            )}
          >
            {issueCount > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {issueCount > 0 ? `${issueCount} issue${issueCount === 1 ? "" : "s"}` : "Ready to read"}
          </span>
        </div>
      </div>

      <div className="bg-surface-body px-5 py-5 sm:px-7 sm:py-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-surface-sunken/40 px-6 py-12 text-center text-[13px] text-muted-foreground">
            No business items to preview.
          </div>
        ) : (
          <div className="space-y-7">
            {sections.map((section) => (
              <EditableScriptSection
                key={section.key}
                section={section}
                scriptOverride={scriptOverrides?.[section.key]}
                onScriptOverrideChange={
                  onScriptOverrideChange
                    ? (script) => onScriptOverrideChange(section.key, script)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function ScheduledReviewQueue({
  groups,
  onOpenItem,
  onUnscheduleItem,
  unschedulingItemId,
}: {
  groups: ScheduledDateGroup[]
  onOpenItem?: (item: BusinessItem) => void
  onUnscheduleItem?: (item: BusinessItem) => void | Promise<void>
  unschedulingItemId?: string | null
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
        Nothing scheduled.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.date} className="space-y-2 rounded-xl border border-border/60 bg-background/55 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-serif text-[15px] text-foreground">
                {formatCompactMeetingLabel(group.date)}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                {group.items.length} item{group.items.length === 1 ? "" : "s"}
              </div>
            </div>
          </div>

          {BUSINESS_CATEGORY_ORDER.map((key) => {
            const categoryItems = group.groupedByCategory[key]
            if (categoryItems.length === 0) return null

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {BUSINESS_CATEGORY_PLURAL[key]}
                  </span>
                  <span className="text-muted-foreground">{categoryItems.length}</span>
                </div>
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onOpenItem?.(item)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-left",
                      onOpenItem && "cursor-pointer transition-colors hover:border-border hover:bg-surface-hover"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-serif text-[13px] text-foreground">
                        {item.person_name}
                      </div>
                      <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {itemSubtitle(item, key)}
                      </div>
                    </div>
                    {onUnscheduleItem ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation()
                          onUnscheduleItem(item)
                        }}
                        disabled={unschedulingItemId === item.id}
                        className="h-7 shrink-0 px-2"
                        aria-label={`Move ${item.person_name} back to pending`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}

export function BusinessReviewPanel({
  items,
  groupedByCategory,
  meetingDate,
  onMeetingDateChange,
  activeStatus,
  onSchedule,
  scheduling,
  onOpenItem,
  selectedItemIds,
  onToggleItemSelection,
  onSelectAll,
  onDeselectAll,
  onUnscheduleItem,
  unschedulingItemId,
  className,
}: BusinessReviewPanelProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  const sections = useMemo(
    () => buildScriptSections(groupedByCategory, selectedItemIds),
    [groupedByCategory, selectedItemIds]
  )
  const actionIssues = useMemo(
    () => buildActionIssues(groupedByCategory),
    [groupedByCategory]
  )
  const totalIssues = sections.reduce(
    (total, section) => total + section.issues.length + section.unresolvedPlaceholders.length,
    0
  )
  const customCount = items.filter((item) => item.details?.customScript?.trim()).length
  const shortDate = formatShortMeetingLabel(meetingDate)
  const scheduledGroups = useMemo(() => groupScheduledItemsByDate(items), [items])

  return (
    <aside
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border/70 bg-surface-raised p-5 shadow-[var(--shadow-builder-card)]",
        className
      )}
    >
      <div>
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Review Queue
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Metric value={items.length} label="Items" />
          {activeStatus === "scheduled" ? (
            <Metric value={scheduledGroups.length} label="Meetings" />
          ) : (
            <Metric value={totalIssues} label="Issues" tone={totalIssues > 0 ? "warning" : "success"} />
          )}
          {activeStatus === "scheduled" ? (
            <Metric value={totalIssues} label="Issues" tone={totalIssues > 0 ? "warning" : "success"} />
          ) : (
            <Metric value={customCount} label="Custom" />
          )}
        </div>
      </div>

      {activeStatus === "pending" ? (
        <div className="space-y-3 rounded-xl border border-border/70 bg-background/55 p-3">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Schedule
          </div>
          <button
            type="button"
            onClick={() => setDatePickerOpen(true)}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-[12.5px] text-foreground outline-none hover:border-border focus-visible:border-[hsl(var(--brand))] focus-visible:ring-1 focus-visible:ring-[hsl(var(--brand))]"
          >
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{meetingDate ? format(new Date(`${meetingDate}T12:00:00`), "EEE, MMM d, yyyy") : "Select date"}</span>
          </button>
          <SundayPickerModal
            open={datePickerOpen}
            onOpenChange={setDatePickerOpen}
            value={meetingDate}
            onSelect={onMeetingDateChange}
          />
          <Button
            type="button"
            onClick={() => onSchedule()}
            disabled={scheduling || (selectedItemIds?.size ?? 0) === 0}
            className="h-10 w-full gap-2 rounded-xl bg-[hsl(var(--brand))] text-[13.5px] font-medium text-[hsl(var(--brand-foreground))] hover:bg-[hsl(var(--brand-active))] disabled:opacity-60"
          >
            <CalendarDays className="h-4 w-4" />
            {scheduling ? "Scheduling..." : "Schedule for meeting"}
          </Button>
          <div className="flex items-start gap-1.5 text-[11.5px] leading-5 text-muted-foreground">
            <Orbit className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[hsl(var(--brand))]" />
            {selectedItemIds?.size ?? 0} of {items.length} item{items.length === 1 ? "" : "s"} selected. These will appear in the {shortDate} Program Planner business card.
          </div>
        </div>
      ) : null}

      {actionIssues.length > 0 && (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/70">
          <div className="flex items-center gap-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">
            <Wrench className="h-3.5 w-3.5" />
            Action needed
          </div>
          <div className="space-y-2">
            {actionIssues.map(({ id, item, issue, category }) => (
              <div
                key={id}
                className="rounded-lg border border-amber-200/80 bg-background/70 px-3 py-2 dark:border-amber-900/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-serif text-[14px] text-foreground">
                      {item.person_name}
                    </div>
                    <div className="mt-0.5 text-[11.5px] leading-5 text-amber-800 dark:text-amber-200">
                      {issue === "Gender is required for correct pronouns" ? (
                        <>
                          Gender is required for correct pronouns.{" "}
                          <Link
                            href="/directory"
                            className="underline hover:text-amber-900 dark:hover:text-amber-100"
                          >
                            Update in Directory
                          </Link>
                        </>
                      ) : (
                        issue
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {itemSubtitle(item, category)}
                    </div>
                  </div>
                  {onOpenItem && issue !== "Gender is required for correct pronouns" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenItem(item)}
                      className="h-7 shrink-0 rounded-full border-amber-300 bg-background px-2.5 text-[11px] text-amber-800 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900"
                    >
                      Fix
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {activeStatus === "scheduled" ? "Scheduled Meetings" : "Included Items"}
          </div>
          {activeStatus === "pending" && items.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-[11px] text-[hsl(var(--brand))] hover:text-[hsl(var(--brand-active))]"
              >
                Select all
              </button>
              <span className="text-muted-foreground">•</span>
              <button
                type="button"
                onClick={onDeselectAll}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          )}
        </div>
        {activeStatus === "scheduled" ? (
          <ScheduledReviewQueue
            groups={scheduledGroups}
            onOpenItem={onOpenItem}
            onUnscheduleItem={onUnscheduleItem}
            unschedulingItemId={unschedulingItemId}
          />
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11.5px] text-muted-foreground">
            Nothing to review.
          </div>
        ) : (
          <div className="space-y-4">
            {BUSINESS_CATEGORY_ORDER.map((key) => {
              const group = groupedByCategory[key] ?? []
              if (group.length === 0) return null

              return (
                <section key={key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {BUSINESS_CATEGORY_PLURAL[key]}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{group.length}</div>
                  </div>
                  <div className="space-y-1.5">
                    {group.map((item) => {
                      const readiness = readinessFor(item)
                      const isSelected = selectedItemIds?.has(item.id) ?? false
                      const content = (
                        <>
                          {activeStatus === "pending" && (
                            <Checkbox
                              variant="form"
                              checked={isSelected}
                              onCheckedChange={() => {
                                // Prevent event propagation to avoid triggering the item open
                                onToggleItemSelection?.(item.id)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-2"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-serif text-[14px] text-foreground">
                              {item.person_name}
                            </div>
                            <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                              {itemSubtitle(item, key)}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full border px-2 py-[3px] text-[10.5px] font-medium leading-none",
                              readiness.className
                            )}
                          >
                            {readiness.label}
                          </span>
                        </>
                      )

                      return onOpenItem ? (
                        <div
                          key={item.id}
                          onClick={() => onOpenItem(item)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5 text-left transition-colors hover:border-border hover:bg-surface-hover cursor-pointer"
                        >
                          {content}
                        </div>
                      ) : (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/70 px-3 py-2.5"
                        >
                          {content}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </aside>
  )
}

function Metric({
  value,
  label,
  tone = "neutral",
}: {
  value: number
  label: string
  tone?: "neutral" | "success" | "warning"
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2",
        tone === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
          : tone === "warning"
            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            : "border-border/70 bg-background/60 text-foreground"
      )}
    >
      <div className="font-serif text-[18px] leading-none">{value}</div>
      <div className="mt-1 text-[10.5px] uppercase tracking-[0.08em] opacity-75">{label}</div>
    </div>
  )
}
