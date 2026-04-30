/**
 * Returns true if an announcement should be visible for a given meeting date,
 * based on its display_start and display_until window.
 *
 * Rules:
 * - No display_start and no display_until → always visible
 * - display_start set → only visible if meetingDate >= display_start
 * - display_until set → only visible if meetingDate <= display_until
 */
export function isAnnouncementInWindow(
  announcement: { display_start?: string | null; display_until?: string | null },
  meetingDate: Date | string | null | undefined
): boolean {
  if (!meetingDate) return true

  const dayStart = toLocalCalendarDay(meetingDate)
  if (!dayStart) return true

  if (announcement.display_start) {
    const startDay = toLocalCalendarDay(announcement.display_start)
    if (!startDay) return true
    if (dayStart < startDay) return false
  }

  if (announcement.display_until) {
    const untilDay = toLocalCalendarDay(announcement.display_until)
    if (!untilDay) return true
    if (dayStart > untilDay) return false
  }

  return true
}

function toLocalCalendarDay(value: Date | string): Date | null {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return null
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }

  const datePart = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
  const date = new Date(datePart ? `${datePart}T00:00:00` : value)
  if (isNaN(date.getTime())) return null
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
