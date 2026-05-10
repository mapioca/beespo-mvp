"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, startOfDay, addDays } from "date-fns"
import {
  ChevronRight,
  ExternalLink,
  Hand,
  Link2,
  Minus,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"

import { Breadcrumbs } from "@/components/dashboard/breadcrumbs"
import { AssignmentStatusPill } from "@/components/meetings/sacrament-meeting/assignment-status-pill"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"
import type {
  AssignmentStatus,
  AssignmentStatusChange,
  ConfirmationAction,
} from "@/lib/sacrament-confirmations"
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
  topicUrl?: string | null
  durationMinutes: number | null
  speakerStatus?: AssignmentStatus
  speakerDeclineNote?: string | null
  speakerDeclinedAt?: string | null
}

type SpeakerFieldPatch = {
  topic?: string
  topicUrl?: string | null
  durationMinutes?: number | null
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
const SECTION_CLOSING_ID = "section-closing"

function createDefaultSpeakerEntry(isoDate: string, index: number): SpeakerEntry {
  return {
    id: `${isoDate}-speaker-${index}`,
    kind: "speaker",
    title: "Speaker",
    speakerName: "",
    topic: "",
    durationMinutes: null,
  }
}

function createDefaultIntermediateHymnEntry(isoDate: string): AgendaEntry {
  return {
    id: `${isoDate}-intermediate-hymn`,
    kind: "static",
    title: "Intermediate Hymn",
    hymnId: "",
    hymnTitle: "",
    removable: true,
  }
}

function createDefaultStandardEntries(isoDate: string): AgendaEntry[] {
  return [
    createDefaultSpeakerEntry(isoDate, 1),
    createDefaultSpeakerEntry(isoDate, 2),
    createDefaultIntermediateHymnEntry(isoDate),
    createDefaultSpeakerEntry(isoDate, 3),
    {
      id: SECTION_CLOSING_ID,
      kind: "section",
    },
  ]
}

function upgradeLegacyDefaultSpeakerLayout(isoDate: string, entries: AgendaEntry[]) {
  const speaker1Index = entries.findIndex((entry) => entry.id === `${isoDate}-speaker-1` && entry.kind === "speaker")
  const speaker2Index = entries.findIndex((entry) => entry.id === `${isoDate}-speaker-2` && entry.kind === "speaker")
  const speaker3Index = entries.findIndex((entry) => entry.id === `${isoDate}-speaker-3` && entry.kind === "speaker")
  const closingIndex = entries.findIndex((entry) => entry.id === SECTION_CLOSING_ID)
  const hasIntermediateHymn = entries.some(
    (entry) =>
      entry.kind === "static" &&
      (entry.id === `${isoDate}-intermediate-hymn` || entry.title === "Intermediate Hymn")
  )

  if (
    speaker1Index === -1 ||
    speaker2Index !== speaker1Index + 1 ||
    speaker3Index !== -1 ||
    hasIntermediateHymn ||
    closingIndex !== speaker2Index + 1
  ) {
    return entries
  }

  return [
    ...entries.slice(0, closingIndex),
    createDefaultIntermediateHymnEntry(isoDate),
    createDefaultSpeakerEntry(isoDate, 3),
    ...entries.slice(closingIndex),
  ]
}

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
    standardEntries: createDefaultStandardEntries(isoDate),
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
        "flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-hover",
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

// ─── Topic field (text or church URL with preview) ──────────────────────────

const CHURCH_HOST = "www.churchofjesuschrist.org"

type LinkPreview = {
  url: string
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

const previewCache = new Map<string, Promise<LinkPreview | null>>()

function fetchPreview(url: string): Promise<LinkPreview | null> {
  const cached = previewCache.get(url)
  if (cached) return cached
  const promise = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
    .then((r) => (r.ok ? (r.json() as Promise<LinkPreview>) : null))
    .catch(() => null)
  previewCache.set(url, promise)
  return promise
}

function isChurchUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === "https:" && parsed.hostname === CHURCH_HOST
  } catch {
    return false
  }
}

