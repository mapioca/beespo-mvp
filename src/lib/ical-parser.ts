/**
 * iCal Parser for Beespo Calendar
 * Parses .ics format (VEVENT components)
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
  const { date: startDate, isAllDay } = parseICalDate(
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
  };
}

/**
 * Parse iCal date/datetime string
 * Formats:
 * - DATE: 20240101 (all-day)
 * - DATETIME: 20240101T120000 (local time)
 * - DATETIME: 20240101T120000Z (UTC)
 * - DATETIME with TZID: 20240101T120000 (with TZID parameter)
 */
function parseICalDate(
  dateStr: string,
  params?: string
): { date: Date; isAllDay: boolean } {
  // Check if all-day (DATE format without time)
  const isAllDay =
    params?.includes("VALUE=DATE") || (!dateStr.includes("T") && dateStr.length === 8);

  if (isAllDay) {
    // Parse YYYYMMDD format
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1;
    const day = parseInt(dateStr.substring(6, 8), 10);
    return { date: new Date(year, month, day), isAllDay: true };
  }

  // Parse datetime
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

  // Check if UTC (ends with Z)
  if (dateStr.endsWith("Z")) {
    return { date: new Date(Date.UTC(year, month, day, hour, minute, second)), isAllDay: false };
  }

  // Local time (or TZID which we handle as local for simplicity)
  return { date: new Date(year, month, day, hour, minute, second), isAllDay: false };
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

  if (years) result.setFullYear(result.getFullYear() + parseInt(years, 10));
  if (months) result.setMonth(result.getMonth() + parseInt(months, 10));
  if (days) result.setDate(result.getDate() + parseInt(days, 10));
  if (hours) result.setHours(result.getHours() + parseInt(hours, 10));
  if (minutes) result.setMinutes(result.getMinutes() + parseInt(minutes, 10));
  if (seconds) result.setSeconds(result.getSeconds() + parseInt(seconds, 10));

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
