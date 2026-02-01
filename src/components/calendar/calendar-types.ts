import { ExternalCalendarEvent, UserRole } from "@/types/database";
import {
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
