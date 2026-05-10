"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronLeft, ChevronRight, Minus, NotebookPen, Plus, Users, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import {
  formatContentDate,
  getContentText,
  normalizeContentLanguage,
  type ContentLanguage,
} from "@/lib/content-language"
import { ensureRichTextHtml, isRichTextEmpty, sanitizeRichTextHtml } from "@/lib/rich-text"
import { SACRAMENT_PRAYERS } from "@/lib/sacrament-prayers"
import { cn } from "@/lib/utils"

// ─── Types (mirrored from planner) ──────────────────────────────────────────

type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"

type AssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"
type AgendaAssigneeField = "invocation" | "benediction"

type SectionEntry = { id: string; kind: "section"; title: string }
type StaticEntry = {
  id: string
  kind: "static"
  title: string
  detail?: string
  assigneeField?: AgendaAssigneeField
  assigneeName?: string
  hymnId?: string
  hymnNumber?: number
  hymnTitle?: string
  removable?: boolean
}
type SpeakerEntry = {
  id: string
  kind: "speaker"
  title: string
  speakerName: string
  topic: string
  topicUrl?: string | null
  durationMinutes: number | null
}
type TestimonyEntry = { id: string; kind: "testimony"; title: string; detail: string }
type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry
type ConductItem = {
  id: string
  title: string
  checked: boolean
  detail?: string | null
}

export type ConductBusinessPerson = {
  id: string
  name: string
  subtitle: string | null
  completed?: boolean
}

export type ConductBusinessSection = {
  category: string
  label: string
  count: number
  people: ConductBusinessPerson[]
  script: string
}

export type ConductMeeting = {
  title?: string
  contentLanguage?: ContentLanguage
  meetingTime?: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  entries: AgendaEntry[]
  announcements: ConductItem[]
  businessSections: ConductBusinessSection[]
}

export type ConductViewProps = {
  meeting: ConductMeeting
  isoDate: string
  language?: ContentLanguage
  notes: string
  attendance: number | null
  onNotesChange: (value: string) => void
  onAttendanceChange: (value: number | null) => void
  onBusinessItemCompletedChange?: (id: string, completed: boolean) => void
  onClose: () => void
}

const SACRAMENT_PRAYER_REFERENCES = {
  bread: "Moroni 4:3 · D&C 20:77",
  water: "Moroni 5:2 · D&C 20:79",
}

// ─── Step type ───────────────────────────────────────────────────────────────

type Step = {
  key: string
  eyebrow: string
  title: string
  meta?: string
  hymnNum?: number
  kind?: "opening-hymn-prayer" | "business" | "sacrament-prayers"
  script?: string
  highlights?: string[]
  details?: Array<{
    label: string
    title: string
    meta?: string
    hymnNum?: number
    highlights?: string[]
  }>
}

// ─── Build agenda steps from meeting data ────────────────────────────────────

function totalBusinessCount(sections: ConductBusinessSection[]): number {
  return sections.reduce((sum, section) => sum + section.count, 0)
}

function parseMeetingHour(meetingTime?: string): number {
  const raw = meetingTime?.trim()
  if (!raw) return 9

  const match = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i)
  if (!match) return 9

  let hour = Number.parseInt(match[1] ?? "9", 10)
  const period = match[3]?.toUpperCase()

  if (period === "PM" && hour < 12) hour += 12
  if (period === "AM" && hour === 12) hour = 0

  return Number.isFinite(hour) ? hour : 9
}

function buildWelcomeScript(meeting: ConductMeeting, language: ContentLanguage) {
  const text = getContentText(language).conduct
  const hour = parseMeetingHour(meeting.meetingTime)
  const greeting = hour >= 12 ? text.welcomeGreetingAfternoon : text.welcomeGreetingMorning
  const lines = [`${greeting}, ${text.welcomeScriptIntro}`]
  const highlights: string[] = []

  const addRoleLine = (label: string, value?: string) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    lines.push(`${label} ${trimmed}.`)
    highlights.push(trimmed)
  }

  addRoleLine(text.presidingScript, meeting.assignments.presiding)
  addRoleLine(text.conductingScript, meeting.assignments.conductor)

  const chorister = meeting.assignments.chorister?.trim()
  const accompanist = meeting.assignments.accompanist?.trim()
  if (chorister && accompanist) {
    lines.push(`${text.musicScript} ${chorister}, ${text.musicWithAccompanistScript} ${accompanist} ${text.organScript}.`)
    highlights.push(chorister, accompanist)
  } else if (chorister) {
    lines.push(`${text.musicScript} ${chorister}.`)
    highlights.push(chorister)
  } else if (accompanist) {
    lines.push(`${text.musicWithAccompanistScript} ${accompanist} ${text.organScript}.`)
    highlights.push(accompanist)
  }

  return {
    script: lines.join("\n\n"),
    highlights,
  }
}

