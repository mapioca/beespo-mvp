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

  const date = meetingDate instanceof Date ? meetingDate : new Date(meetingDate)
  if (isNaN(date.getTime())) return true

  // Normalize to midnight for date-only comparisons
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (announcement.display_start) {
    const start = new Date(announcement.display_start)
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    if (dayStart < startDay) return false
  }

  if (announcement.display_until) {
    const until = new Date(announcement.display_until)
    const untilDay = new Date(until.getFullYear(), until.getMonth(), until.getDate())
    if (dayStart > untilDay) return false
  }

  return true
}
