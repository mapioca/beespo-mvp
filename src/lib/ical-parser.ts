/**
 * iCal Parser for Beespo Calendar
 * Parses .ics format (VEVENT components)
 *
 * Timezone handling:
 * - UTC times (ending with Z) are parsed as UTC
 * - Times with TZID parameter are converted to UTC using the specified timezone
 * - Floating times (no Z, no TZID) are treated as UTC for server-locale independence
 */

export interface ParsedICalEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend?: Date;
  location?: string;
  isAllDay: boolean;
  rawVEvent: string;
  /** IANA timezone from the DTSTART TZID parameter, if present */
  timezone?: string;
}

/**
 * Get the UTC offset in minutes for a given IANA timezone at a specific point in time.
 * Uses the built-in Intl.DateTimeFormat API (Node.js 14+ / all modern browsers).
 *
 * @param tzid - IANA timezone identifier (e.g., "America/Denver")
 * @param referenceDate - A Date whose UTC values represent the wall-clock time in the target timezone
 * @returns The UTC offset in minutes (e.g., -420 for MST, -360 for MDT)
 */
function getTimezoneOffsetMinutes(tzid: string, referenceDate: Date): number {
  try {
    // Format the reference date's UTC values as parts in the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tzid,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(referenceDate);
    const get = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

    const tzYear = get("year");
    const tzMonth = get("month") - 1;
    const tzDay = get("day");
    let tzHour = get("hour");
    const tzMinute = get("minute");
    const tzSecond = get("second");

    // Intl may return hour=24 for midnight → normalize to 0
    if (tzHour === 24) tzHour = 0;

    // Build the local-time equivalent in UTC and compute the difference
    const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
    const diffMs = tzAsUtc - referenceDate.getTime();

    return Math.round(diffMs / 60000);
  } catch {
    // If the timezone is unrecognized, fall back to treating the time as UTC (offset = 0)
    console.warn(`Unrecognized TZID "${tzid}", treating time as UTC.`);
    return 0;
  }
}

/**
 * Parse an iCal string and extract VEVENT components
 */
export function parseICalFeed(icalString: string): ParsedICalEvent[] {
  const events: ParsedICalEvent[] = [];

  // Normalize line endings and unfold continuation lines
  const normalized = icalString
    .replace(/\r\n/g, "\n")
    .replace(/\n /g, "")
    .replace(/\n\t/g, "");

  // Extract VEVENT blocks
  const vEventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let match;

  while ((match = vEventRegex.exec(normalized)) !== null) {
    const vEventContent = match[1];
    const rawVEvent = match[0];

    try {
      const event = parseVEvent(vEventContent, rawVEvent);
      if (event) {
        events.push(event);
      }
    } catch (error) {
      console.error("Error parsing VEVENT:", error);
      // Continue parsing other events
    }
  }

  return events;
}

/**
 * Parse a single VEVENT content block
 */
function parseVEvent(content: string, rawVEvent: string): ParsedICalEvent | null {
  const lines = content.split("\n").filter((line) => line.trim());
  const properties: Record<string, string> = {};

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    let key = line.substring(0, colonIndex);
    const value = line.substring(colonIndex + 1);

    // Handle properties with parameters (e.g., DTSTART;VALUE=DATE:20240101)
    const semicolonIndex = key.indexOf(";");
    if (semicolonIndex !== -1) {
      const params = key.substring(semicolonIndex + 1);
      key = key.substring(0, semicolonIndex);
      // Store parameters for later use
      properties[`${key}_PARAMS`] = params;
    }

    properties[key] = value;
  }

  // Required fields
  const uid = properties["UID"];
  const summary = properties["SUMMARY"] || properties["TITLE"];
  const dtstart = properties["DTSTART"];

  if (!uid || !summary || !dtstart) {
    return null;
  }

  // Parse dates
  const { date: startDate, isAllDay, timezone } = parseICalDate(
    dtstart,
    properties["DTSTART_PARAMS"]
  );

  let endDate: Date | undefined;
  if (properties["DTEND"]) {
    const { date } = parseICalDate(properties["DTEND"], properties["DTEND_PARAMS"]);
    endDate = date;
  } else if (properties["DURATION"]) {
    endDate = addDuration(startDate, properties["DURATION"]);
  }

  return {
    uid: unescapeICalText(uid),
    summary: unescapeICalText(summary),
    description: properties["DESCRIPTION"]
      ? unescapeICalText(properties["DESCRIPTION"])
      : undefined,
    dtstart: startDate,
    dtend: endDate,
    location: properties["LOCATION"]
      ? unescapeICalText(properties["LOCATION"])
      : undefined,
    isAllDay,
    rawVEvent,
    timezone,
  };
}