function buildSacramentPreparationScript(entry: StaticEntry | undefined, language: ContentLanguage) {
  const text = getContentText(language).conduct
  const hymnNumber = entry?.hymnNumber ? `#${entry.hymnNumber}` : "#_____"
  const hymnTitle = entry?.hymnTitle?.trim() || "__________________________"

  return {
    script: `${text.sacramentPreparation} ${hymnNumber}, ${hymnTitle}. ${text.sacramentAfterHymn}`,
    highlights: [entry?.hymnNumber ? hymnNumber : "", entry?.hymnTitle?.trim() ?? ""].filter(Boolean),
  }
}

function businessScriptForConduct(section: ConductBusinessSection, language: ContentLanguage) {
  const script = section.script.trim()
  if (!script) return ""

  if (section.category === "sustaining" || section.category === "release") {
    return `${getContentText(language).conduct.standPreamble}\n\n${script}`
  }

  return script
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function HighlightedText({
  text,
  highlights,
  className,
}: {
  text: string
  highlights?: string[]
  className?: string
}) {
  const tokens = Array.from(new Set((highlights ?? []).map((item) => item.trim()).filter(Boolean)))
    .sort((a, b) => b.length - a.length)

  if (tokens.length === 0) {
    return <span className={className}>{text}</span>
  }

  const matcher = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "g")
  const parts = text.split(matcher)
  const tokenSet = new Set(tokens)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        tokenSet.has(part) ? (
          <span key={`${part}-${index}`} className="font-semibold text-[#c9603c] dark:text-[#e07856]">
            {part}
          </span>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        )
      )}
    </span>
  )
}

