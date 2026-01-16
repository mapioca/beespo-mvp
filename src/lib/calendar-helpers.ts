import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isBefore,
  isAfter,
  isSameDay,
  isWithinInterval,
  differenceInDays,
  getDay,
} from "date-fns";
import { RecurrenceType, RecurrenceConfig } from "@/types/database";

// Calendar event source types
export type EventSource = "announcement" | "meeting" | "task" | "external";

// Calendar event representation
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string | null;
  startDate: Date;
  endDate?: Date;
  isAllDay: boolean;
  source: EventSource;
  sourceId: string;
  color?: string;
  priority?: "low" | "medium" | "high";
  status?: string;
  isRecurringInstance?: boolean;
  recurringParentId?: string;
  location?: string;
}

// Announcement type for calendar
export interface CalendarAnnouncement {
  id: string;
  title: string;
  content: string | null;
  priority: "low" | "medium" | "high";
  status: "draft" | "active" | "stopped";
  deadline: string | null;
  schedule_date: string | null;
  recurrence_type: RecurrenceType | null;
  recurrence_end_date: string | null;
  recurrence_config: RecurrenceConfig;
}

// Meeting type for calendar
export interface CalendarMeeting {
  id: string;
  title: string;
  scheduled_date: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
}

// Task type for calendar
export interface CalendarTask {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  priority: "low" | "medium" | "high";
}

// Get visible date range for calendar view
export function getVisibleDateRange(
  currentDate: Date,
  view: "month" | "week" | "day"
): { start: Date; end: Date } {
  switch (view) {
    case "month": {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      // Include days from adjacent months that appear in the calendar grid
      return {
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
      };
    }
    case "week": {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 }),
      };
    }
    case "day": {
      return {
        start: currentDate,
        end: currentDate,
      };
    }
  }
}

// Expand recurring events into individual instances
export function expandRecurringEvents(
  announcements: CalendarAnnouncement[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  // Add 1 month buffer for smooth transitions
  const bufferStart = addMonths(rangeStart, -1);
  const bufferEnd = addMonths(rangeEnd, 1);

  for (const announcement of announcements) {
    // Skip announcements without schedule_date or inactive
    if (!announcement.schedule_date || announcement.status !== "active") {
      continue;
    }

    const startDate = parseISO(announcement.schedule_date);
    const recurrenceType = announcement.recurrence_type || "none";

    if (recurrenceType === "none") {
      // Non-recurring: add single event if within range
      if (isWithinInterval(startDate, { start: bufferStart, end: bufferEnd })) {
        events.push(createEventFromAnnouncement(announcement, startDate));
      }
    } else {
      // Recurring: generate instances
      const endDate = announcement.recurrence_end_date
        ? parseISO(announcement.recurrence_end_date)
        : announcement.deadline
          ? parseISO(announcement.deadline)
          : bufferEnd;

      const instances = generateRecurringInstances(
        startDate,
        recurrenceType,
        announcement.recurrence_config,
        bufferStart,
        isBefore(endDate, bufferEnd) ? endDate : bufferEnd
      );

      for (const instanceDate of instances) {
        events.push(
          createEventFromAnnouncement(announcement, instanceDate, true)
        );
      }
    }
  }

  return events;
}

// Create calendar event from announcement
function createEventFromAnnouncement(
  announcement: CalendarAnnouncement,
  date: Date,
  isRecurring = false
): CalendarEvent {
  return {
    id: isRecurring ? `${announcement.id}-${date.toISOString()}` : announcement.id,
    title: announcement.title,
    description: announcement.content,
    startDate: date,
    isAllDay: true, // Announcements are typically all-day
    source: "announcement",
    sourceId: announcement.id,
    priority: announcement.priority,
    status: announcement.status,
    isRecurringInstance: isRecurring,
    recurringParentId: isRecurring ? announcement.id : undefined,
  };
}

// Generate recurring instances within a date range
function generateRecurringInstances(
  startDate: Date,
  recurrenceType: RecurrenceType,
  config: RecurrenceConfig,
  rangeStart: Date,
  rangeEnd: Date
): Date[] {
  const instances: Date[] = [];
  let currentDate = startDate;
  const interval = config.interval || 1;
  const maxIterations = 365; // Safety limit
  let iterations = 0;

  while (isBefore(currentDate, rangeEnd) && iterations < maxIterations) {
    iterations++;

    if (
      isAfter(currentDate, rangeStart) ||
      isSameDay(currentDate, rangeStart)
    ) {
      // Check day-of-week constraint for custom recurrence
      if (recurrenceType === "custom" && config.daysOfWeek) {
        if (config.daysOfWeek.includes(getDay(currentDate))) {
          instances.push(new Date(currentDate));
        }
      } else {
        instances.push(new Date(currentDate));
      }
    }

    // Advance to next occurrence
    switch (recurrenceType) {
      case "daily":
        currentDate = addDays(currentDate, interval);
        break;
      case "weekly":
        currentDate = addWeeks(currentDate, interval);
        break;
      case "biweekly":
        currentDate = addWeeks(currentDate, 2);
        break;
      case "monthly":
        currentDate = addMonths(currentDate, interval);
        break;
      case "yearly":
        currentDate = addYears(currentDate, interval);
        break;
      case "custom":
        // For custom with daysOfWeek, iterate daily and filter
        currentDate = addDays(currentDate, 1);
        break;
      default:
        return instances;
    }
  }

  return instances;
}

// Convert meetings to calendar events
export function meetingsToEvents(meetings: CalendarMeeting[]): CalendarEvent[] {
  return meetings.map((meeting) => ({
    id: meeting.id,
    title: meeting.title,
    startDate: parseISO(meeting.scheduled_date),
    isAllDay: false,
    source: "meeting" as EventSource,
    sourceId: meeting.id,
    status: meeting.status,
  }));
}

// Convert tasks to calendar events
export function tasksToEvents(tasks: CalendarTask[]): CalendarEvent[] {
  return tasks
    .filter((task) => task.due_date)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      startDate: parseISO(task.due_date!),
      isAllDay: true,
      source: "task" as EventSource,
      sourceId: task.id,
      priority: task.priority,
      status: task.status,
    }));
}