function usePreview(url: string | null) {
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!url) {
      setPreview(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    fetchPreview(url).then((data) => {
      if (cancelled) return
      setPreview(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return { preview, loading }
}

type LinkPreviewCardProps = {
  url: string
  preview: LinkPreview | null
  loading: boolean
}

function LinkPreviewCard({ url, preview, loading }: LinkPreviewCardProps) {
  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }, [url])

  return (
    <div className="w-72 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
      {preview?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image}
          alt=""
          className="h-36 w-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="flex h-20 w-full items-center justify-center bg-muted">
          <Link2 className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-3">
        <div className="line-clamp-2 font-serif text-[14px] font-semibold leading-snug text-foreground">
          {preview?.title ?? (loading ? "Loading preview…" : "Untitled page")}
        </div>
        {preview?.description && (
          <div className="line-clamp-3 text-[12px] leading-snug text-muted-foreground">
            {preview.description}
          </div>
        )}
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Link2 className="h-3 w-3 shrink-0" />
          <span className="truncate">{hostname}</span>
        </div>
      </div>
    </div>
  )
}

// Legacy support: some entries stored the URL directly in `topic`.
// Resolve both fields to `{ title, url }` for rendering.
function resolveTopic(topic: string, topicUrl: string | null | undefined) {
  const trimmedUrl = topicUrl?.trim() || ""
  if (trimmedUrl && isChurchUrl(trimmedUrl)) {
    return { title: topic.trim(), url: trimmedUrl }
  }
  const trimmedTopic = topic.trim()
  if (isChurchUrl(trimmedTopic)) {
    return { title: "", url: trimmedTopic }
  }
  return { title: trimmedTopic, url: "" }
}

// ─── Structured topic editor (popover with title + URL) ──────────────────────

type TopicEditorProps = {
  initialTitle: string
  initialUrl: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (patch: SpeakerFieldPatch) => void
  trigger: React.ReactNode
}

function TopicEditor({
  initialTitle,
  initialUrl,
  open,
  onOpenChange,
  onSave,
  trigger,
}: TopicEditorProps) {
  const [title, setTitle] = useState(initialTitle)
  const [url, setUrl] = useState(initialUrl)

  // Reset local state when the popover opens fresh
  useEffect(() => {
    if (open) {
      setTitle(initialTitle)
      setUrl(initialUrl)
    }
  }, [open, initialTitle, initialUrl])

  const trimmedUrl = url.trim()
  const urlValid = !trimmedUrl || isChurchUrl(trimmedUrl)
  const { preview, loading } = usePreview(urlValid && trimmedUrl ? trimmedUrl : null)

  // If the user pastes a URL and hasn't typed a title yet, auto-fill it
  // from the fetched metadata. Never override a title the user already typed.
  useEffect(() => {
    if (preview?.title && !title.trim()) {
      setTitle(preview.title)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview?.title])

  const commit = () => {
    const finalTitle =
      title.trim() || (urlValid && trimmedUrl ? preview?.title?.trim() || "" : "")
    const finalUrl = urlValid ? trimmedUrl || null : null
    onSave({ topic: finalTitle, topicUrl: finalUrl })
    onOpenChange(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (!next) commit()
        onOpenChange(next)
      }}
    >
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-80 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Title
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commit()
                }
              }}
              placeholder="e.g. Faith, repentance, the Atonement…"
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Link <span className="font-normal normal-case text-muted-foreground/70">(optional)</span>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commit()
                }
              }}
              placeholder={`https://${CHURCH_HOST}/…`}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-[12px] text-foreground outline-none focus:border-brand"
            />
            {trimmedUrl && !urlValid && (
              <div className="mt-1 text-[10.5px] text-amber-600 dark:text-amber-400">
                Only https://{CHURCH_HOST} links are supported.
              </div>
            )}
          </div>

          {urlValid && trimmedUrl && (
            <LinkPreviewCard url={trimmedUrl} preview={preview} loading={loading} />
          )}

          <div className="flex items-center justify-between pt-1">
            {trimmedUrl ? (
              <button
                type="button"
                onClick={() => setUrl("")}
                className="text-[11.5px] text-muted-foreground hover:text-foreground"
              >
                Remove link
              </button>
            ) : (
              <span />
            )}
            <Button size="sm" onClick={commit} className="h-7 px-3 text-[12px]">
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Topic field (input + chip with hover preview) ───────────────────────────

type TopicFieldProps = {
  topic: string
  topicUrl: string | null | undefined
  onUpdate: (patch: SpeakerFieldPatch) => void
}

