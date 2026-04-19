"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { Check, X } from "lucide-react"
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
  durationMinutes: number | null
}
type TestimonyEntry = { id: string; kind: "testimony"; title: string; detail: string }
type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry

export type ConductMeeting = {
  title?: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  entries: AgendaEntry[]
  announcements: string
}

export type ConductViewProps = {
  meeting: ConductMeeting
  isoDate: string
  onClose: () => void
}

// ─── Sacrament prayers ───────────────────────────────────────────────────────

const SACRAMENT_PRAYERS = {
  bread: {
    reference: "Moroni 4:3 · D&C 20:77",
    text: "O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this bread to the souls of all those who partake of it, that they may eat in remembrance of the body of thy Son, and witness unto thee, O God, the Eternal Father, that they are willing to take upon them the name of thy Son, and always remember him, and keep his commandments which he hath given them, that they may always have his Spirit to be with them. Amen.",
  },
  water: {
    reference: "Moroni 5:2 · D&C 20:79",
    text: "O God, the Eternal Father, we ask thee in the name of thy Son, Jesus Christ, to bless and sanctify this water to the souls of all those who drink of it, that they may do it in remembrance of the blood of thy Son, which was shed for them; that they may witness unto thee, O God, the Eternal Father, that they do always remember him, that they may have his Spirit to be with them. Amen.",
  },
}

// ─── Step type ───────────────────────────────────────────────────────────────

type Step = {
  key: string
  eyebrow: string
  title: string
  meta?: string
  hymnNum?: number
  kind?: "sacrament-prayers"
}

// ─── Build agenda steps from meeting data ────────────────────────────────────

