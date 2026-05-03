import { format } from "date-fns"

import { cn } from "@/lib/utils"

export type AudienceMeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"

export type AudienceAssignmentField = "presiding" | "conductor" | "chorister" | "accompanist"
export type AudienceAgendaAssigneeField = "invocation" | "benediction"

export type AudienceSectionEntry = {
  id: string
  kind: "section"
  title: string
}

export type AudienceStaticEntry = {
  id: string
  kind: "static"
  title: string
  detail?: string
  assigneeField?: AudienceAgendaAssigneeField
  assigneeName?: string
  hymnId?: string
  hymnNumber?: number
  hymnTitle?: string
  removable?: boolean
}

export type AudienceSpeakerEntry = {
  id: string
  kind: "speaker"
  title: string
  speakerName: string
  topic: string
  durationMinutes: number | null
}

export type AudienceTestimonyEntry = {
  id: string
  kind: "testimony"
  title: string
  detail: string
}

export type AudienceAgendaEntry =
  | AudienceSectionEntry
  | AudienceStaticEntry
  | AudienceSpeakerEntry
  | AudienceTestimonyEntry

export type AudienceMeeting = {
  title?: string
  specialType: AudienceMeetingSpecialType
  assignments: Record<AudienceAssignmentField, string>
  entries: AudienceAgendaEntry[]
}

const MEETING_TYPE_LABELS: Record<AudienceMeetingSpecialType, string> = {
  standard: "Sacrament Meeting",
  "fast-testimony": "Fast & Testimony Meeting",
  "general-conference": "General Conference",
  "stake-conference": "Stake Conference",
  "ward-conference": "Ward Conference",
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function getStaticEntry(entries: AudienceAgendaEntry[], id: string) {
  return entries.find(
    (entry): entry is AudienceStaticEntry => entry.kind === "static" && entry.id === id,
  )
}

function getAudienceSubtitle(meeting: AudienceMeeting) {
  return meeting.title?.trim() || MEETING_TYPE_LABELS[meeting.specialType]
}

function romanize(index: number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"][index - 1] || String(index)
}

function quoteTitle(title: string) {
  return title ? `"${title}"` : "-"
}

function isMusicalEntry(entry: AudienceStaticEntry) {
  return Boolean(
    entry.removable &&
      (entry.title.toLowerCase().includes("hymn") || entry.title.toLowerCase().includes("number")),
  )
}

type AudienceProgramProps = {
  unitName: string
  isoDate: string
  meeting: AudienceMeeting
  className?: string
}

export function AudienceProgram({ unitName, isoDate, meeting, className }: AudienceProgramProps) {
  const entries = meeting.entries
  const openingHymn = getStaticEntry(entries, "opening-hymn")
  const invocation = getStaticEntry(entries, "invocation")
  const sacramentHymn = getStaticEntry(entries, "sacrament-hymn")
  const closingHymn = getStaticEntry(entries, "closing-hymn")
  const benediction = getStaticEntry(entries, "benediction")
  const speakers = entries.filter((entry): entry is AudienceSpeakerEntry => entry.kind === "speaker")
  const musicalEntries = entries.filter(
    (entry): entry is AudienceStaticEntry => entry.kind === "static" && isMusicalEntry(entry),
  )
  const hasSpeakerNames = speakers.some((speaker) => speaker.speakerName.trim())
  const date = plannerSundayDateFromIso(isoDate)

  return (
    <article
      className={cn("w-full max-w-[560px] px-5 py-8 sm:px-14 sm:py-16", className)}
    >
      <header className="border-b border-border pb-7 text-center">
        <div className="font-serif text-[13px] italic tracking-[0.02em] text-muted-foreground">
          {unitName}
        </div>
        <h1 className="mt-2 font-serif text-[24px] font-normal tracking-[-0.01em] text-foreground sm:text-[28px]">
          {getAudienceSubtitle(meeting)}
        </h1>
        <div className="mt-4 font-serif text-[15px] italic text-muted-foreground">
          {format(date, "EEEE, MMMM d, yyyy")}
        </div>
        <div className="mt-1 text-[12.5px] text-muted-foreground/70">9:00 AM</div>
      </header>

      <AudienceRule />

      <section className="py-1.5">
        <AudienceRole label="Presiding" value={meeting.assignments.presiding} />
        <AudienceRole label="Conducting" value={meeting.assignments.conductor} />
        <AudienceRole label="Chorister" value={meeting.assignments.chorister} />
        <AudienceRole label="Organist" value={meeting.assignments.accompanist} />
      </section>

      <AudienceRule />

      <AudienceSectionLabel>Greeting & Welcome</AudienceSectionLabel>
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
                  eyebrow={
                    index === assignedSpeakers.length - 1
                      ? "Concluding Speaker"
                      : `Speaker ${romanize(index + 1)}`
                  }
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
      <div className="text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground/70">
        {label}
      </div>
      <div className="text-right font-serif text-[16px] tracking-[-0.005em] text-foreground">
        {value?.trim() || "-"}
      </div>
    </div>
  )
}

function AudienceHymn({ kind, entry }: { kind: string; entry?: AudienceStaticEntry }) {
  const title = entry?.hymnTitle?.trim()

  return (
    <div className="py-3.5 text-center">
      <div className="text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground/70">{kind}</div>
      <div
        className={cn(
          "mt-1 font-serif text-[20px] font-normal italic",
          title ? "text-foreground" : "text-muted-foreground/50",
        )}
      >
        {title ? quoteTitle(title) : "-"}
      </div>
      {title && typeof entry?.hymnNumber === "number" ? (
        <div className="mt-1 font-serif text-[14px] italic text-brand">
          Hymn No. {entry.hymnNumber}
        </div>
      ) : null}
    </div>
  )
}

function AudienceCenteredRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="mt-1.5 block py-2.5 text-center">
      <div className="text-center text-[11px] font-medium uppercase tracking-[0.09em] text-muted-foreground/70">
        {label}
      </div>
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
          musical ? "text-[19px] italic" : "text-[22px]",
        )}
      >
        {name || "-"}
      </div>
      {topic ? <div className="mt-1 font-serif text-[14px] italic text-muted-foreground">{topic}</div> : null}
    </div>
  )
}