function TopicField({ topic, topicUrl, onUpdate }: TopicFieldProps) {
  const { title, url } = resolveTopic(topic, topicUrl)
  const [hoverOpen, setHoverOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { preview, loading } = usePreview(url || null)

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
    }
  }, [])

  const openHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    setHoverOpen(true)
  }
  const closeHoverSoon = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setHoverOpen(false), 140)
  }

  // Empty state: plain input, no pencil. On commit (Enter/blur), auto-detect
  // if the pasted value is a church URL and fetch the title.
  if (!title && !url) {
    const commitInline = (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) {
        onUpdate({ topic: "", topicUrl: null })
        return
      }
      if (isChurchUrl(trimmed)) {
        onUpdate({ topic: "", topicUrl: trimmed })
        fetchPreview(trimmed).then((data) => {
          if (data?.title) onUpdate({ topic: data.title, topicUrl: trimmed })
        })
        return
      }
      onUpdate({ topic: trimmed, topicUrl: null })
    }

    return (
      <div className="mt-0.5">
        <input
          className="block w-full bg-transparent text-[11.5px] text-muted-foreground outline-none placeholder:italic placeholder:text-muted-foreground/60"
          placeholder="Type a topic or paste a church url…"
          defaultValue=""
          onBlur={(e) => commitInline(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              e.currentTarget.blur()
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )
  }

  const displayTitle = title || preview?.title || (url && loading ? "Loading…" : url)

  const titleNode = url ? (
    <Popover open={hoverOpen} onOpenChange={setHoverOpen}>
      <PopoverTrigger asChild>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={openHover}
          onMouseLeave={closeHoverSoon}
          onFocus={openHover}
          onBlur={closeHoverSoon}
          className="inline-flex min-w-0 items-center gap-1 truncate text-brand underline underline-offset-2 hover:text-brand/80"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{displayTitle}</span>
        </a>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-auto border-0 bg-transparent p-0 shadow-none"
        onMouseEnter={openHover}
        onMouseLeave={closeHoverSoon}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <LinkPreviewCard url={url} preview={preview} loading={loading} />
      </PopoverContent>
    </Popover>
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditorOpen(true)
      }}
      className="inline-flex min-w-0 items-center truncate text-left text-brand underline underline-offset-2 hover:text-brand/80"
    >
      <span className="truncate">{title}</span>
    </button>
  )

  return (
    <div className="mt-0.5 flex items-center gap-1 text-[11.5px]">
      {titleNode}
      <TopicEditor
        initialTitle={title || preview?.title || ""}
        initialUrl={url}
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={onUpdate}
        trigger={
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-muted-foreground/60 transition-colors hover:text-foreground"
            title="Edit topic"
          >
            <Pencil className="h-3 w-3" />
          </button>
        }
      />
    </div>
  )
}

// ─── Duration stepper ────────────────────────────────────────────────────────

const DURATION_MIN = 1
const DURATION_MAX = 60

type DurationStepperProps = {
  value: number | null
  onChange: (next: number | null) => void
}

function DurationStepper({ value, onChange }: DurationStepperProps) {
  const [draft, setDraft] = useState<string>(value != null ? String(value) : "")

  useEffect(() => {
    setDraft(value != null ? String(value) : "")
  }, [value])

  const clamp = (n: number) => Math.max(DURATION_MIN, Math.min(DURATION_MAX, n))
  const step = (delta: number) => {
    const current = value ?? 0
    onChange(clamp(current + delta))
  }

  const commit = (raw: string) => {
    const trimmed = raw.trim()
    if (!trimmed) {
      onChange(null)
      return
    }
    const n = Number(trimmed)
    if (Number.isFinite(n)) onChange(clamp(Math.round(n)))
    else setDraft(value != null ? String(value) : "")
  }

  const atMin = value != null && value <= DURATION_MIN
  const atMax = value != null && value >= DURATION_MAX

  return (
    <div
      className="group flex items-center rounded-md border border-border/70 bg-surface-sunken transition-colors focus-within:border-brand/60 hover:border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        disabled={atMin}
        onClick={() => step(-1)}
        aria-label="Decrease minutes"
        className="flex h-6 w-5 items-center justify-center rounded-l-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            e.currentTarget.blur()
          } else if (e.key === "ArrowUp") {
            e.preventDefault()
            step(1)
          } else if (e.key === "ArrowDown") {
            e.preventDefault()
            step(-1)
          }
        }}
        placeholder="—"
        aria-label="Duration in minutes"
        className="w-[26px] border-x border-border/60 bg-transparent py-1 text-center font-mono text-[11.5px] text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <button
        type="button"
        disabled={atMax}
        onClick={() => step(1)}
        aria-label="Increase minutes"
        className="flex h-6 w-5 items-center justify-center rounded-r-md text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
      >
        <Plus className="h-3 w-3" />
      </button>
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
  onTopicUpdate: (patch: SpeakerFieldPatch) => void
  onStatusChange: (change: AssignmentStatusChange) => void
  lastSpoke: LastSpokeEntry | undefined
}

