import { format, parseISO } from "date-fns";

export function formatMeetingDate(dateString: string) {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy");
}

export function formatMeetingTime(dateString: string) {
    const date = parseISO(dateString);
    return format(date, "h:mm a");
}

export function formatMeetingDateTime(dateString: string) {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy • h:mm a");
}
