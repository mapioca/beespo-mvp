"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { format } from "date-fns"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"
type AssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"
type AgendaAssigneeField = "invocation" | "benediction"

type SectionEntry = {
  id: string
  kind: "section"
  title: string
}

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

type TestimonyEntry = {
  id: string
  kind: "testimony"
  title: string
  detail: string
}

type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry

type AudienceMeeting = {
  title?: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  entries: AgendaEntry[]
}

type AudienceViewProps = {
  unitName: string
  isoDate: string
  meeting: AudienceMeeting
  onClose: () => void
}

const MEETING_TYPE_LABELS: Record<MeetingSpecialType, string> = {
  standard: "Sacrament meeting",
  "fast-testimony": "Fast & Testimony Meeting",
  "general-conference": "General Conference",
  "stake-conference": "Stake Conference",
  "ward-conference": "Ward Conference",
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function getStaticEntry(entries: AgendaEntry[], id: string) {
  return entries.find((entry): entry is StaticEntry => entry.kind === "static" && entry.id === id)
}

function getAudienceSubtitle(meeting: AudienceMeeting) {
  return meeting.specialType === "standard"
    ? meeting.title?.trim() || "Sacrament meeting"
    : MEETING_TYPE_LABELS[meeting.specialType]
}

function romanize(index: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][index - 1] || String(index)
}

function quoteTitle(title: string) {
  return title ? `"${title}"` : "-"
}

function isMusicalEntry(entry: StaticEntry) {
  return Boolean(
    entry.removable && (entry.title.toLowerCase().includes("hymn") || entry.title.toLowerCase().includes("number"))
  )
}

export function SacramentMeetingAudienceView({
  unitName,
  isoDate,
  meeting,
  onClose,
}: AudienceViewProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const entries = meeting.entries
  const openingHymn = getStaticEntry(entries, "opening-hymn")
  const invocation = getStaticEntry(entries, "invocation")
  const sacramentHymn = getStaticEntry(entries, "sacrament-hymn")
  const closingHymn = getStaticEntry(entries, "closing-hymn")
  const benediction = getStaticEntry(entries, "benediction")
  const speakers = entries.filter((entry): entry is SpeakerEntry => entry.kind === "speaker")
  const musicalEntries = entries.filter((entry): entry is StaticEntry => entry.kind === "static" && isMusicalEntry(entry))
  const hasSpeakerNames = speakers.some((speaker) => speaker.speakerName.trim())
  const date = plannerSundayDateFromIso(isoDate)

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-card">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-end bg-card/90 px-4 backdrop-blur">
        <Button type="button" variant="outline" className="rounded-full" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
          Close
          <kbd className="ml-1 hidden rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </Button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
        <article className="w-full max-w-[560px] rounded-[2px] border border-border bg-background px-7 py-10 shadow-lg sm:px-14 sm:py-16">
          <header className="border-b border-border pb-7 text-center">
            <div className="font-serif text-[13px] italic tracking-[0.02em] text-muted-foreground">
              The Church of Jesus Christ
            </div>
            <h1 className="mt-2 font-serif text-[28px] font-normal tracking-[-0.01em] text-foreground">
              {unitName}
            </h1>
            <div className="mt-1.5 text-[13.5px] text-muted-foreground">Sacrament Meeting</div>
            <div className="mt-4 font-serif text-[15px] italic text-muted-foreground">
              {format(date, "EEEE, MMMM d, yyyy")}
            </div>
            <div className="mt-1 text-[12.5px] text-muted-foreground/70">{getAudienceSubtitle(meeting)}</div>
          </header>

          <AudienceRule />

          <section className="py-1.5">
            <AudienceRole label="Presiding" value={meeting.assignments.presiding} />
            <AudienceRole label="Conducting" value={meeting.assignments.conductor} />
            <AudienceRole label="Chorister" value={meeting.assignments.chorister} />
            <AudienceRole label="Organist" value={meeting.assignments.accompanist} />
          </section>

          <AudienceRule />

          <AudienceSectionLabel>opening</AudienceSectionLabel>
          <AudienceHymn kind="Opening Hymn" entry={openingHymn} />
          <AudienceCenteredRow label="Invocation" value={invocation?.assigneeName} />

          <AudienceRule />

          <AudienceSectionLabel>the sacrament</AudienceSectionLabel>
          <AudienceHymn kind="Sacrament Hymn" entry={sacramentHymn} />
          <div className="py-2.5 text-center font-serif text-[14.5px] italic text-muted-foreground">
            Administration of the Sacrament
          </div>

          <AudienceRule />

          {meeting.specialType === "fast-testimony" ? (
            <>
              <AudienceSectionLabel>bearing of testimonies</AudienceSectionLabel>
              <div className="px-3 pb-1 pt-3 text-center font-serif text-[15px] italic leading-7 text-muted-foreground">
                The remainder of this meeting will be devoted to the bearing of testimonies
              </div>
            </>
          ) : (
            <>
              <AudienceSectionLabel>speakers</AudienceSectionLabel>
              {musicalEntries.map((entry) => (
                <AudienceSpeaker
                  key={entry.id}
                  eyebrow={entry.title}
                  name={entry.hymnTitle || "Musical number"}
                  topic={entry.hymnNumber ? `Hymn No. ${entry.hymnNumber}` : undefined}
                  musical
                />
              ))}
              {hasSpeakerNames ? (
                speakers
                  .filter((speaker) => speaker.speakerName.trim())
                  .map((speaker, index, assignedSpeakers) => (
                    <AudienceSpeaker
                      key={speaker.id}
                      eyebrow={index === assignedSpeakers.length - 1 ? "Concluding Speaker" : `Speaker ${romanize(index + 1)}`}
                      name={speaker.speakerName}
                      topic={speaker.topic ? quoteTitle(speaker.topic) : undefined}
                    />
                  ))
              ) : (
                <div className="py-4 text-center font-serif text-[15px] italic text-muted-foreground/60">
                  Speakers to be announced
                </div>
              )}
            </>
          )}

          <AudienceRule />

          <AudienceSectionLabel>closing</AudienceSectionLabel>
          <AudienceHymn kind="Closing Hymn" entry={closingHymn} />
          <AudienceCenteredRow label="Benediction" value={benediction?.assigneeName} />

          <footer className="mt-8 border-t border-border pt-6 text-center text-[11.5px] leading-7 text-muted-foreground/70">
            <div className="mx-auto mb-4 max-w-[340px] font-serif text-[13px] italic leading-6 text-muted-foreground">
              &quot;For where two or three are gathered together in my name, there am I in the midst of them.&quot;
            </div>
            <div>Matthew 18:20</div>
          </footer>
        </article>
      </div>
    </div>,
    document.body
  )
}