/**
 * Parse iCal date/datetime string
 * Formats:
 * - DATE: 20240101 (all-day)
 * - DATETIME: 20240101T120000Z (UTC — ends with Z)
 * - DATETIME with TZID: 20240101T120000 (with TZID parameter, e.g. TZID=America/Denver)
 * - DATETIME floating: 20240101T120000 (no Z, no TZID — treated as UTC for consistency)
 */
function parseICalDate(
  dateStr: string,
  params?: string
): { date: Date; isAllDay: boolean; timezone?: string } {
  // Check if all-day (DATE format without time)
  const isAllDay =
    params?.includes("VALUE=DATE") || (!dateStr.includes("T") && dateStr.length === 8);

  if (isAllDay) {
    // Parse YYYYMMDD format — all-day events have no timezone component
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return { date: new Date(Date.UTC(year, month, day)), isAllDay: true };
  }

  // Parse datetime components
  const year = parseInt(dateStr.substring(0, 4), 10);
  const month = parseInt(dateStr.substring(4, 6), 10) - 1;
  const day = parseInt(dateStr.substring(6, 8), 10);

  let hour = 0;
  let minute = 0;
  let second = 0;

  if (dateStr.includes("T")) {
    const timePart = dateStr.split("T")[1];
    hour = parseInt(timePart.substring(0, 2), 10);
    minute = parseInt(timePart.substring(2, 4), 10);
    second = parseInt(timePart.substring(4, 6), 10) || 0;
  }

  // Case 1: Explicit UTC (ends with Z)
  if (dateStr.endsWith("Z")) {
    return {
      date: new Date(Date.UTC(year, month, day, hour, minute, second)),
      isAllDay: false,
    };
  }

  // Case 2: TZID parameter present — convert wall-clock time in that timezone to UTC
  const tzidMatch = params?.match(/TZID=([^;:]+)/);
  const tzid = tzidMatch?.[1];

  if (tzid) {
    // Create a "reference" UTC date with the wall-clock values
    const wallClockAsUtc = new Date(Date.UTC(year, month, day, hour, minute, second));
    // Compute the timezone's UTC offset at this approximate point in time
    const offsetMinutes = getTimezoneOffsetMinutes(tzid, wallClockAsUtc);
    // Subtract the offset to get the true UTC instant
    // (offset is positive when tz is ahead of UTC, negative when behind)
    const utcDate = new Date(wallClockAsUtc.getTime() - offsetMinutes * 60000);

    return { date: utcDate, isAllDay: false, timezone: tzid };
  }

  // Case 3: Floating time (no Z, no TZID) — treat as UTC for server-locale independence
  return {
    date: new Date(Date.UTC(year, month, day, hour, minute, second)),
    isAllDay: false,
  };
}

/**
 * Add ISO 8601 duration to a date
 * Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S
 */
function addDuration(date: Date, duration: string): Date {
  const result = new Date(date);

  const match = duration.match(
    /P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/
  );

  if (!match) return result;

  const [, years, months, days, hours, minutes, seconds] = match;

  if (years) result.setUTCFullYear(result.getUTCFullYear() + parseInt(years, 10));
  if (months) result.setUTCMonth(result.getUTCMonth() + parseInt(months, 10));
  if (days) result.setUTCDate(result.getUTCDate() + parseInt(days, 10));
  if (hours) result.setUTCHours(result.getUTCHours() + parseInt(hours, 10));
  if (minutes) result.setUTCMinutes(result.getUTCMinutes() + parseInt(minutes, 10));
  if (seconds) result.setUTCSeconds(result.getUTCSeconds() + parseInt(seconds, 10));

  return result;
}

/**
 * Unescape iCal text values
 * iCal escapes: \n, \,, \;, \\
 */
function unescapeICalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Validate an iCal URL
 */
export function isValidICalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must be HTTPS for security
    if (parsed.protocol !== "https:") {
      return false;
    }
    // Common iCal URL patterns
    const validExtensions = [".ics", ".ical", ".ifb"];
    const hasValidExtension = validExtensions.some((ext) =>
      parsed.pathname.toLowerCase().endsWith(ext)
    );
    const hasCalendarParam = parsed.searchParams.has("calendar") ||
      parsed.pathname.includes("calendar") ||
      parsed.pathname.includes("ical");

    return hasValidExtension || hasCalendarParam || true; // Allow any HTTPS URL
  } catch {
    return false;
  }
}
