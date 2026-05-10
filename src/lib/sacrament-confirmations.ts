// Shared types + helpers for the planner confirmation lifecycle.
//
// Both the program planner (rich React state) and the dedicated
// "Confirmations" page (read JSON, post mutations) need to know how to
// extract pending/declined assignments out of `meeting_state` JSON and
// how to apply confirmation actions back to that JSON. Centralizing
// keeps the two surfaces in sync.

export type AssignmentStatus = "pending" | "confirmed" | "declined"

export type ConfirmationRole = "invocation" | "benediction" | "speaker"

export type ConfirmationAssignment = {
  meetingDate: string
  entryId: string
  name: string
  status: AssignmentStatus
  declineNote: string | null
  declinedAt: string | null
  role: ConfirmationRole
  // Speaker-only: topic and 1-based order so we can label "Concluding speaker".
  topic: string | null
  speakerOrder: number | null
  speakerCount: number | null
}

export const ROLE_LABELS: Record<ConfirmationRole, string> = {
  invocation: "Invocation",
  benediction: "Benediction",
  speaker: "Speaker",
}

export function describeAssignmentRole(assignment: ConfirmationAssignment): string {
  if (assignment.role !== "speaker") return ROLE_LABELS[assignment.role]
  if (
    assignment.speakerCount &&
    assignment.speakerOrder &&
    assignment.speakerOrder === assignment.speakerCount
  ) {
    return "Concluding speaker"
  }
  if (assignment.speakerOrder) return `Speaker ${assignment.speakerOrder}`
  return "Speaker"
}

export type ConfirmationAction =
  | { type: "confirm" }
  | { type: "decline"; note: string | null }
  | { type: "reset" }
  | { type: "unassign" }

// Discriminated union the AssignmentStatusPill emits when the user picks
// a new state. Decoupled from ConfirmationAction because the pill never
// emits "unassign" — that lives in row-level overflow menus.
export type AssignmentStatusChange =
  | { status: "pending" | "confirmed" }
  | { status: "declined"; declineNote: string | null }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function readStatus(value: unknown): AssignmentStatus | null {
  return value === "pending" || value === "confirmed" || value === "declined" ? value : null
}

type ParsedSpeakerEntry = {
  id: string
  kind: "speaker"
  speakerName: string
  topic: string
  speakerStatus: AssignmentStatus | null
  speakerDeclineNote: string | null
  speakerDeclinedAt: string | null
}

type ParsedStaticEntry = {
  id: string
  kind: "static"
  assigneeField: "invocation" | "benediction" | null
  assigneeName: string
  assigneeStatus: AssignmentStatus | null
  assigneeDeclineNote: string | null
  assigneeDeclinedAt: string | null
}

function parseEntry(value: unknown): ParsedSpeakerEntry | ParsedStaticEntry | null {
  if (!isRecord(value)) return null
  const id = readString(value.id)
  const kind = value.kind
  if (!id) return null
  if (kind === "speaker") {
    return {
      id,
      kind: "speaker",
      speakerName: readString(value.speakerName),
      topic: readString(value.topic),
      speakerStatus: readStatus(value.speakerStatus),
      speakerDeclineNote: readOptionalString(value.speakerDeclineNote),
      speakerDeclinedAt: readOptionalString(value.speakerDeclinedAt),
    }
  }
  if (kind === "static") {
    const assigneeField =
      value.assigneeField === "invocation" || value.assigneeField === "benediction"
        ? value.assigneeField
        : null
    return {
      id,
      kind: "static",
      assigneeField,
      assigneeName: readString(value.assigneeName),
      assigneeStatus: readStatus(value.assigneeStatus),
      assigneeDeclineNote: readOptionalString(value.assigneeDeclineNote),
      assigneeDeclinedAt: readOptionalString(value.assigneeDeclinedAt),
    }
  }
  return null
}

function readEntries(value: unknown): Array<ParsedSpeakerEntry | ParsedStaticEntry> {
  if (!Array.isArray(value)) return []
  const result: Array<ParsedSpeakerEntry | ParsedStaticEntry> = []
  for (const item of value) {
    const parsed = parseEntry(item)
    if (parsed) result.push(parsed)
  }
  return result
}

/**
 * Pull every speaker + prayer assignment out of a meeting_state JSON,
 * along with its current status. Skips slots that don't have a name set.
 */
