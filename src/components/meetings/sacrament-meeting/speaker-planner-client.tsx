"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, startOfDay, addDays } from "date-fns"
import { ChevronRight, Hand, Plus, Search, X } from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"

type SpeakerEntry = {
  id: string
  kind: "speaker"
  title: string
  speakerName: string
  topic: string
  durationMinutes: number | null
}

type AgendaEntry = { id: string; kind: string; [key: string]: unknown }

type PlannerMeetingState = {
  title: string
  specialType: MeetingSpecialType
  assignments: Record<string, string>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

type DirectoryPerson = {
  id: string
  name: string
}

type LastSpokeEntry = { date: string; topic: string }
type LastSpokeMap = Record<string, LastSpokeEntry>

type PickingState = { isoDate: string; slotIdx: number } | null

type PersistedPlannerEntry = {
  meetingDate: string
  meetingState?: Partial<PlannerMeetingState>
  meetingTypeOverridden?: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANNER_DRAFT_STORAGE_KEY = "beespo:sacrament-meeting:planner:draft:v1"
const MAX_SPEAKERS = 3

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSpeakers(entries: AgendaEntry[]): SpeakerEntry[] {
  return entries.filter((e): e is SpeakerEntry => e.kind === "speaker")
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("")
}

function daysSince(isoDate: string) {
  const then = new Date(`${isoDate}T12:00:00`)
  return Math.floor((Date.now() - then.getTime()) / 86_400_000)
}

type AgoTier = "never" | "upcoming" | "recent" | "mid" | "long" | "overdue"

function agoTier(isoDate: string): AgoTier {
  const d = daysSince(isoDate)
  if (d < 0) return "upcoming"
  if (d < 90) return "recent"
  if (d < 180) return "mid"
  if (d < 365) return "long"
  return "overdue"
}

function relativeDate(isoDate: string): string {
  const d = daysSince(isoDate)
  if (d < 0) return "Upcoming"
  if (d < 7) return "This week"
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  if (d < 365) return `${Math.floor(d / 30)}mo ago`
  return `${(d / 365).toFixed(1)}yr ago`
}

function computeLastSpoke(meetingsByDate: Record<string, PlannerMeetingState>): LastSpokeMap {
  const map: LastSpokeMap = {}
  for (const [date, meeting] of Object.entries(meetingsByDate)) {
    const entries = [
      ...(meeting.standardEntries ?? []),
      ...(meeting.fastEntries ?? []),
    ]
    for (const entry of getSpeakers(entries as AgendaEntry[])) {
      if (!entry.speakerName?.trim()) continue
      const name = entry.speakerName.trim()
      if (!map[name] || date > map[name].date) {
        map[name] = { date, topic: entry.topic ?? "" }
      }
    }
  }
  return map
}

function isAssignableMeeting(specialType: MeetingSpecialType) {
  return specialType === "standard"
}

function getMeetingTypeLabel(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "Fast & Testimony Meeting"
    case "general-conference":
      return "General Conference"
    case "stake-conference":
      return "Stake Conference"
    case "ward-conference":
      return "Ward Conference"
    default:
      return "Sacrament Meeting"
  }
}

function getSpeakerPlannerEmptyMessage(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "No assigned speakers for fast and testimony meeting."
    case "general-conference":
      return "No local speaker planning for General Conference."
    case "stake-conference":
      return "No ward speaker planning for Stake Conference."
    case "ward-conference":
      return "Speaker planning is handled outside the regular rotation."
    default:
      return "No speaker slots for this meeting."
  }
}

function isFirstSundayOfMonth(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).getDate() <= 7
}

