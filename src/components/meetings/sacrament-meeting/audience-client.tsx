"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { addDays, format, startOfDay } from "date-fns"

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
type SacramentAssignmentRole = "blessing" | "passing"
type Lang = "ENG" | "SPA"

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

type PlannerMeetingState = {
  title?: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  sacramentAssignments: Record<SacramentAssignmentRole, string[]>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

type PlannerDraft = {
  meetingsByDate?: Record<string, Partial<PlannerMeetingState>>
  meetingTypeOverridesByDate?: Record<string, boolean>
}

type AudienceClientProps = {
  unitName: string
  defaultLanguage?: Lang
}

const PLANNER_DRAFT_STORAGE_KEY = "beespo:sacrament-meeting:planner:draft:v1"

const MEETING_TYPE_LABELS: Record<MeetingSpecialType, string> = {
  standard: "Sacrament meeting",
  "fast-testimony": "Fast & Testimony Meeting",
  "general-conference": "General Conference",
  "stake-conference": "Stake Conference",
  "ward-conference": "Ward Conference",
}

const ENTRY_LABELS: Record<string, Record<Lang, string>> = {
  "section-opening": { ENG: "Opening", SPA: "Apertura" },
  "opening-hymn": { ENG: "Opening Hymn", SPA: "Himno de Apertura" },
  invocation: { ENG: "Invocation", SPA: "Primera Oración" },
  "ward-business": { ENG: "Ward Business", SPA: "Asuntos del Barrio" },
  "section-ordinance": { ENG: "Sacrament", SPA: "Santa Cena" },
  "sacrament-hymn": { ENG: "Sacrament Hymn", SPA: "Himno Sacramental" },
  "sacrament-ordinance": {
    ENG: "Administration of the Sacrament",
    SPA: "Administración de la Santa Cena",
  },
  "section-messages": { ENG: "Messages", SPA: "Mensajes" },
  "section-closing": { ENG: "Closing", SPA: "Clausura" },
  "closing-hymn": { ENG: "Closing Hymn", SPA: "Himno de Clausura" },
  benediction: { ENG: "Benediction", SPA: "Última Oración" },
}

function getSundayOnOrAfter(date: Date): Date {
  const normalizedDate = startOfDay(date)
  const currentDay = normalizedDate.getDay()
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay
  return addDays(normalizedDate, daysUntilSunday)
}

function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd")
}

function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

function isFirstSundayOfMonth(isoDate: string) {
  return plannerSundayDateFromIso(isoDate).getDate() <= 7
}

function isGeneralConferenceSunday(isoDate: string) {
  const date = plannerSundayDateFromIso(isoDate)
  const month = date.getMonth()
  return (month === 3 || month === 9) && isFirstSundayOfMonth(isoDate)
}

function getDefaultMeetingSpecialType(isoDate: string): MeetingSpecialType {
  if (isGeneralConferenceSunday(isoDate)) return "general-conference"
  if (isFirstSundayOfMonth(isoDate)) return "fast-testimony"
  return "standard"
}