function buildAgenda(meeting: ConductMeeting, language: ContentLanguage): Step[] {
  const steps: Step[] = []
  const text = getContentText(language).conduct
  const { entries, assignments, specialType } = meeting
  const announcements = meeting.announcements.filter((item) => item.checked)
  const businessCount = totalBusinessCount(meeting.businessSections)

  const getStatic = (id: string) =>
    entries.find((e): e is StaticEntry => e.kind === "static" && e.id === id)

  const hymnLine = (entry?: StaticEntry) =>
    entry?.hymnTitle?.trim()
      ? { title: `"${entry.hymnTitle}"`, hymnNum: entry.hymnNumber }
      : { title: text.hymnNotChosen }
  const welcomeScript = buildWelcomeScript(meeting, language)

  // Welcome & conducting
  steps.push({
    key: "welcome",
    eyebrow: text.welcome,
    title: announcements.length > 0 ? text.welcomeAnnouncements : text.welcome,
    meta: assignments.conductor?.trim()
      ? `${text.conductedBy} ${assignments.conductor}`
      : text.conductingUnassigned,
    script: welcomeScript.script,
    highlights: welcomeScript.highlights,
  })

  // Opening hymn and prayer
  const oh = getStatic("opening-hymn")
  const inv = getStatic("invocation")
  const openingHymn = hymnLine(oh)
  const invocationName = inv?.assigneeName?.trim()
  steps.push({
    key: "opening-hymn-prayer",
    kind: "opening-hymn-prayer",
    eyebrow: text.openingHymnPrayer,
    title: text.openingHymnPrayer,
    highlights: [oh?.hymnTitle?.trim() ?? "", invocationName ?? ""].filter(Boolean),
    details: [
      {
        label: oh?.title || getContentText(language).audience.openingHymn,
        title: openingHymn.title,
        hymnNum: openingHymn.hymnNum,
        highlights: [oh?.hymnTitle?.trim() ?? ""].filter(Boolean),
      },
      {
        label: inv?.title || getContentText(language).audience.invocation,
        title: invocationName || text.unassigned,
        highlights: invocationName ? [invocationName] : undefined,
      },
    ],
  })

  // Ward business
  if (businessCount > 0) {
    steps.push({
      key: "ward-business",
      kind: "business",
      eyebrow: text.wardBusiness,
      title: text.sustainingsBusiness,
      meta: `${businessCount} ${businessCount === 1 ? text.businessItem : text.businessItems}`,
    })
  }

  // Sacrament administration script includes the sacrament hymn details.
  const sh = getStatic("sacrament-hymn")
  const sacramentPreparation = buildSacramentPreparationScript(sh, language)

  // Sacrament ordinance
  steps.push({
    key: "sacrament-prayers",
    kind: "sacrament-prayers",
    eyebrow: text.sacrament,
    title: text.blessingPassing,
    script: sacramentPreparation.script,
    highlights: sacramentPreparation.highlights,
  })

  // Speakers / fast testimony
  if (specialType === "fast-testimony") {
    steps.push({
      key: "testimonies",
      eyebrow: text.fastMeeting,
      title: text.bearingTestimonies,
      meta: text.openToCongregation,
    })
  } else {
    const messagesStart = entries.findIndex((e) => e.id === "section-messages")
    const closingStart = entries.findIndex((e) => e.id === "section-closing")
    const messageEntries = entries.slice(
      messagesStart + 1,
      closingStart > -1 ? closingStart : undefined
    )

    const speakerCount = messageEntries.filter((e): e is SpeakerEntry => e.kind === "speaker").length
    let speakerOrder = 0

    messageEntries.forEach((entry) => {
      if (entry.kind === "speaker") {
        speakerOrder += 1
        const eyebrow =
          speakerOrder === speakerCount ? text.concludingSpeaker : `${text.speaker} ${speakerOrder}`
        const speakerName = entry.speakerName?.trim()
        steps.push({
          key: entry.id,
          eyebrow,
          title: speakerName || text.unassigned,
          meta: entry.topic?.trim() ? `"${entry.topic}"` : undefined,
          highlights: speakerName ? [speakerName, entry.topic?.trim() ?? ""] : undefined,
        })
        return
      }

      if (entry.kind === "static" && entry.removable) {
        const hl = hymnLine(entry)
        steps.push({
          key: entry.id,
          eyebrow: entry.title,
          title: hl.title,
          hymnNum: hl.hymnNum,
          highlights: [entry.hymnTitle?.trim() ?? ""].filter(Boolean),
        })
      }
    })
  }

  // Closing hymn
  const ch = getStatic("closing-hymn")
  steps.push({ key: "closing-hymn", eyebrow: ch?.title || getContentText(language).audience.closingHymn, ...hymnLine(ch) })

  // Benediction
  const ben = getStatic("benediction")
  steps.push({
    key: "benediction",
    eyebrow: ben?.title || getContentText(language).audience.benediction,
    title: ben?.assigneeName?.trim() || text.unassigned,
  })

  return steps
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function ConductItemsList({ title, items }: { title: string; items: ConductItem[] }) {
  if (items.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a867a] dark:text-[#6b6b6b]">
          {title}
        </h2>
        <div className="h-px flex-1 bg-[#e6e1d1] dark:bg-[#1f1f1f]" />
      </div>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[28px_1fr] gap-4">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-[#f0ede3] font-mono text-[11px] text-[#57544c] dark:bg-[#1f1f1f] dark:text-[#a1a1a1]">
              {index + 1}
            </div>
            <div className="min-w-0">
              <div className="font-serif text-[19px] leading-snug text-[#141413] dark:text-[#e5e5e5]">
                {item.title}
              </div>
              {!isRichTextEmpty(item.detail) ? (
                <div
                  className="mt-2 text-[14px] leading-6 text-[#57544c] dark:text-[#a1a1a1] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeRichTextHtml(ensureRichTextHtml(item.detail)),
                  }}
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ConductView({
  meeting,
  isoDate,
  language,
  notes,
  attendance,
  onNotesChange,
  onAttendanceChange,
  onBusinessItemCompletedChange,
  onClose,
}: ConductViewProps) {
  const contentLanguage = normalizeContentLanguage(language ?? meeting.contentLanguage)
  const text = getContentText(contentLanguage).conduct
  const prayerLanguage = contentLanguage === "SPA" ? "es" : "en"
  const steps = buildAgenda(meeting, contentLanguage)
  const total = steps.length
  const checkedAnnouncements = meeting.announcements.filter((item) => item.checked)
  const businessSections = meeting.businessSections

  const [mounted, setMounted] = useState(false)
  const [cur, setCur] = useState(0)
  const [prayerTab, setPrayerTab] = useState<"bread" | "water">("bread")
  const [now, setNow] = useState(new Date())
  const [notesOpen, setNotesOpen] = useState(false)
  const [attendanceOpen, setAttendanceOpen] = useState(false)
  const currentRef = useRef<HTMLDivElement | null>(null)
  const attendanceDisplay = typeof attendance === "number" ? attendance : 0
  const adjustAttendance = (delta: number) => {
    onAttendanceChange(Math.max(0, attendanceDisplay + delta))
  }
  const handleAttendanceInput = (raw: string) => {
    if (raw.trim() === "") {
      onAttendanceChange(null)
      return
    }
    const parsed = Number.parseInt(raw, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      onAttendanceChange(parsed)
    }
  }

  useEffect(() => { setMounted(true) }, [])

  // Live clock — refresh every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        Boolean(target?.isContentEditable)

      if (e.key === "Escape") {
        if (notesOpen) {
          setNotesOpen(false)
        } else if (attendanceOpen) {
          setAttendanceOpen(false)
        } else {
          onClose()
        }
        return
      }

      if (isTyping) return

      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault()
        setCur((i) => Math.min(i + 1, total - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setCur((i) => Math.max(i - 1, 0))
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [total, onClose, notesOpen, attendanceOpen])

  // Scroll current step into view
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [cur])

  const navigate = (idx: number) =>
    setCur(Math.max(0, Math.min(total - 1, idx)))

  const date = plannerSundayDateFromIso(isoDate)
  const meetingTitleFull =
    meeting.title?.trim() || formatContentDate(date, contentLanguage, "MMMM d, yyyy")
  const meetingTitleShort =
    meeting.title?.trim() || formatContentDate(date, contentLanguage, "MMM d")
  const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  const closePopups = () => {
    setNotesOpen(false)
    setAttendanceOpen(false)
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#faf9f5] dark:bg-[#0a0a0a]">
      {/* ── Topbar ── */}
      <div className="relative z-[60] flex shrink-0 items-center gap-2 border-b border-[#e6e1d1] bg-[#faf9f5] px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 dark:border-[#1f1f1f] dark:bg-[#0a0a0a]">
        <h1 className="mr-auto min-w-0 truncate font-serif text-[16px] font-normal tracking-[-0.01em] text-[#141413] sm:text-[22px] dark:text-[#e5e5e5]">
          <span className="hidden sm:inline">{meetingTitleFull}</span>
          <span className="sm:hidden">{meetingTitleShort}</span>
        </h1>

        {/* Live badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e4e6d6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6b7a3f] sm:px-2.5 sm:py-1 sm:text-[11px] dark:bg-[#1a2e1a] dark:text-[#7fb87f]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6b7a3f] dark:bg-[#7fb87f]" />
          Live
        </div>

        {/* Clock — hidden on mobile to free up space */}
        <div className="hidden shrink-0 font-mono text-[14px] tabular-nums text-[#8a867a] sm:block dark:text-[#6b6b6b]">
          {clock}
        </div>

        <div className="ml-2 hidden shrink-0 items-center gap-1.5 text-[12px] text-[#8a867a] lg:flex dark:text-[#6b6b6b]">
          <kbd className="inline-flex h-5 items-center rounded border border-[#d8d2bf] bg-white px-1 font-mono text-[10px] text-[#57544c] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1]">
            ↑
          </kbd>
          <kbd className="inline-flex h-5 items-center rounded border border-[#d8d2bf] bg-white px-1 font-mono text-[10px] text-[#57544c] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1]">
            ↓
          </kbd>
          <span>to navigate</span>
        </div>

        {/* Attendance trigger */}
        <button
          type="button"
          onClick={() => {
            setAttendanceOpen((open) => !open)
            setNotesOpen(false)
          }}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full border border-[#d8d2bf] bg-white px-2.5 py-1 text-[12.5px] text-[#57544c] transition-colors hover:bg-[#f0ede3] sm:px-3 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1] dark:hover:bg-[#252525]",
            attendanceOpen && "ring-2 ring-[#c9603c] dark:ring-[#e07856]"
          )}
          aria-label="Attendance"
        >
          <Users className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums">
            {typeof attendance === "number" ? attendance : "—"}
          </span>
        </button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 rounded-full sm:hidden"
          onClick={onClose}
          aria-label="Close conduct view"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="hidden shrink-0 rounded-full sm:inline-flex"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
          Close
          <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </Button>
      </div>

      {/* ── Agenda ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-6 sm:px-10 sm:pb-28">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="flex flex-col gap-0.5">
            {steps.map((step, i) => {
              const state: "done" | "current" | "upcoming" =
                i < cur ? "done" : i === cur ? "current" : "upcoming"
              const isSacramentCurrent = step.kind === "sacrament-prayers" && state === "current"
              const isBusinessCurrent = step.kind === "business" && state === "current"
              const isWelcomeCurrent = step.key === "welcome" && state === "current"
              const isOpeningHymnPrayerCurrent = step.kind === "opening-hymn-prayer" && state === "current"

              return (
                <div key={step.key}>
                  <div
                    ref={state === "current" ? currentRef : null}
                    onClick={() => navigate(i)}
                    className={cn(
                      "grid cursor-pointer grid-cols-[80px_1fr_auto] items-center gap-[18px] rounded-[10px] border px-[18px] py-3.5 transition-all duration-150",
                      state === "done" &&
                        "border-transparent opacity-40 hover:bg-[#f0ede3] hover:opacity-60 dark:hover:bg-[#1a1a1a]",
                      state === "upcoming" &&
                        "border-transparent hover:bg-[#f0ede3] dark:hover:bg-[#1a1a1a]",
                      state === "current" &&
                        "my-1.5 border-[#d8d2bf] bg-white px-[22px] py-5 shadow-[0_2px_8px_rgba(60,50,30,0.06),0_0_0_1px_rgba(60,50,30,0.05)] dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]"
                    )}
                  >
                    {/* Marker */}
                    <div className="flex items-center gap-2 font-mono text-[11.5px] tracking-[0.04em] text-[#8a867a] dark:text-[#6b6b6b]">
                      <div
                        className={cn(
                          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] bg-white dark:bg-[#1a1a1a]",
                          state === "done" &&
                            "border-[#8a867a] bg-[#8a867a] text-white dark:border-[#6b6b6b] dark:bg-[#6b6b6b]",
                          state === "current" &&
                            "border-[#c9603c] bg-[#c9603c] text-white dark:border-[#e07856] dark:bg-[#e07856]",
                          state === "upcoming" && "border-[#d8d2bf] dark:border-[#2a2a2a]"
                        )}
                      >
                        {state === "done" && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Body */}
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#8a867a] dark:text-[#6b6b6b]">
                        {step.eyebrow}
                      </div>
                      <div
                        className={cn(
                          "mt-0.5 font-serif font-normal text-[#141413] dark:text-[#e5e5e5]",
                          state === "done" && "line-through decoration-[#b7b3a4] dark:decoration-[#3a3a3a]",
                          state === "current" ? "text-[22px]" : "text-[18px]"
                        )}
                      >
                        {step.hymnNum && (
                          <span className="mr-1 font-serif italic text-[#c9603c] dark:text-[#e07856]">
                            №&thinsp;{step.hymnNum}
                          </span>
                        )}
                        <HighlightedText text={step.title} highlights={step.highlights} />
                      </div>
                      {step.meta && (
                        <div className="mt-0.5 text-[13px] text-[#57544c] dark:text-[#a1a1a1]">
                          <HighlightedText text={step.meta} highlights={step.highlights} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Welcome supporting card — read-aloud script + announcements */}
                  {isWelcomeCurrent && (step.script || checkedAnnouncements.length > 0) && (
                    <div className="mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-5 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] sm:p-8 dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
                      {step.script ? (
                        <p className="whitespace-pre-line font-serif text-[22px] leading-[1.62] tracking-[-0.005em] text-[#141413] dark:text-[#e5e5e5]">
                          <HighlightedText text={step.script} highlights={step.highlights} />
                        </p>
                      ) : null}

                      {checkedAnnouncements.length > 0 ? (
                        <div className={cn(step.script && "mt-6 border-t border-[#f0ece6] pt-6 sm:mt-8 sm:pt-8 dark:border-[#1f1f1f]")}>
                          <ConductItemsList title={text.announcements} items={checkedAnnouncements} />
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* Opening hymn and prayer card — consolidated details */}
                  {isOpeningHymnPrayerCurrent && step.details?.length ? (
                    <div className="mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-5 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] sm:p-8 dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
                      <div className="grid gap-5 sm:grid-cols-2">
                        {step.details.map((detail) => (
                          <div key={detail.label} className="rounded-[12px] border border-[#f0ece6] bg-[#faf9f5] p-4 dark:border-[#1f1f1f] dark:bg-[#0f0f0f]">
                            <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-[#8a867a] dark:text-[#6b6b6b]">
                              {detail.label}
                            </div>
                            <div className="mt-2 font-serif text-[22px] leading-snug text-[#141413] dark:text-[#e5e5e5]">
                              {detail.hymnNum ? (
                                <span className="mr-1 font-serif italic text-[#c9603c] dark:text-[#e07856]">
                                  №&thinsp;{detail.hymnNum}
                                </span>
                              ) : null}
                              <HighlightedText text={detail.title} highlights={detail.highlights} />
                            </div>
                            {detail.meta ? (
                              <div className="mt-1 text-[13px] text-[#57544c] dark:text-[#a1a1a1]">
                                <HighlightedText text={detail.meta} highlights={detail.highlights} />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Business card — inline under current ward business step */}
                  {isBusinessCurrent && (
                    <div className="mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-5 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] sm:p-8 dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
                      {businessSections.map((section, idx) => (
                        <section
                          key={section.category}
                          className={cn(
                            idx > 0 && "mt-6 border-t border-[#f0ece6] pt-6 sm:mt-8 sm:pt-8 dark:border-[#1f1f1f]"
                          )}
                        >
                          <div className="mb-3 flex items-center gap-3">
                            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a867a] dark:text-[#6b6b6b]">
                              {section.label}
                            </h2>
                            <span className="font-mono text-[11px] tabular-nums text-[#8a867a] dark:text-[#6b6b6b]">
                              · {section.count}
                            </span>
                            <div className="h-px flex-1 bg-[#e6e1d1] dark:bg-[#1f1f1f]" />
                          </div>
                          {businessScriptForConduct(section, contentLanguage) ? (
                            <p className="whitespace-pre-line font-serif text-[22px] leading-[1.62] tracking-[-0.005em] text-[#141413] dark:text-[#e5e5e5]">
                              <HighlightedText
                                text={businessScriptForConduct(section, contentLanguage)}
                                highlights={section.people.flatMap((person) => [
                                  person.name,
                                  person.subtitle ?? "",
                                ])}
                              />
                            </p>
                          ) : null}
                          <div className="mt-5 border-t border-[#f0ece6] pt-4 dark:border-[#1f1f1f]">
                            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.09em] text-[#8a867a] dark:text-[#6b6b6b]">
                              {text.completedBusinessItems}
                            </div>
                            <div className="space-y-2">
                              {section.people.map((person) => (
                                <button
                                  key={person.id}
                                  type="button"
                                  aria-pressed={Boolean(person.completed)}
                                  onClick={() => onBusinessItemCompletedChange?.(person.id, !person.completed)}
                                  className="flex w-full items-center gap-3 rounded-[10px] border border-[#f0ece6] bg-[#faf9f5] px-3 py-2 text-left transition-colors hover:border-[#d8d2bf] dark:border-[#1f1f1f] dark:bg-[#0f0f0f] dark:hover:border-[#2a2a2a]"
                                >
                                  <span
                                    className={cn(
                                      "grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors",
                                      person.completed
                                        ? "border-[#c9603c] bg-[#c9603c] text-white dark:border-[#e07856] dark:bg-[#e07856]"
                                        : "border-[#d8d2bf] bg-white text-transparent dark:border-[#2a2a2a] dark:bg-[#1a1a1a]"
                                    )}
                                    aria-hidden
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        "block truncate font-serif text-[16px] leading-snug text-[#141413] dark:text-[#e5e5e5]",
                                        person.completed && "line-through decoration-[#b7b3a4] dark:decoration-[#3a3a3a]"
                                      )}
                                    >
                                      {person.name}
                                    </span>
                                    {person.subtitle?.trim() ? (
                                      <span className="block truncate text-[12px] text-[#57544c] dark:text-[#a1a1a1]">
                                        {person.subtitle}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </section>
                      ))}
                    </div>
                  )}

                  {/* Sacrament prayer card — inline under current sacrament step */}
                  {isSacramentCurrent && (
                    <div className="mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-5 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] sm:p-8 dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
                      {step.script ? (
                        <p className="whitespace-pre-line font-serif text-[22px] leading-[1.62] tracking-[-0.005em] text-[#141413] dark:text-[#e5e5e5]">
                          <HighlightedText text={step.script} highlights={step.highlights} />
                        </p>
                      ) : null}

                      {/* Tabs */}
                      <div className={cn(
                        "mb-4 flex gap-6 border-b border-[#e6e1d1] dark:border-[#1f1f1f]",
                        step.script && "mt-6 border-t border-[#f0ece6] pt-6 sm:mt-8 sm:pt-8 dark:border-[#1f1f1f]"
                      )}>
                        {(["bread", "water"] as const).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPrayerTab(tab)
                            }}
                            className={cn(
                              "-mb-px border-b-[1.5px] pb-2 text-[13px] font-medium uppercase tracking-[0.06em] transition-colors",
                              prayerTab === tab
                                ? "border-[#c9603c] text-[#141413] dark:border-[#e07856] dark:text-[#e5e5e5]"
                                : "border-transparent text-[#8a867a] hover:text-[#141413] dark:text-[#6b6b6b] dark:hover:text-[#e5e5e5]"
                            )}
                          >
                            {tab === "bread" ? text.bread : text.water}
                          </button>
                        ))}
                      </div>
                      {/* Reference */}
                      <div className="mb-3 font-mono text-[11px] tracking-[0.04em] text-[#8a867a] dark:text-[#6b6b6b]">
                        {SACRAMENT_PRAYER_REFERENCES[prayerTab]}
                      </div>
                      {/* Prayer text */}
                      <p className="font-serif text-[22px] leading-[1.62] tracking-[-0.005em] text-[#141413] dark:text-[#e5e5e5]">
                        {SACRAMENT_PRAYERS[prayerLanguage][prayerTab]}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Floating toolbar ── */}
      <div className="pointer-events-none fixed bottom-6 left-0 right-0 z-[20] flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-[#d8d2bf] bg-white py-1 pl-2.5 pr-1 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] sm:gap-3 sm:py-1.5 sm:pl-4 sm:pr-1.5 dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-1 text-[12px] text-[#57544c] sm:gap-2 sm:text-[12.5px] dark:text-[#a1a1a1]">
            <span className="hidden sm:inline">{text.step}</span>
            <span className="font-mono tabular-nums">{cur + 1}</span>
            <span className="text-[#b7b3a4] dark:text-[#3a3a3a]">
              <span className="hidden sm:inline">{text.of}</span>
              <span className="sm:hidden">/</span>
            </span>
            <span className="font-mono tabular-nums">{total}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(cur - 1)}
            disabled={cur === 0}
            aria-label="Previous step"
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d2bf] bg-white text-[#57544c] transition-colors hover:bg-[#f0ede3] disabled:pointer-events-none disabled:opacity-30 sm:h-auto sm:w-auto sm:px-4 sm:py-1.5 sm:text-[13px] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1] dark:hover:bg-[#252525]"
          >
            <ChevronLeft className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{text.previous}</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(cur + 1)}
            disabled={cur === total - 1}
            aria-label="Next step"
            className="flex h-8 items-center gap-0.5 rounded-full bg-[#c9603c] px-3 text-[12.5px] font-medium text-white transition-colors hover:bg-[#b5502f] disabled:pointer-events-none disabled:opacity-40 sm:h-auto sm:px-4 sm:py-1.5 sm:text-[13px] dark:bg-[#e07856] dark:hover:bg-[#c9603c]"
          >
            <span>{text.next}</span>
            <ChevronRight className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">{text.nextStep} →</span>
          </button>
        </div>
      </div>

      {/* ── Floating notes button ──
        Mobile: icon-only circle on the same row as the step navigator.
        Desktop: text pill in the bottom-right corner.
      */}
      <button
        type="button"
        onClick={() => {
          setNotesOpen((open) => !open)
          setAttendanceOpen(false)
        }}
        className={cn(
          "fixed bottom-6 right-3 z-[20] flex items-center gap-2 rounded-full border border-[#d8d2bf] bg-white text-[13px] font-medium text-[#141413] shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)] transition-colors hover:bg-[#f0ede3] sm:right-6 dark:border-[#2a2a2a] dark:bg-[#141414] dark:text-[#e5e5e5] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)] dark:hover:bg-[#1f1f1f]",
          // Compact icon-only on mobile, text pill on desktop
          "h-10 w-10 justify-center px-0 sm:h-11 sm:w-auto sm:px-4",
          notesOpen && "ring-2 ring-[#c9603c] dark:ring-[#e07856]"
        )}
        aria-label="Meeting notes"
      >
        <NotebookPen className="h-4 w-4" />
        <span className="hidden sm:inline">Notes</span>
        {!isRichTextEmpty(notes) && !notesOpen && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#c9603c] sm:static sm:ml-0.5 dark:bg-[#e07856]" />
        )}
      </button>

      {/* ── Outside-click backdrop ── */}
      {(notesOpen || attendanceOpen) && (
        <div
          className="fixed inset-0 z-[40] bg-transparent"
          onClick={closePopups}
          aria-hidden
        />
      )}

      {/* ── Attendance popover ── */}
      {attendanceOpen && (
        <div className="fixed right-3 top-[58px] z-[50] w-[min(280px,calc(100vw-1.5rem))] rounded-[12px] border border-[#d8d2bf] bg-white p-4 shadow-[0_12px_40px_rgba(60,50,30,0.18),0_0_0_1px_rgba(60,50,30,0.05)] sm:right-6 sm:top-[68px] dark:border-[#2a2a2a] dark:bg-[#141414] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a867a] dark:text-[#6b6b6b]">
            Attendance
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => adjustAttendance(-1)}
              disabled={attendanceDisplay === 0}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#d8d2bf] bg-white text-[#57544c] transition-colors hover:bg-[#f0ede3] disabled:pointer-events-none disabled:opacity-40 dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1] dark:hover:bg-[#252525]"
              aria-label="Decrease attendance"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={attendance ?? ""}
              placeholder="0"
              onChange={(event) => handleAttendanceInput(event.target.value)}
              className="h-9 w-20 rounded-md border border-[#d8d2bf] bg-white text-center font-mono text-base tabular-nums text-[#141413] outline-none focus:ring-2 focus:ring-[#c9603c] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#e5e5e5] dark:focus:ring-[#e07856]"
            />
            <button
              type="button"
              onClick={() => adjustAttendance(1)}
              className="grid h-9 w-9 place-items-center rounded-full border border-[#d8d2bf] bg-white text-[#57544c] transition-colors hover:bg-[#f0ede3] dark:border-[#2a2a2a] dark:bg-[#1a1a1a] dark:text-[#a1a1a1] dark:hover:bg-[#252525]"
              aria-label="Increase attendance"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[11.5px] leading-snug text-[#8a867a] dark:text-[#6b6b6b]">
            {text.attendanceHelp}
          </p>
        </div>
      )}

      {/* ── Notes panel ──
        Mobile: full sheet anchored below the topbar — fills dynamic viewport
        height so it sits above the on-screen keyboard. Editor scrolls inside.
        Desktop: floating panel anchored above the floating Notes button,
        same height as before (header + ~280px editor).
      */}
      {notesOpen && (
        <div
          className={cn(
            "fixed z-[50] flex flex-col bg-white shadow-[0_20px_60px_rgba(60,50,30,0.18),0_0_0_1px_rgba(60,50,30,0.05)] dark:bg-[#141414] dark:shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)]",
            // Mobile sheet
            "inset-x-0 bottom-0 top-[58px] border-t border-[#d8d2bf] dark:border-[#2a2a2a]",
            // Desktop floating panel — sits above the floating Notes button
            "sm:inset-auto sm:bottom-[80px] sm:right-6 sm:top-auto sm:max-h-[calc(100dvh-148px)] sm:w-[420px] sm:rounded-[14px] sm:border"
          )}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e6e1d1] px-4 py-3 dark:border-[#1f1f1f]">
            <div className="flex items-center gap-2">
              <NotebookPen className="h-4 w-4 text-[#8a867a] dark:text-[#6b6b6b]" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#57544c] dark:text-[#a1a1a1]">
                {text.meetingNotes}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setNotesOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full text-[#8a867a] transition-colors hover:bg-[#f0ede3] hover:text-[#141413] dark:text-[#6b6b6b] dark:hover:bg-[#1f1f1f] dark:hover:text-[#e5e5e5]"
              aria-label="Close notes"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <RichTextEditor
              bare
              contentMinHeightClass="min-h-[280px]"
              content={ensureRichTextHtml(notes)}
              onSave={async (html) => {
                onNotesChange(html)
              }}
              placeholder={text.notesPlaceholder}
            />
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}