function SlotFilled({
  speaker,
  isPickingThis,
  onPickSlot,
  onRemove,
  onTopicUpdate,
  onStatusChange,
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            onClick={onPickSlot}
            className={cn(
              "min-w-0 truncate text-left font-serif text-[14px] hover:text-brand",
              speaker.speakerStatus === "declined"
                ? "text-muted-foreground line-through decoration-muted-foreground/50"
                : "text-foreground"
            )}
          >
            {speaker.speakerName || (
              <span className="italic text-muted-foreground">Tap to assign</span>
            )}
          </button>
          {speaker.speakerName.trim() ? (
            <AssignmentStatusPill
              status={speaker.speakerStatus ?? "pending"}
              declineNote={speaker.speakerDeclineNote}
              onChange={onStatusChange}
            />
          ) : null}
        </div>
        <TopicField
          topic={speaker.topic}
          topicUrl={speaker.topicUrl}
          onUpdate={onTopicUpdate}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <DurationStepper
          value={speaker.durationMinutes}
          onChange={(durationMinutes) => onTopicUpdate({ durationMinutes })}
        />
        <span className="font-mono text-[11px] text-muted-foreground">min</span>
      </div>

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
  onUpdateTopic: (slotIdx: number, patch: SpeakerFieldPatch) => void
  onStatusChange: (entryId: string, change: AssignmentStatusChange) => void
}

function MeetingCard({
  isoDate,
  meeting,
  picking,
  lastSpokeMap,
  onPickSlot,
  onRemoveSpeaker,
  onUpdateTopic,
  onStatusChange,
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
                onTopicUpdate={(patch) => onUpdateTopic(i, patch)}
                onStatusChange={(change) => onStatusChange(s.id, change)}
                lastSpoke={s.speakerName ? lastSpokeMap[s.speakerName] : undefined}
              />
            ))}

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
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
              ? upgradeLegacyDefaultSpeakerLayout(
                  entry.meetingDate,
                  entry.meetingState.standardEntries as AgendaEntry[]
                )
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

  // ── Cleanup autosave timer on unmount ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }
    }
  }, [])

  // ── Persist changes to localStorage + server ──────────────────────────────
  const persist = useCallback(
    (next: Record<string, PlannerMeetingState>, dates: string[]) => {
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

      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current)
      }

      autosaveTimeoutRef.current = setTimeout(() => {
        const entries = dates
          .map((isoDate) => {
            const meeting = next[isoDate]
            if (!meeting) return null
            return {
              meetingDate: isoDate,
              meetingState: meeting,
              notesState: {},
              meetingTypeOverridden: false,
            }
          })
          .filter((e): e is NonNullable<typeof e> => Boolean(e))

        fetch("/api/meetings/sacrament-planner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dates, entries }),
        }).catch(() => {
          /* local draft remains usable if server is unavailable */
        })
      }, 2000)
    },
    []
  )

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
  useMemo(
      () =>
          visibleMeetingDates.filter((iso) =>
              isAssignableMeeting((meetingsByDate[iso] ?? createFallbackMeetingState(iso)).specialType)
          ).length,
      [visibleMeetingDates, meetingsByDate]
  );
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
        persist(next, upcomingSundays)
        return next
      })
    },
    [persist, upcomingSundays]
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
          const targetEntry = allEntries[targetAllIdx]
          const previousRaw = (targetEntry as { speakerName?: unknown }).speakerName
          const previous = typeof previousRaw === "string" ? previousRaw.trim() : ""
          const updatedEntries = [...allEntries]
          // Reassigning to a different person resets confirmation state so
          // the previous person's "confirmed" doesn't stick to the new one.
          const isSwap = previous.length > 0 && previous !== person.name
          updatedEntries[targetAllIdx] = {
            ...targetEntry,
            speakerName: person.name,
            ...(isSwap || previous.length === 0
              ? {
                  speakerStatus: "pending",
                  speakerDeclineNote: null,
                  speakerDeclinedAt: null,
                }
              : {}),
          }
          return { standardEntries: updatedEntries }
        } else {
          // Add new speaker entry — default to pending so they show up in
          // the confirmations queue immediately.
          const newEntry: SpeakerEntry = {
            id: `${isoDate}-speaker-${Date.now()}`,
            kind: "speaker",
            title: "Speaker",
            speakerName: person.name,
            topic: "",
            durationMinutes: 10,
            speakerStatus: "pending",
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
    (isoDate: string, slotIdx: number, patch: SpeakerFieldPatch) => {
      updateMeeting(isoDate, (m) => {
        let speakerCount = 0
        const updatedEntries = (m.standardEntries ?? []).map((e) => {
          if (e.kind !== "speaker") return e
          const isTarget = speakerCount === slotIdx
          speakerCount++
          if (!isTarget) return e
          const next = { ...e } as SpeakerEntry
          if (patch.topic !== undefined) next.topic = patch.topic
          if (patch.topicUrl !== undefined) next.topicUrl = patch.topicUrl
          if (patch.durationMinutes !== undefined) next.durationMinutes = patch.durationMinutes
          return next
        })
        return { standardEntries: updatedEntries }
      })
    },
    [updateMeeting]
  )

  // Mutate speaker confirmation status in-place, persist via the dedicated
  // confirmations endpoint (instead of the bulk planner upsert) so we only
  // touch meeting_state and don't risk overwriting notes_state.
  const updateSpeakerStatus = useCallback(
    async (isoDate: string, entryId: string, change: AssignmentStatusChange) => {
      let snapshot: Record<string, PlannerMeetingState> = {}

      setMeetingsByDate((prev) => {
        snapshot = prev
        const meeting = prev[isoDate]
        if (!meeting) return prev
        const apply = (entries: AgendaEntry[]) =>
          entries.map((e) => {
            if (e.id !== entryId || e.kind !== "speaker") return e
            if (change.status === "declined") {
              return {
                ...e,
                speakerStatus: "declined",
                speakerDeclineNote: change.declineNote,
                speakerDeclinedAt: new Date().toISOString(),
              }
            }
            return {
              ...e,
              speakerStatus: change.status,
              speakerDeclineNote: null,
              speakerDeclinedAt: null,
            }
          })
        return {
          ...prev,
          [isoDate]: {
            ...meeting,
            standardEntries: apply(meeting.standardEntries ?? []),
            fastEntries: apply(meeting.fastEntries ?? []),
          },
        }
      })

      const action: ConfirmationAction =
        change.status === "declined"
          ? { type: "decline", note: change.declineNote }
          : change.status === "confirmed"
            ? { type: "confirm" }
            : { type: "reset" }

      try {
        const response = await fetch("/api/meetings/sacrament-confirmations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingDate: isoDate, entryId, action }),
        })
        if (!response.ok) throw new Error(await response.text())
      } catch {
        setMeetingsByDate(snapshot)
      }
    },
    []
  )

  // ─── Breadcrumb ─────────────────────────────────────────────────────────────
  const breadcrumbItems = useMemo(
    () => [
      { label: "<- Back to the Planner", href: "/meetings/sacrament/planner" },
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

      {/* Header */}
      <div className="px-4 py-10 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl border-b border-border/60 pb-10">
          <header>
            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-2">
              Speaker Planner
            </div>
            <h1 className="font-serif text-3xl md:text-[34px] leading-[1.1] tracking-tight text-foreground">
              Sacrament meeting <em className="font-serif italic">speakers</em>
            </h1>
            <p className="text-[13px] text-muted-foreground mt-2 max-w-xl leading-relaxed">
              Assign speakers for upcoming meetings. Roster sorted by longest since last talk.
            </p>
          </header>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="px-4 pb-8 sm:px-6 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)] xl:gap-10">
            {/* Left pane: Meeting cards */}
            <div className="min-w-0">
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
                      onUpdateTopic={(slotIdx, patch) => updateTopic(iso, slotIdx, patch)}
                      onStatusChange={(entryId, change) => updateSpeakerStatus(iso, entryId, change)}
                    />
                  )
                })}
              </div>
            </div>

            {/* Right pane: Roster */}
            <div>
              <div
                className={cn(
                  "xl:sticky xl:top-16 rounded-2xl border border-border/70 bg-surface-raised p-5 shadow-sm transition-colors",
                  picking && "border-brand bg-brand/[0.04]"
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
                <div className="flex flex-col gap-px max-h-[600px] overflow-y-auto">
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
        </div>
      </div>
    </div>
  )
}
