import { createClient } from "@/lib/supabase/server";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Metadata } from "next";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import type { UserRole } from "@/types/database";

export const metadata: Metadata = {
    title: "Calendar | Beespo",
    description: "Your interactive calendar",
};

export default async function ScheduleCalendarPage() {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ]);

    // Fetch date range for initial load (current month +/- 1 month buffer)
    const today = new Date();
    const rangeStart = subMonths(startOfMonth(today), 1).toISOString();
    const rangeEnd = addMonths(endOfMonth(today), 1).toISOString();

    // Fetch meetings in range
    const { data: meetings } = await (supabase
        .from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title, scheduled_date, status")
        .eq("workspace_id", profile.workspace_id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd)
        .neq("status", "cancelled");

    // Fetch events from the events table
    const { data: events } = await (supabase
        .from("events") as ReturnType<typeof supabase.from>)
        .select(`
      id,
      title,
      event_type,
      description,
      location,
      start_at,
      end_at,
      is_all_day,
      date_tbd,
      time_tbd,
      duration_mode,
      duration_minutes,
      workspace_event_id,
      external_source_id,
      external_source_type,
      announcements (
        id,
        title,
        status
      )
    `)
        .eq("workspace_id", profile.workspace_id)
        .gte("start_at", rangeStart)
        .lte("start_at", rangeEnd);

    return (
        <CalendarClient
            initialAnnouncements={[]}
            initialMeetings={meetings || []}
            initialTasks={[]}
            initialEvents={events || []}
            userRole={profile.role as UserRole}
        />
    );
}