function AudienceRule() {
  return <div className="mx-auto my-7 h-px w-12 bg-border" />
}

function AudienceSectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-3 mt-7 text-center font-serif text-[12.5px] italic lowercase tracking-[0.1em] text-muted-foreground/70">
      {children}
    </div>
  )
}

function AudienceRole({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-1.5">
      <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground/70">{label}</div>
      <div className="text-right font-serif text-[16px] tracking-[-0.005em] text-foreground">
        {value?.trim() || "-"}
      </div>
    </div>
  )
}

function AudienceHymn({ kind, entry }: { kind: string; entry?: StaticEntry }) {
  const title = entry?.hymnTitle?.trim()

  return (
    <div className="py-3.5 text-center">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/70">{kind}</div>
      <div
        className={cn(
          "mt-1 font-serif text-[20px] font-normal italic",
          title ? "text-foreground" : "text-muted-foreground/50"
        )}
      >
        {title ? quoteTitle(title) : "-"}
      </div>
      {title && typeof entry?.hymnNumber === "number" ? (
        <div className="mt-1 font-serif text-[14px] italic text-brand">Hymn No. {entry.hymnNumber}</div>
      ) : null}
    </div>
  )
}

function AudienceCenteredRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mt-1.5 block py-2.5 text-center">
      <div className="text-center text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground/70">{label}</div>
      <div className="mt-1 text-center font-serif text-[16px] tracking-[-0.005em] text-foreground">
        {value?.trim() || "-"}
      </div>
    </div>
  )
}

function AudienceSpeaker({
  eyebrow,
  name,
  topic,
  musical = false,
}: {
  eyebrow: string
  name: string
  topic?: string
  musical?: boolean
}) {
  return (
    <div className="py-[18px] text-center">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/70">{eyebrow}</div>
      <div
        className={cn(
          "mt-1 font-serif font-normal tracking-[-0.01em] text-foreground",
          musical ? "text-[19px] italic" : "text-[22px]"
        )}
      >
        {name || "-"}
      </div>
      {topic ? <div className="mt-1 font-serif text-[14px] italic text-muted-foreground">{topic}</div> : null}
    </div>
  )
}