// Group events by date for display
export function groupEventsByDate(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();

  for (const event of events) {
    const dateKey = format(event.startDate, "yyyy-MM-dd");
    const existing = grouped.get(dateKey) || [];
    existing.push(event);
    grouped.set(dateKey, existing);
  }

  // Sort events within each day by priority
  for (const [key, dayEvents] of grouped) {
    grouped.set(
      key,
      dayEvents.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority || "low"] || 3;
        const bPriority = priorityOrder[b.priority || "low"] || 3;
        return aPriority - bPriority;
      })
    );
  }

  return grouped;
}

// Format date for calendar display
export function formatCalendarDate(date: Date): string {
  return format(date, "MMM d, yyyy");
}

export function formatCalendarDateTime(date: Date): string {
  return format(date, "MMM d, yyyy h:mm a");
}

export function formatMonthYear(date: Date): string {
  return format(date, "MMMM yyyy");
}

export function formatDayOfWeek(date: Date): string {
  return format(date, "EEEE");
}

export function formatShortDate(date: Date): string {
  return format(date, "MMM d");
}

// Get the number of days between two dates
export function getDaysDifference(start: Date, end: Date): number {
  return differenceInDays(end, start);
}

// Get color class for event source
export function getEventColorClass(source: EventSource): {
  border: string;
  bg: string;
  text: string;
} {
  switch (source) {
    case "announcement":
      return {
        border: "border-l-amber-400",
        bg: "bg-amber-50",
        text: "text-amber-900",
      };
    case "meeting":
      return {
        border: "border-l-blue-400",
        bg: "bg-blue-50",
        text: "text-blue-900",
      };
    case "task":
      return {
        border: "border-l-green-400",
        bg: "bg-green-50",
        text: "text-green-900",
      };
    case "external":
      return {
        border: "border-l-purple-400",
        bg: "bg-purple-50",
        text: "text-purple-900",
      };
  }
}

// Get priority badge color
export function getPriorityColor(priority: "low" | "medium" | "high"): string {
  switch (priority) {
    case "high":
      return "bg-red-100 text-red-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
  }
}