export function parseMeetingConfirmations(
  meetingState: unknown,
  meetingDate: string
): ConfirmationAssignment[] {
  if (!isRecord(meetingState)) return []
  const specialType = readString(meetingState.specialType)
  const activeKey = specialType === "fast-testimony" ? "fastEntries" : "standardEntries"
  const entries = readEntries(meetingState[activeKey])

  const speakerEntries = entries.filter(
    (entry): entry is ParsedSpeakerEntry => entry.kind === "speaker"
  )
  const speakerCount = speakerEntries.length

  const result: ConfirmationAssignment[] = []
  let speakerIndex = 0

  for (const entry of entries) {
    if (entry.kind === "speaker") {
      speakerIndex += 1
      const name = entry.speakerName.trim()
      if (!name) continue
      // Legacy assignments persisted before the status field existed
      // have a name but no status — treat them as pending so they don't
      // silently disappear from the confirmations queue.
      const status: AssignmentStatus = entry.speakerStatus ?? "pending"
      result.push({
        meetingDate,
        entryId: entry.id,
        name,
        status,
        declineNote: entry.speakerDeclineNote,
        declinedAt: entry.speakerDeclinedAt,
        role: "speaker",
        topic: entry.topic.trim() || null,
        speakerOrder: speakerIndex,
        speakerCount,
      })
    } else if (entry.assigneeField) {
      const name = entry.assigneeName.trim()
      if (!name) continue
      const status: AssignmentStatus = entry.assigneeStatus ?? "pending"
      result.push({
        meetingDate,
        entryId: entry.id,
        name,
        status,
        declineNote: entry.assigneeDeclineNote,
        declinedAt: entry.assigneeDeclinedAt,
        role: entry.assigneeField,
        topic: null,
        speakerOrder: null,
        speakerCount: null,
      })
    }
  }

  return result
}

/**
 * Apply a confirmation action to a meeting_state JSON. Returns a new
 * object with updated status / decline note / cleared name as needed,
 * preserving every other field on the meeting state. Both standard and
 * fast entry lists are walked so the same entry id can't drift between
 * the two when the user toggles meeting type later.
 */
export function applyConfirmationAction(
  meetingState: unknown,
  entryId: string,
  action: ConfirmationAction
): Record<string, unknown> {
  const base = isRecord(meetingState) ? { ...meetingState } : {}

  const transformEntries = (raw: unknown): unknown[] => {
    if (!Array.isArray(raw)) return []
    return raw.map((item) => {
      if (!isRecord(item) || item.id !== entryId) return item
      if (item.kind === "speaker") {
        return mutateSpeakerEntry(item, action)
      }
      if (item.kind === "static" && (item.assigneeField === "invocation" || item.assigneeField === "benediction")) {
        return mutateStaticEntry(item, action)
      }
      return item
    })
  }

  base.standardEntries = transformEntries(base.standardEntries)
  base.fastEntries = transformEntries(base.fastEntries)
  return base
}

function mutateSpeakerEntry(
  entry: Record<string, unknown>,
  action: ConfirmationAction
): Record<string, unknown> {
  const next = { ...entry }
  switch (action.type) {
    case "confirm":
      next.speakerStatus = "confirmed"
      next.speakerDeclineNote = null
      next.speakerDeclinedAt = null
      return next
    case "decline":
      next.speakerStatus = "declined"
      next.speakerDeclineNote = action.note
      next.speakerDeclinedAt = new Date().toISOString()
      return next
    case "reset":
      next.speakerStatus = "pending"
      next.speakerDeclineNote = null
      next.speakerDeclinedAt = null
      return next
    case "unassign":
      next.speakerName = ""
      next.speakerStatus = undefined
      next.speakerDeclineNote = null
      next.speakerDeclinedAt = null
      return next
  }
}

function mutateStaticEntry(
  entry: Record<string, unknown>,
  action: ConfirmationAction
): Record<string, unknown> {
  const next = { ...entry }
  switch (action.type) {
    case "confirm":
      next.assigneeStatus = "confirmed"
      next.assigneeDeclineNote = null
      next.assigneeDeclinedAt = null
      return next
    case "decline":
      next.assigneeStatus = "declined"
      next.assigneeDeclineNote = action.note
      next.assigneeDeclinedAt = new Date().toISOString()
      return next
    case "reset":
      next.assigneeStatus = "pending"
      next.assigneeDeclineNote = null
      next.assigneeDeclinedAt = null
      return next
    case "unassign":
      next.assigneeName = ""
      next.assigneeStatus = undefined
      next.assigneeDeclineNote = null
      next.assigneeDeclinedAt = null
      return next
  }
}

/**
 * Returns the next `count` Sundays starting today (today is included if
 * today is Sunday). Format: "YYYY-MM-DD" (UTC-safe local construction).
 */
export function getUpcomingSundayIsoDates(count = 8, from: Date = new Date()): string[] {
  const start = startOfDay(from)
  const day = start.getDay()
  const offsetToSunday = day === 0 ? 0 : 7 - day
  const firstSunday = addDays(start, offsetToSunday)
  return Array.from({ length: count }, (_, i) => formatIso(addDays(firstSunday, i * 7)))
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function formatIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}
