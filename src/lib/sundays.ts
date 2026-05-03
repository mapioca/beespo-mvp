import { addDays, format, startOfDay } from "date-fns"

export type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference"

export type PlannerSunday = {
  isoDate: string
  dateLabel: string
  shortDateLabel: string
  dayLabel: string
}

export function toPlannerSunday(date: Date): PlannerSunday {
  return {
    isoDate: format(date, "yyyy-MM-dd"),
    dateLabel: format(date, "MMM d"),
    shortDateLabel: format(date, "MM/dd"),
    dayLabel: format(date, "EEE"),
  }
}

export function getSundayOnOrAfter(date: Date): Date {
  const normalizedDate = startOfDay(date)
  const currentDay = normalizedDate.getDay()
  const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay
  return addDays(normalizedDate, daysUntilSunday)
}

export function getUpcomingSundays(count = 26): PlannerSunday[] {
  const firstSunday = getSundayOnOrAfter(new Date())
  return Array.from({ length: count }, (_, index) =>
    toPlannerSunday(addDays(firstSunday, index * 7))
  )
}

export function plannerSundayDateFromIso(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00`)
}

export function isFirstSundayOfMonth(isoDate: string) {
  return plannerSundayDateFromIso(isoDate).getDate() <= 7
}

export function isGeneralConferenceSunday(isoDate: string) {
  const date = plannerSundayDateFromIso(isoDate)
  const month = date.getMonth()
  return (month === 3 || month === 9) && isFirstSundayOfMonth(isoDate)
}

export function getUpcomingDateParts(isoDate: string) {
  const date = plannerSundayDateFromIso(isoDate)
  return {
    month: format(date, "MMM"),
    day: format(date, "d"),
  }
}

export function getUpcomingMeetingKind(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return { label: "Fast & Testimony", className: "bg-brand/15 text-brand" }
    case "general-conference":
      return { label: "General Conference", className: "bg-brand/10 text-brand" }
    case "stake-conference":
      return { label: "Stake Conference", className: "bg-[#eaf7ef] text-[#2f8f54] dark:bg-emerald-950 dark:text-emerald-400" }
    case "ward-conference":
      return { label: "Ward Conference", className: "bg-[#f0f9ff] text-[#0369a1] dark:bg-sky-950 dark:text-sky-400" }
    default:
      return { label: "Regular", className: "bg-muted text-muted-foreground" }
  }
}

const MEETING_TYPE_LABELS: Record<MeetingSpecialType, string> = {
  "standard": "Sacrament Meeting",
  "fast-testimony": "Fast & Testimony Meeting",
  "general-conference": "General Conference",
  "stake-conference": "Stake Conference",
  "ward-conference": "Ward Conference",
}

export function getDefaultMeetingTitle(specialType: MeetingSpecialType): string {
  return MEETING_TYPE_LABELS[specialType] ?? "Sacrament Meeting"
}

const PLANNER_DRAFT_STORAGE_KEY = "beespo:sacrament-meeting:planner:draft:v1"

export type PlannerDraftMeetingMeta = {
  specialType: MeetingSpecialType
  title: string
}

/** Read meeting metadata (specialType + title) from the planner's localStorage draft. */
export function readPlannerDraftMeta(): Record<string, PlannerDraftMeetingMeta> {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem(PLANNER_DRAFT_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as {
      meetingsByDate?: Record<string, { specialType?: MeetingSpecialType; title?: string }>
    }
    const result: Record<string, PlannerDraftMeetingMeta> = {}
    for (const [isoDate, state] of Object.entries(parsed.meetingsByDate ?? {})) {
      result[isoDate] = {
        specialType: state.specialType ?? "standard",
        title: state.title ?? "",
      }
    }
    return result
  } catch {
    return {}
  }
}