function createStandardEntries(isoDate: string, lang: Lang = "ENG"): AgendaEntry[] {
  const t = (id: string) => ENTRY_LABELS[id]?.[lang] ?? ENTRY_LABELS[id]?.ENG ?? id
  return [
    { id: "section-opening", kind: "section", title: t("section-opening") },
    { id: "opening-hymn", kind: "static", title: t("opening-hymn"), hymnId: "", hymnTitle: "" },
    { id: "invocation", kind: "static", title: t("invocation"), assigneeField: "invocation", assigneeName: "" },
    { id: "ward-business", kind: "static", title: t("ward-business") },
    { id: "section-ordinance", kind: "section", title: t("section-ordinance") },
    { id: "sacrament-hymn", kind: "static", title: t("sacrament-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: t("sacrament-ordinance"),
      detail: lang === "SPA" ? "Bendición y distribución de la santa cena" : "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: t("section-messages") },
    {
      id: `${isoDate}-speaker-1`,
      kind: "speaker",
      title: lang === "SPA" ? "Discursante" : "Speaker",
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    {
      id: `${isoDate}-speaker-2`,
      kind: "speaker",
      title: lang === "SPA" ? "Discursante" : "Speaker",
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    { id: "section-closing", kind: "section", title: t("section-closing") },
    { id: "closing-hymn", kind: "static", title: t("closing-hymn"), hymnId: "", hymnTitle: "" },
    { id: "benediction", kind: "static", title: t("benediction"), assigneeField: "benediction", assigneeName: "" },
  ]
}

function createFastEntries(lang: Lang = "ENG"): AgendaEntry[] {
  const t = (id: string) => ENTRY_LABELS[id]?.[lang] ?? ENTRY_LABELS[id]?.ENG ?? id
  return [
    { id: "section-opening", kind: "section", title: t("section-opening") },
    { id: "opening-hymn", kind: "static", title: t("opening-hymn"), hymnId: "", hymnTitle: "" },
    { id: "invocation", kind: "static", title: t("invocation"), assigneeField: "invocation", assigneeName: "" },
    { id: "ward-business", kind: "static", title: t("ward-business") },
    { id: "section-ordinance", kind: "section", title: t("section-ordinance") },
    { id: "sacrament-hymn", kind: "static", title: t("sacrament-hymn"), hymnId: "", hymnTitle: "" },
    {
      id: "sacrament-ordinance",
      kind: "static",
      title: t("sacrament-ordinance"),
      detail: lang === "SPA" ? "Bendición y distribución de la santa cena" : "Blessing and passing of the sacrament",
    },
    { id: "section-messages", kind: "section", title: t("section-messages") },
    {
      id: "testimonies",
      kind: "testimony",
      title: lang === "SPA" ? "Testimonios de miembros de la congregación" : "Testimonies by members of the congregation",
      detail: lang === "SPA" ? "Formato de micrófono abierto después de la santa cena." : "Open microphone format following the sacrament.",
    },
    { id: "section-closing", kind: "section", title: t("section-closing") },
    { id: "closing-hymn", kind: "static", title: t("closing-hymn"), hymnId: "", hymnTitle: "" },
    { id: "benediction", kind: "static", title: t("benediction"), assigneeField: "benediction", assigneeName: "" },
  ]
}

function createInitialMeetingState(isoDate: string, lang: Lang = "ENG"): PlannerMeetingState {
  return {
    title: "",
    specialType: getDefaultMeetingSpecialType(isoDate),
    assignments: {
      presiding: "",
      conductor: "",
      chorister: "",
      accompanist: "",
    },
    sacramentAssignments: {
      blessing: [],
      passing: [],
    },
    standardEntries: createStandardEntries(isoDate, lang),
    fastEntries: createFastEntries(lang),
  }
}

function hydrateMeeting(
  isoDate: string,
  savedMeeting: Partial<PlannerMeetingState> | undefined,
  hasMeetingTypeOverride: boolean,
  lang: Lang
): PlannerMeetingState {
  const base = createInitialMeetingState(isoDate, lang)
  if (!savedMeeting) return base

  return {
    ...base,
    ...savedMeeting,
    title: savedMeeting.title ?? "",
    specialType:
      hasMeetingTypeOverride || savedMeeting.specialType !== "standard"
        ? savedMeeting.specialType ?? base.specialType
        : base.specialType,
    assignments: {
      ...base.assignments,
      ...(savedMeeting.assignments ?? {}),
    },
    sacramentAssignments: {
      ...base.sacramentAssignments,
      ...(savedMeeting.sacramentAssignments ?? {}),
    },
    standardEntries: Array.isArray(savedMeeting.standardEntries)
      ? (savedMeeting.standardEntries as AgendaEntry[])
      : base.standardEntries,
    fastEntries: Array.isArray(savedMeeting.fastEntries) ? (savedMeeting.fastEntries as AgendaEntry[]) : base.fastEntries,
  }
}

function getVisibleAgendaEntries(meeting: PlannerMeetingState) {
  return meeting.specialType === "fast-testimony" ? meeting.fastEntries : meeting.standardEntries
}

function getStaticEntry(entries: AgendaEntry[], id: string) {
  return entries.find((entry): entry is StaticEntry => entry.kind === "static" && entry.id === id)
}

function getAudienceSubtitle(meeting: PlannerMeetingState) {
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

export function SacramentMeetingAudienceClient({ unitName, defaultLanguage = "ENG" }: AudienceClientProps) {
  const searchParams = useSearchParams()
  const [draft, setDraft] = useState<PlannerDraft>({})
  const fallbackIsoDate = useMemo(() => toIsoDate(getSundayOnOrAfter(new Date())), [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
      setDraft(raw ? (JSON.parse(raw) as PlannerDraft) : {})
    } catch (error) {
      console.error("Failed to load sacrament planner draft:", error)
      setDraft({})
    }
  }, [])

  const selectedIsoDate = useMemo(() => {
    const requestedDate = searchParams.get("date")
    if (requestedDate) return requestedDate

    const dates = Object.keys(draft.meetingsByDate ?? {}).sort()
    return dates.find((date) => date >= fallbackIsoDate) ?? dates[0] ?? fallbackIsoDate
  }, [draft.meetingsByDate, fallbackIsoDate, searchParams])

  const meeting = useMemo(
    () =>
      hydrateMeeting(
        selectedIsoDate,
        draft.meetingsByDate?.[selectedIsoDate],
        Boolean(draft.meetingTypeOverridesByDate?.[selectedIsoDate]),
        defaultLanguage
      ),
    [defaultLanguage, draft.meetingTypeOverridesByDate, draft.meetingsByDate, selectedIsoDate]
  )

  const entries = getVisibleAgendaEntries(meeting)
  const openingHymn = getStaticEntry(entries, "opening-hymn")
  const invocation = getStaticEntry(entries, "invocation")
  const sacramentHymn = getStaticEntry(entries, "sacrament-hymn")
  const closingHymn = getStaticEntry(entries, "closing-hymn")
  const benediction = getStaticEntry(entries, "benediction")
  const speakers = entries.filter((entry): entry is SpeakerEntry => entry.kind === "speaker")
  const musicalEntries = entries.filter((entry): entry is StaticEntry => entry.kind === "static" && isMusicalEntry(entry))
  const hasSpeakerNames = speakers.some((speaker) => speaker.speakerName.trim())
  const date = plannerSundayDateFromIso(selectedIsoDate)

  return (
    <div className="min-h-full bg-card">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-10 sm:px-6 lg:px-8">
        <Button asChild variant="outline" className="mb-6 self-end rounded-full">
          <Link href={`/meetings/sacrament-meeting/planner?date=${selectedIsoDate}`}>
            Exit audience view
          </Link>
        </Button>

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
    </div>
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
