import { richTextToPlainText } from "./rich-text"
import type { AssignmentStatus } from "./sacrament-confirmations"

export type MeetingSpecialType =
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
  assigneeStatus?: AssignmentStatus
  assigneeDeclineNote?: string | null
  assigneeDeclinedAt?: string | null
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
  durationMinutes?: number | null
  speakerStatus?: AssignmentStatus
  speakerDeclineNote?: string | null
  speakerDeclinedAt?: string | null
}

type TestimonyEntry = {
  id: string
  kind: "testimony"
  title: string
  detail: string
}

export type AgendaEntry = SectionEntry | StaticEntry | SpeakerEntry | TestimonyEntry

export type PlannerMeetingState = {
  title: string
  meetingTime: string
  specialType: MeetingSpecialType
  assignments: Record<AssignmentField, string>
  sacramentAssignments: Record<"blessing" | "passing", string[]>
  standardEntries: AgendaEntry[]
  fastEntries: AgendaEntry[]
}

export type PlannerItem = {
  id: string
  title: string
  checked: boolean
  detail?: string | null
}

export type PlannerNotes = {
  announcements: PlannerItem[]
  business: PlannerItem[]
  notes: string
}

export type ArchiveMeetingSummary = {
  id: string
  meetingDate: string
  title: string
  meetingTime: string
  specialType: MeetingSpecialType
  meetingTypeLabel: string
  presiding: string | null
  conducting: string | null
  openingHymn: string | null
  sacramentHymn: string | null
  closingHymn: string | null
  speakers: Array<{
    id: string
    name: string | null
    topic: string | null
    status: AssignmentStatus | null
    declineNote: string | null
  }>
  prayers: Array<{
    id: string
    role: "Invocation" | "Benediction"
    name: string | null
    status: AssignmentStatus | null
    declineNote: string | null
  }>
  announcements: PlannerItem[]
  business: PlannerItem[]
  notes: string
  updatedAt: string | null
  searchText: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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
  if (isGeneralConferenceSunday(isoDate)) return "general-conference"
  if (isFirstSundayOfMonth(isoDate)) return "fast-testimony"
  return "standard"
}

function defaultStandardEntries(isoDate: string): AgendaEntry[] {
  return [
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    {
      id: "invocation",
      kind: "static",
      title: "Invocation",
      assigneeField: "invocation",
      assigneeName: "",
    },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    {
      id: `${isoDate}-speaker-1`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    {
      id: `${isoDate}-speaker-2`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
      topic: "",
      durationMinutes: null,
    },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    {
      id: "benediction",
      kind: "static",
      title: "Benediction",
      assigneeField: "benediction",
      assigneeName: "",
    },
  ]
}

function defaultFastEntries(): AgendaEntry[] {
  return [
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    {
      id: "invocation",
      kind: "static",
      title: "Invocation",
      assigneeField: "invocation",
      assigneeName: "",
    },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    {
      id: "benediction",
      kind: "static",
      title: "Benediction",
      assigneeField: "benediction",
      assigneeName: "",
    },
  ]
}

export function getMeetingTypeLabel(specialType: MeetingSpecialType) {
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

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function parseMeetingState(value: unknown, meetingDate: string): PlannerMeetingState {
  if (!isRecord(value)) {
    return {
      title: "",
      meetingTime: "9:00 AM",
      specialType: getDefaultMeetingSpecialType(meetingDate),
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
      standardEntries: defaultStandardEntries(meetingDate),
      fastEntries: defaultFastEntries(),
    }
  }

  const specialType =
    typeof value.specialType === "string"
      ? (value.specialType as MeetingSpecialType)
      : getDefaultMeetingSpecialType(meetingDate)

  const assignments = isRecord(value.assignments) ? value.assignments : {}
  const sacramentAssignments = isRecord(value.sacramentAssignments)
    ? value.sacramentAssignments
    : {}

  return {
    title: typeof value.title === "string" ? value.title : "",
    meetingTime: typeof value.meetingTime === "string" ? value.meetingTime : "9:00 AM",
    specialType,
    assignments: {
      presiding: typeof assignments.presiding === "string" ? assignments.presiding : "",
      conductor: typeof assignments.conductor === "string" ? assignments.conductor : "",
      chorister: typeof assignments.chorister === "string" ? assignments.chorister : "",
      accompanist: typeof assignments.accompanist === "string" ? assignments.accompanist : "",
    },
    sacramentAssignments: {
      blessing: Array.isArray(sacramentAssignments.blessing)
        ? sacramentAssignments.blessing.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
      passing: Array.isArray(sacramentAssignments.passing)
        ? sacramentAssignments.passing.filter(
            (entry): entry is string => typeof entry === "string"
          )
        : [],
    },
    standardEntries: Array.isArray(value.standardEntries)
      ? (value.standardEntries as AgendaEntry[])
      : defaultStandardEntries(meetingDate),
    fastEntries: Array.isArray(value.fastEntries)
      ? (value.fastEntries as AgendaEntry[])
      : defaultFastEntries(),
  }
}

export function parsePlannerNotes(value: unknown): PlannerNotes {
  if (!isRecord(value)) {
    return { announcements: [], business: [], notes: "" }
  }

  const toItems = (input: unknown): PlannerItem[] =>
    Array.isArray(input)
      ? input
          .filter(isRecord)
          .map((item, index) => ({
            id: typeof item.id === "string" ? item.id : `item-${index}`,
            title: typeof item.title === "string" ? item.title : "",
            checked: Boolean(item.checked),
            detail: typeof item.detail === "string" ? item.detail : null,
          }))
          .filter((item) => item.title.trim().length > 0)
      : []

  return {
    announcements: toItems(value.announcements),
    business: toItems(value.business),
    notes: typeof value.notes === "string" ? value.notes : "",
  }
}

export function getVisibleAgendaEntries(meeting: PlannerMeetingState) {
  return meeting.specialType === "fast-testimony"
    ? meeting.fastEntries ?? []
    : meeting.standardEntries ?? []
}

function getStaticEntry(entries: AgendaEntry[], id: string) {
  return entries.find(
    (entry): entry is StaticEntry => entry.kind === "static" && entry.id === id
  )
}

function getHymnLabel(entry: StaticEntry | undefined) {
  if (!entry) return null
  const title = normalizeText(entry.hymnTitle)
  const number = typeof entry.hymnNumber === "number" ? `#${entry.hymnNumber}` : null
  if (title && number) return `${number} ${title}`
  return title ?? number
}

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => normalizeText(part)).filter(Boolean).join(" ")
}

