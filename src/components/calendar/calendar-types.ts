import type { ExternalCalendarEvent, UserRole } from "@/types/database";
import type {
    CalendarInternalEvent,
    CalendarAnnouncement,
    CalendarMeeting,
    CalendarTask
} from "@/lib/calendar-helpers";

export type CalendarViewType = "month" | "week" | "day" | "agenda";

export interface CalendarVisibility {
    announcements: boolean;
    meetings: boolean;
    tasks: boolean;
    events: boolean;
    external: boolean;
    /** Per-subscription visibility keyed by subscription id */
    externalSubscriptions: Record<string, boolean>;
}

export interface ExternalEventWithColor extends ExternalCalendarEvent {
    color?: string;
    subscription_name?: string;
}

export interface CalendarClientProps {
    initialAnnouncements: CalendarAnnouncement[];
    initialMeetings: CalendarMeeting[];
    initialTasks: CalendarTask[];
    initialEvents?: CalendarInternalEvent[];
    userRole: UserRole;
}