function isGeneralConferenceSunday(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`)
  const month = date.getMonth()

  return (month === 3 || month === 9) && isFirstSundayOfMonth(isoDate)
}

function getDefaultMeetingSpecialType(isoDate: string): MeetingSpecialType {
  if (isGeneralConferenceSunday(isoDate)) {
    return "general-conference"
  }

  if (isFirstSundayOfMonth(isoDate)) {
    return "fast-testimony"
  }

  return "standard"
}

function createFallbackMeetingState(isoDate: string): PlannerMeetingState {
  return {
    title: "",
    specialType: getDefaultMeetingSpecialType(isoDate),
    assignments: {},
    standardEntries: [
      {
        id: "section-closing",
        kind: "section",
      },
    ],
    fastEntries: [],
  }
}

function getUpcomingSundays(count = 26): string[] {
  const today = startOfDay(new Date())
  const dow = today.getDay()
  const firstSunday = addDays(today, dow === 0 ? 0 : 7 - dow)
  return Array.from({ length: count }, (_, i) =>
    format(addDays(firstSunday, i * 7), "yyyy-MM-dd")
  )
}

// ─── Ago badge ────────────────────────────────────────────────────────────────

const agoBadgeClass: Record<AgoTier, string> = {
  never:
    "bg-muted text-muted-foreground border border-border",
  upcoming:
    "bg-brand/10 text-brand border border-brand/30",
  recent:
    "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
  mid:
    "bg-muted text-muted-foreground border border-border",
  long:
    "bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800",
  overdue:
    "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800",
}

// Warm theme uses accent-warm tones — these inline overrides keep it cohesive
const tierAvatarClass: Record<AgoTier, string> = {
  never:    "bg-muted text-muted-foreground border-border",
  upcoming: "bg-brand/10 text-brand border-brand/30",
  recent:   "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800",
  mid:      "bg-muted text-muted-foreground border-border",
  long:     "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/60 dark:text-yellow-400 dark:border-yellow-800",
  overdue:  "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800",
}

// ─── Roster row ───────────────────────────────────────────────────────────────

type RosterRowProps = {
  person: DirectoryPerson
  spoke: LastSpokeEntry | undefined
  picking: boolean
  isCurrentSlot: boolean
  onClick: () => void
}

function RosterRow({ person, spoke, picking, isCurrentSlot, onClick }: RosterRowProps) {
  const tier: AgoTier = spoke ? agoTier(spoke.date) : "never"

  return (
    <div
      role={picking ? "button" : undefined}
      tabIndex={picking ? 0 : undefined}
      onClick={picking ? onClick : undefined}
      onKeyDown={picking ? (e) => e.key === "Enter" && onClick() : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors",
        picking && "cursor-pointer hover:bg-accent",
        isCurrentSlot && "bg-brand/10"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold",
          tierAvatarClass[tier]
        )}
      >
        {getInitials(person.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-serif text-[13.5px] text-foreground">{person.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden">
          {spoke ? (
            <>
              <span
                className={cn(
                  "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium",
                  agoBadgeClass[tier]
                )}
              >
                {relativeDate(spoke.date)}
              </span>
              {spoke.topic && (
                <span className="truncate text-[11px] text-muted-foreground">
                  · &ldquo;{spoke.topic}&rdquo;
                </span>
              )}
            </>
          ) : (
            <span
              className={cn(
                "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium",
                agoBadgeClass.never
              )}
            >
              Never spoken
            </span>
          )}
        </div>
      </div>
      {picking && (
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </div>
  )
}

// ─── Speaker slot ─────────────────────────────────────────────────────────────

type SlotFilledProps = {
  speaker: SpeakerEntry
  slotIdx: number
  isPickingThis: boolean
  onPickSlot: () => void
  onRemove: () => void
  onTopicChange: (topic: string) => void
  lastSpoke: LastSpokeEntry | undefined
}

function SlotFilled({
  speaker,
  isPickingThis,
  onPickSlot,
  onRemove,
  onTopicChange,
  lastSpoke,
}: SlotFilledProps) {
  const tier: AgoTier = lastSpoke ? agoTier(lastSpoke.date) : "never"

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border bg-muted/40 px-2.5 py-2 transition-all",
        isPickingThis
          ? "animate-pulse border-brand bg-brand/10 shadow-[0_0_0_3px_hsl(var(--brand)/0.12)]"
          : "border-border hover:border-border/80"
      )}
    >
      <button
        type="button"
        onClick={onPickSlot}
        title="Change speaker"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10.5px] font-semibold transition-colors",
          speaker.speakerName
            ? tierAvatarClass[tier]
            : "border-border bg-card text-muted-foreground hover:border-brand hover:text-brand"
        )}
      >
        {speaker.speakerName ? getInitials(speaker.speakerName) : "?"}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={onPickSlot}
          className="block w-full text-left font-serif text-[14px] text-foreground hover:text-brand"
        >
          {speaker.speakerName || (
            <span className="italic text-muted-foreground">Tap to assign</span>
          )}
        </button>
        <input
          className="mt-0.5 block w-full bg-transparent text-[11.5px] text-muted-foreground outline-none placeholder:italic placeholder:text-muted-foreground/60"
          placeholder="Topic or subject…"
          value={speaker.topic}
          onChange={(e) => onTopicChange(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {lastSpoke && speaker.speakerName && (
        <span
          className={cn(
            "shrink-0 rounded-full px-1.5 py-px text-[10px] font-medium",
            agoBadgeClass[tier]
          )}
          title={`Last spoke ${format(new Date(`${lastSpoke.date}T12:00:00`), "MMM d, yyyy")}: "${lastSpoke.topic || "no topic"}"`}
        >
          {relativeDate(lastSpoke.date)}
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── Meeting card ─────────────────────────────────────────────────────────────

type MeetingCardProps = {
  isoDate: string
  meeting: PlannerMeetingState
  picking: PickingState
  lastSpokeMap: LastSpokeMap
  onPickSlot: (slotIdx: number) => void
  onRemoveSpeaker: (slotIdx: number) => void
  onUpdateTopic: (slotIdx: number, topic: string) => void
}

function MeetingCard({
  isoDate,
  meeting,
  picking,
  lastSpokeMap,
  onPickSlot,
  onRemoveSpeaker,
  onUpdateTopic,
}: MeetingCardProps) {
  const date = new Date(`${isoDate}T12:00:00`)
  const month = format(date, "MMM").toUpperCase()
  const day = format(date, "d")
  const longDate = format(date, "EEEE, MMMM d, yyyy")
  const isAssignable = isAssignableMeeting(meeting.specialType)

  const allEntries = [
    ...(meeting.standardEntries ?? []),
    ...(meeting.fastEntries ?? []),
  ]
  const speakers = getSpeakers(allEntries as AgendaEntry[])
  const isActive = picking?.isoDate === isoDate

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface-raised transition-all",
        isActive
          ? "border-brand shadow-[0_0_0_3px_hsl(var(--brand)/0.15)]"
          : "border-border/60"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-border/60 px-4 py-3.5">
        <div className="flex shrink-0 flex-col items-center rounded-lg border border-border bg-muted/50 px-2.5 py-1.5 text-center">
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            {month}
          </span>
          <span className="font-serif text-[22px] leading-none text-foreground">{day}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="truncate font-serif text-[15.5px] text-foreground">
            {meeting.title || <span className="italic">{getMeetingTypeLabel(meeting.specialType)}</span>}
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">{longDate}</div>
        </div>
      </div>

      {/* Slots */}
      <div className="flex flex-col gap-2 px-4 py-3">
        {!isAssignable ? (
          <div className="rounded-lg border border-dashed border-border bg-surface-sunken/50 px-3 py-3 text-[13px] text-muted-foreground">
            {getSpeakerPlannerEmptyMessage(meeting.specialType)}
          </div>
        ) : (
          <>
            {speakers.map((s, i) => (
              <SlotFilled
                key={s.id}
                speaker={s}
                slotIdx={i}
                isPickingThis={(isActive && picking?.slotIdx === i)}
                onPickSlot={() => onPickSlot(i)}
                onRemove={() => onRemoveSpeaker(i)}
                onTopicChange={(topic) => onUpdateTopic(i, topic)}
                lastSpoke={s.speakerName ? lastSpokeMap[s.speakerName] : undefined}
              />
            ))}

            {speakers.length < MAX_SPEAKERS && (
              <button
                type="button"
                onClick={() => onPickSlot(speakers.length)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg border-[1.5px] border-dashed px-3 py-2 text-[13px] transition-all",
                  isActive && picking?.slotIdx === speakers.length
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/40 hover:text-foreground"
                )}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Add speaker</span>
                {isActive && picking?.slotIdx === speakers.length && (
                  <span className="ml-auto text-[11.5px] font-medium text-brand">
                    ← select from roster
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SpeakerPlannerClient() {
  const [meetingsByDate, setMeetingsByDate] = useState<Record<string, PlannerMeetingState>>({})
  const [roster, setRoster] = useState<DirectoryPerson[]>([])
  const [rosterLoading, setRosterLoading] = useState(true)
  const [picking, setPicking] = useState<PickingState>(null)
  const [search, setSearch] = useState("")
  const searchRef = useRef<HTMLInputElement>(null)
  const upcomingSundays = useMemo(() => getUpcomingSundays(26), [])

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true

    const applyPersistedEntries = (entries: PersistedPlannerEntry[]) => {
      if (entries.length === 0) return

      setMeetingsByDate((prev) => {
        const next = { ...prev }

        for (const entry of entries) {
          if (!entry.meetingState) continue
          const fallback = next[entry.meetingDate] ?? createFallbackMeetingState(entry.meetingDate)

          next[entry.meetingDate] = {
            ...fallback,
            ...entry.meetingState,
            specialType:
              entry.meetingTypeOverridden || entry.meetingState.specialType !== "standard"
                ? entry.meetingState.specialType ?? fallback.specialType
                : getDefaultMeetingSpecialType(entry.meetingDate),
            assignments: {
              ...fallback.assignments,
              ...(entry.meetingState.assignments ?? {}),
            },
            standardEntries: Array.isArray(entry.meetingState.standardEntries)
              ? entry.meetingState.standardEntries
              : fallback.standardEntries,
            fastEntries: Array.isArray(entry.meetingState.fastEntries)
              ? entry.meetingState.fastEntries
              : fallback.fastEntries,
          }
        }

        return next
      })
    }

    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as {
          meetingsByDate?: Record<string, Partial<PlannerMeetingState>>
          meetingTypeOverridesByDate?: Record<string, boolean>
        }
        if (parsed.meetingsByDate) {
          applyPersistedEntries(
            Object.entries(parsed.meetingsByDate).map(([meetingDate, meetingState]) => ({
              meetingDate,
              meetingState,
              meetingTypeOverridden: parsed.meetingTypeOverridesByDate?.[meetingDate],
            }))
          )
        }
      }
    } catch {
      /* ignore */
    }

    const loadPersistedEntries = async () => {
      try {
        const response = await fetch(`/api/meetings/sacrament-planner?dates=${upcomingSundays.join(",")}`)
        if (!response.ok) return

        const payload = (await response.json()) as { entries?: PersistedPlannerEntry[] }
        if (isMounted) {
          applyPersistedEntries(payload.entries ?? [])
        }
      } catch {
        /* local drafts remain usable if shared persistence is unavailable */
      }
    }

    void loadPersistedEntries()

    return () => {
      isMounted = false
    }
  }, [upcomingSundays])

  // ── Load roster from Supabase ──────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("directory")
      .select("id, name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        setRoster((data ?? []) as DirectoryPerson[])
        setRosterLoading(false)
      })
  }, [])

  // ── Escape to cancel ───────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPicking(null)
    }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [])

  // ── Focus search when picking starts ──────────────────────────────────────
  useEffect(() => {
    if (picking) {
      setTimeout(() => searchRef.current?.focus(), 60)
    } else {
      setSearch("")
    }
  }, [picking])

  // ── Persist changes to localStorage ───────────────────────────────────────
  const persist = useCallback((next: Record<string, PlannerMeetingState>) => {
    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      const base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
      window.localStorage.setItem(
        PLANNER_DRAFT_STORAGE_KEY,
        JSON.stringify({ ...base, meetingsByDate: next, savedAt: new Date().toISOString() })
      )
    } catch {
      /* ignore */
    }
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────
  const lastSpokeMap = useMemo(() => computeLastSpoke(meetingsByDate), [meetingsByDate])

  const visibleMeetingDates = useMemo(
    () =>
      upcomingSundays.filter((iso) => {
        const meeting = meetingsByDate[iso] ?? createFallbackMeetingState(iso)
        return Boolean(meeting)
      }),
    [upcomingSundays, meetingsByDate]
  )

  const regularMeetingCount = useMemo(
    () =>
      visibleMeetingDates.filter((iso) =>
        isAssignableMeeting((meetingsByDate[iso] ?? createFallbackMeetingState(iso)).specialType)
      ).length,
    [visibleMeetingDates, meetingsByDate]
  )

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      const la = lastSpokeMap[a.name]
      const lb = lastSpokeMap[b.name]
      if (!la && !lb) return a.name.localeCompare(b.name)
      if (!la) return -1
      if (!lb) return 1
      return la.date.localeCompare(lb.date)
    })
  }, [roster, lastSpokeMap])

  const filteredRoster = useMemo(() => {
    if (!search.trim()) return sortedRoster
    const q = search.toLowerCase()
    return sortedRoster.filter((p) => p.name.toLowerCase().includes(q))
  }, [sortedRoster, search])

  // ── Mutation helpers ───────────────────────────────────────────────────────
  const updateMeeting = useCallback(
    (isoDate: string, updater: (m: PlannerMeetingState) => Partial<PlannerMeetingState>) => {
      setMeetingsByDate((prev) => {
        const meeting = prev[isoDate] ?? createFallbackMeetingState(isoDate)
        const next = { ...prev, [isoDate]: { ...meeting, ...updater(meeting) } }
        persist(next)
        return next
      })
    },
    [persist]
  )

  const assignSpeaker = useCallback(
    (person: DirectoryPerson) => {
      if (!picking) return
      const { isoDate, slotIdx } = picking
      updateMeeting(isoDate, (m) => {
        const allEntries = [...(m.standardEntries ?? [])]
        const speakerEntries = getSpeakers(allEntries as AgendaEntry[])
        const speakerIndicesInAll = allEntries.reduce<number[]>((acc, e, i) => {
          if (e.kind === "speaker") acc.push(i)
          return acc
        }, [])

        if (slotIdx < speakerEntries.length) {
          // Replace existing speaker name
          const targetAllIdx = speakerIndicesInAll[slotIdx]
          const updatedEntries = [...allEntries]
          updatedEntries[targetAllIdx] = {
            ...updatedEntries[targetAllIdx],
            speakerName: person.name,
          }
          return { standardEntries: updatedEntries }
        } else {
          // Add new speaker entry
          const newEntry: SpeakerEntry = {
            id: `${isoDate}-speaker-${Date.now()}`,
            kind: "speaker",
            title: "Speaker",
            speakerName: person.name,
            topic: "",
            durationMinutes: 12,
          }
          // Insert before closing section or at end of standardEntries
          const closingIdx = allEntries.findIndex((e) => e.id === "section-closing")
          const insertAt = closingIdx === -1 ? allEntries.length : closingIdx
          const updatedEntries = [
            ...allEntries.slice(0, insertAt),
            newEntry,
            ...allEntries.slice(insertAt),
          ]
          return { standardEntries: updatedEntries }
        }
      })
      setPicking(null)
    },
    [picking, updateMeeting]
  )

  const removeSpeaker = useCallback(
    (isoDate: string, slotIdx: number) => {
      updateMeeting(isoDate, (m) => {
        let speakerCount = 0
        const updatedEntries = (m.standardEntries ?? []).filter((e) => {
          if (e.kind !== "speaker") return true
          const keep = speakerCount !== slotIdx
          speakerCount++
          return keep
        })
        return { standardEntries: updatedEntries }
      })
    },
    [updateMeeting]
  )

  const updateTopic = useCallback(
    (isoDate: string, slotIdx: number, topic: string) => {
      updateMeeting(isoDate, (m) => {
        let speakerCount = 0
        const updatedEntries = (m.standardEntries ?? []).map((e) => {
          if (e.kind !== "speaker") return e
          const isTarget = speakerCount === slotIdx
          speakerCount++
          return isTarget ? { ...e, topic } : e
        })
        return { standardEntries: updatedEntries }
      })
    },
    [updateMeeting]
  )

  // ─── Breadcrumb ─────────────────────────────────────────────────────────────
  const breadcrumbItems = useMemo(
    () => [
      { label: "<- Back to the Planner", href: "/meetings/sacrament-meeting/program-planner" },
      { label: "Speaker Planner" },
    ],
    []
  )

  return (
    <div className="min-h-full bg-surface-canvas">
      <Breadcrumbs
        items={breadcrumbItems}
        action={
          <div className="flex items-center gap-3">
            {picking ? (
              <>
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-brand">
                  <Hand className="h-3.5 w-3.5" />
                  Select a speaker from the roster →
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPicking(null)}
                  className="gap-1.5"
                >
                  Cancel
                  <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px] text-muted-foreground">
                    Esc
                  </kbd>
                </Button>
              </>
            ) : (
              <div className="text-[12.5px] text-muted-foreground">
                Click a speaker slot to assign ·{" "}
                <kbd className="rounded border border-border bg-muted px-1 py-px font-mono text-[10px]">
                  Esc
                </kbd>{" "}
                to cancel
              </div>
            )}
          </div>
        }
      />

      {/* Shell */}
      <div className="grid w-full grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px]">
        {/* ── Left: Meeting cards ── */}
        <div className="border-b border-border/60 py-7 lg:border-b-0 lg:border-r lg:py-8">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-5">
            <div className="font-serif text-[17px] text-foreground">Upcoming meetings</div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {regularMeetingCount} regular meetings · all Sundays shown
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            {visibleMeetingDates.map((iso) => {
              const meeting = meetingsByDate[iso] ?? createFallbackMeetingState(iso)
              const isAssignable = isAssignableMeeting(meeting.specialType)

              return (
                <MeetingCard
                  key={iso}
                  isoDate={iso}
                  meeting={meeting}
                  picking={picking}
                  lastSpokeMap={lastSpokeMap}
                  onPickSlot={(slotIdx) => {
                    if (!isAssignable) return
                    setPicking({ isoDate: iso, slotIdx })
                  }}
                  onRemoveSpeaker={(slotIdx) => removeSpeaker(iso, slotIdx)}
                  onUpdateTopic={(slotIdx, topic) => updateTopic(iso, slotIdx, topic)}
                />
              )
            })}
          </div>
          </div>{/* /max-w-3xl */}
        </div>

        {/* ── Right: Roster ── */}
        <div
          className={cn(
            "px-4 py-7 transition-colors sm:px-5 lg:sticky lg:top-0-lg:max-h-screen lg:overflow-y-auto lg:py-8",
            picking && "bg-brand/[0.04] dark:bg-brand/[0.07]"
          )}
        >
          <div className="mb-4">
            <div
              className={cn(
                "font-serif text-[17px] transition-colors",
                picking ? "text-brand" : "text-foreground"
              )}
            >
              {picking ? "Choose a speaker" : "Ward roster"}
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              Sorted by longest since last talk
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={searchRef}
              className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-8 pr-3 text-[13px] text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-border/80 focus:bg-background"
              placeholder="Search members…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Roster list */}
          <div className="flex flex-col gap-px">
            {rosterLoading ? (
              <div className="py-8 text-center text-[13px] text-muted-foreground">
                Loading…
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="py-8 text-center font-serif text-[13px] italic text-muted-foreground">
                No members found.
              </div>
            ) : (
              filteredRoster.map((person) => {
                const spoke = lastSpokeMap[person.name]
                const pickingMeetingDate = picking?.isoDate
                const pickingMeeting = pickingMeetingDate
                  ? meetingsByDate[pickingMeetingDate]
                  : undefined
                const allEntries = pickingMeeting
                  ? [...(pickingMeeting.standardEntries ?? [])]
                  : []
                const speakerEntries = getSpeakers(allEntries as AgendaEntry[])
                const slotPerson =
                  picking && picking.slotIdx < speakerEntries.length
                    ? speakerEntries[picking.slotIdx].speakerName
                    : null
                const isCurrentSlot = !!slotPerson && slotPerson === person.name

                return (
                  <RosterRow
                    key={person.id}
                    person={person}
                    spoke={spoke}
                    picking={!!picking}
                    isCurrentSlot={isCurrentSlot}
                    onClick={() => assignSpeaker(person)}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