export function buildArchiveMeetingSummary(args: {
  meetingDate: string
  meetingState: unknown
  notesState: unknown
  updatedAt: string | null
}): ArchiveMeetingSummary {
  const meeting = parseMeetingState(args.meetingState, args.meetingDate)
  const notes = parsePlannerNotes(args.notesState)
  const entries = getVisibleAgendaEntries(meeting)
  const speakers = entries
    .filter((entry): entry is SpeakerEntry => entry.kind === "speaker")
    .map((entry) => {
      const name = normalizeText(entry.speakerName)
      // Treat legacy assignments (name set, no status) as pending so the
      // archive shows the same default state the planner does.
      const status: AssignmentStatus | null = name
        ? entry.speakerStatus ?? "pending"
        : null
      return {
        id: entry.id,
        name,
        topic: normalizeText(entry.topic),
        status,
        declineNote: entry.speakerDeclineNote ?? null,
      }
    })
  const prayers = entries
    .filter(
      (entry): entry is StaticEntry =>
        entry.kind === "static" &&
        (entry.assigneeField === "invocation" || entry.assigneeField === "benediction")
    )
    .map((entry) => {
      const name = normalizeText(entry.assigneeName)
      const status: AssignmentStatus | null = name
        ? entry.assigneeStatus ?? "pending"
        : null
      return {
        id: entry.id,
        role: entry.assigneeField === "invocation" ? ("Invocation" as const) : ("Benediction" as const),
        name,
        status,
        declineNote: entry.assigneeDeclineNote ?? null,
      }
    })

  const title = normalizeText(meeting.title) ?? getMeetingTypeLabel(meeting.specialType)
  const openingHymn = getHymnLabel(getStaticEntry(entries, "opening-hymn"))
  const sacramentHymn = getHymnLabel(getStaticEntry(entries, "sacrament-hymn"))
  const closingHymn = getHymnLabel(getStaticEntry(entries, "closing-hymn"))

  const searchText = [
    title,
    meeting.meetingTime,
    getMeetingTypeLabel(meeting.specialType),
    normalizeText(meeting.assignments.presiding),
    normalizeText(meeting.assignments.conductor),
    normalizeText(meeting.assignments.chorister),
    normalizeText(meeting.assignments.accompanist),
    openingHymn,
    sacramentHymn,
    closingHymn,
    ...speakers.flatMap((speaker) => [speaker.name, speaker.topic]),
    ...prayers.map((prayer) => prayer.name),
    ...notes.announcements.flatMap((item) => [item.title, item.detail ?? null]),
    ...notes.business.flatMap((item) => [item.title, item.detail ?? null]),
    normalizeText(richTextToPlainText(notes.notes)),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase()

  return {
    id: args.meetingDate,
    meetingDate: args.meetingDate,
    title,
    meetingTime: compactText([meeting.meetingTime]) || "9:00 AM",
    specialType: meeting.specialType,
    meetingTypeLabel: getMeetingTypeLabel(meeting.specialType),
    presiding: normalizeText(meeting.assignments.presiding),
    conducting: normalizeText(meeting.assignments.conductor),
    openingHymn,
    sacramentHymn,
    closingHymn,
    speakers,
    prayers,
    announcements: notes.announcements,
    business: notes.business,
    notes: notes.notes.trim(),
    updatedAt: args.updatedAt,
    searchText,
  }
}