function buildAgenda(meeting: ConductMeeting): Step[] {
  const steps: Step[] = []
  const { entries, assignments, specialType, announcements } = meeting

  const getStatic = (id: string) =>
    entries.find((e): e is StaticEntry => e.kind === "static" && e.id === id)

  const hymnLine = (entry?: StaticEntry) =>
    entry?.hymnTitle?.trim()
      ? { title: `"${entry.hymnTitle}"`, hymnNum: entry.hymnNumber }
      : { title: "Hymn not chosen" }

  // Welcome & conducting
  steps.push({
    key: "welcome",
    eyebrow: "Welcome",
    title: "Welcome & announcements",
    meta: assignments.conductor?.trim()
      ? `Conducted by ${assignments.conductor}`
      : "Conducting: unassigned",
  })

  // Opening hymn
  const oh = getStatic("opening-hymn")
  steps.push({ key: "opening-hymn", eyebrow: "Opening Hymn", ...hymnLine(oh) })

  // Invocation
  const inv = getStatic("invocation")
  steps.push({
    key: "invocation",
    eyebrow: "Invocation",
    title: inv?.assigneeName?.trim() || "Unassigned",
  })

  // Ward business / announcements
  if (announcements?.trim()) {
    steps.push({
      key: "ward-business",
      eyebrow: "Ward Business",
      title: "Sustainings & business",
    })
  }

  // Sacrament hymn
  const sh = getStatic("sacrament-hymn")
  steps.push({ key: "sacrament-hymn", eyebrow: "Sacrament Hymn", ...hymnLine(sh) })

  // Sacrament ordinance
  steps.push({
    key: "sacrament-prayers",
    kind: "sacrament-prayers",
    eyebrow: "The Sacrament",
    title: "Blessing & passing of the sacrament",
  })

  // Speakers / fast testimony
  if (specialType === "fast-testimony") {
    steps.push({
      key: "testimonies",
      eyebrow: "Fast Meeting",
      title: "Bearing of testimonies",
      meta: "Open to congregation",
    })
  } else {
    const messagesStart = entries.findIndex((e) => e.id === "section-messages")
    const closingStart = entries.findIndex((e) => e.id === "section-closing")
    const messageEntries = entries.slice(
      messagesStart + 1,
      closingStart > -1 ? closingStart : undefined
    )

    const speakers = messageEntries.filter((e): e is SpeakerEntry => e.kind === "speaker")
    const musicalEntries = messageEntries.filter(
      (e): e is StaticEntry => e.kind === "static" && Boolean(e.removable)
    )

    musicalEntries.forEach((entry) => {
      const hl = hymnLine(entry)
      steps.push({
        key: entry.id,
        eyebrow: entry.title,
        title: hl.title,
        hymnNum: hl.hymnNum,
      })
    })

    speakers.forEach((entry, i) => {
      const eyebrow =
        i === speakers.length - 1 ? "Concluding Speaker" : `Speaker ${i + 1}`
      steps.push({
        key: entry.id,
        eyebrow,
        title: entry.speakerName?.trim() || "Unassigned",
        meta: entry.topic?.trim() ? `"${entry.topic}"` : undefined,
      })
    })
  }

  // Closing hymn
  const ch = getStatic("closing-hymn")
  steps.push({ key: "closing-hymn", eyebrow: "Closing Hymn", ...hymnLine(ch) })

  // Benediction
  const ben = getStatic("benediction")
  steps.push({
    key: "benediction",
    eyebrow: "Benediction",
    title: ben?.assigneeName?.trim() || "Unassigned",
  })

  return steps
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ConductView({ meeting, isoDate, onClose }: ConductViewProps) {
  const steps = buildAgenda(meeting)
  const total = steps.length

  const [mounted, setMounted] = useState(false)
  const [cur, setCur] = useState(0)
  const [prayerTab, setPrayerTab] = useState<"bread" | "water">("bread")
  const [now, setNow] = useState(new Date())
  const currentRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // Live clock — refresh every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault()
        setCur((i) => Math.min(i + 1, total - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setCur((i) => Math.max(i - 1, 0))
      } else if (e.key === "Escape") {
        onClose()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [total, onClose])

  // Scroll current step into view
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" })
  }, [cur])

  const navigate = (idx: number) =>
    setCur(Math.max(0, Math.min(total - 1, idx)))

  const date = plannerSundayDateFromIso(isoDate)
  const meetingTitle =
    meeting.title?.trim() || format(date, "MMMM d, yyyy")
  const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden bg-[#faf9f5]">
      {/* ── Topbar ── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[#e6e1d1] px-6 py-3">
        <button
          type="button"
          onClick={onClose}
          className="mr-2 inline-flex items-center gap-1.5 text-[13px] text-[#8a867a] transition-colors hover:text-[#141413]"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>

        {/* Live badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-[#e4e6d6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6b7a3f]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#6b7a3f]" />
          Live
        </div>

        <h1 className="font-serif text-[22px] font-normal tracking-[-0.01em] text-[#141413]">
          {meetingTitle}
        </h1>

        <div className="ml-auto font-mono text-[14px] tabular-nums text-[#8a867a]">
          {clock}
        </div>

        <div className="ml-4 hidden items-center gap-1.5 text-[12px] text-[#8a867a] lg:flex">
          <kbd className="inline-flex h-5 items-center rounded border border-[#d8d2bf] bg-white px-1 font-mono text-[10px] text-[#57544c]">
            ↑
          </kbd>
          <kbd className="inline-flex h-5 items-center rounded border border-[#d8d2bf] bg-white px-1 font-mono text-[10px] text-[#57544c]">
            ↓
          </kbd>
          <span>to navigate</span>
        </div>
      </div>

      {/* ── Agenda ── */}
      <div className="flex-1 overflow-y-auto px-10 pb-28 pt-6">
        <div className="mx-auto w-full max-w-[900px]">
          <div className="flex flex-col gap-0.5">
            {steps.map((step, i) => {
              const state: "done" | "current" | "upcoming" =
                i < cur ? "done" : i === cur ? "current" : "upcoming"
              const isSacramentCurrent = step.kind === "sacrament-prayers" && state === "current"
              const isWelcomeCurrent = step.key === "welcome" && state === "current"

              return (
                <div key={step.key}>
                  <div
                    ref={state === "current" ? currentRef : null}
                    onClick={() => navigate(i)}
                    className={cn(
                      "grid cursor-pointer grid-cols-[80px_1fr_auto] items-center gap-[18px] rounded-[10px] border px-[18px] py-3.5 transition-all duration-150",
                      state === "done" &&
                        "border-transparent opacity-40 hover:bg-[#f0ede3] hover:opacity-60",
                      state === "upcoming" &&
                        "border-transparent hover:bg-[#f0ede3]",
                      state === "current" &&
                        "my-1.5 border-[#d8d2bf] bg-white px-[22px] py-5 shadow-[0_2px_8px_rgba(60,50,30,0.06),0_0_0_1px_rgba(60,50,30,0.05)]"
                    )}
                  >
                    {/* Marker */}
                    <div className="flex items-center gap-2 font-mono text-[11.5px] tracking-[0.04em] text-[#8a867a]">
                      <div
                        className={cn(
                          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] bg-white",
                          state === "done" &&
                            "border-[#8a867a] bg-[#8a867a] text-white",
                          state === "current" &&
                            "border-[#c9603c] bg-[#c9603c] text-white",
                          state === "upcoming" && "border-[#d8d2bf]"
                        )}
                      >
                        {state === "done" && <Check className="h-2.5 w-2.5" />}
                      </div>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                    </div>

                    {/* Body */}
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-[#8a867a]">
                        {step.eyebrow}
                      </div>
                      <div
                        className={cn(
                          "mt-0.5 font-serif font-normal text-[#141413]",
                          state === "done" && "line-through decoration-[#b7b3a4]",
                          state === "current" ? "text-[22px]" : "text-[18px]"
                        )}
                      >
                        {step.hymnNum && (
                          <span className="mr-1 font-serif italic text-[#c9603c]">
                            №&thinsp;{step.hymnNum}
                          </span>
                        )}
                        {step.title}
                      </div>
                      {step.meta && (
                        <div className="mt-0.5 text-[13px] text-[#57544c]">{step.meta}</div>
                      )}
                    </div>
                  </div>

                  {/* Presidency card — inline under current welcome step */}
                  {isWelcomeCurrent && (
                    <div className="mx-4 mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-8 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)]">
                      {(
                        [
                          { label: "Presiding",       value: meeting.assignments.presiding },
                          { label: "Conducting",      value: meeting.assignments.conductor },
                          { label: "Chorister",       value: meeting.assignments.chorister },
                          { label: "Piano / Organist",value: meeting.assignments.accompanist },
                        ] as const
                      ).map(({ label, value }, idx, arr) => (
                        <div key={label}>
                          <div className="flex items-baseline justify-between gap-6 py-3">
                            <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-[#8a867a]">
                              {label}
                            </div>
                            <div className="font-serif text-[18px] tracking-[-0.005em] text-[#141413]">
                              {value?.trim() || <span className="italic text-[#b7b3a4]">—</span>}
                            </div>
                          </div>
                          {idx < arr.length - 1 && (
                            <div className="h-px bg-[#f0ece6]" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Sacrament prayer card — inline under current sacrament step */}
                  {isSacramentCurrent && (
                    <div className="mx-4 mb-1.5 rounded-[14px] border border-[#d8d2bf] bg-white p-8 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)]">
                      {/* Tabs */}
                      <div className="mb-4 flex gap-6 border-b border-[#e6e1d1]">
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
                                ? "border-[#c9603c] text-[#141413]"
                                : "border-transparent text-[#8a867a] hover:text-[#141413]"
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      {/* Reference */}
                      <div className="mb-3 font-mono text-[11px] tracking-[0.04em] text-[#8a867a]">
                        {SACRAMENT_PRAYERS[prayerTab].reference}
                      </div>
                      {/* Prayer text */}
                      <p className="font-serif text-[22px] leading-[1.62] tracking-[-0.005em] text-[#141413]">
                        {SACRAMENT_PRAYERS[prayerTab].text}
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
      <div className="pointer-events-none fixed bottom-6 left-0 right-0 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-[#d8d2bf] bg-white py-1.5 pl-4 pr-1.5 shadow-[0_12px_40px_rgba(60,50,30,0.10),0_0_0_1px_rgba(60,50,30,0.05)]">
          <div className="flex items-center gap-2 text-[12.5px] text-[#57544c]">
            <span>Step {cur + 1}</span>
            <span className="text-[#b7b3a4]">of</span>
            <span>{total}</span>
          </div>
          <button
            type="button"
            onClick={() => navigate(cur - 1)}
            disabled={cur === 0}
            className="rounded-full border border-[#d8d2bf] bg-white px-4 py-1.5 text-[13px] text-[#57544c] transition-colors hover:bg-[#f0ede3] disabled:pointer-events-none disabled:opacity-30"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => navigate(cur + 1)}
            disabled={cur === total - 1}
            className="rounded-full bg-[#c9603c] px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#b5502f] disabled:pointer-events-none disabled:opacity-40"
          >
            Next step →
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
