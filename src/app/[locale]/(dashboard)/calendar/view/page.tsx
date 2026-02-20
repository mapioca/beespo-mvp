import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Calendar View | Beespo",
    description: "Your interactive calendar view",
};

export const revalidate = 0;

export default async function CalendarViewPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user profile
    const { data: profile } = await (supabase
        .from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile || !profile.workspace_id) {
        redirect("/onboarding");
    }

    // Fetch date range for initial load (current month +/- 1 month buffer)
    const today = new Date();
    const rangeStart = subMonths(startOfMonth(today), 1).toISOString();
    const rangeEnd = addMonths(endOfMonth(today), 1).toISOString();

    // Fetch announcements with schedule_date
    const { data: announcements } = await (supabase
        .from("announcements") as ReturnType<typeof supabase.from>)
        .select(
            "id, title, content, priority, status, deadline, schedule_date, recurrence_type, recurrence_end_date, recurrence_config"
        )
        .eq("workspace_id", profile.workspace_id)
        .eq("status", "active")
        .not("schedule_date", "is", null);

    // Fetch meetings in range
    const { data: meetings } = await (supabase
        .from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title, scheduled_date, status")
        .eq("workspace_id", profile.workspace_id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd)
        .neq("status", "cancelled");

    // Fetch tasks with due dates in range
    const { data: tasks } = await (supabase
        .from("tasks") as ReturnType<typeof supabase.from>)
        .select("id, title, description, due_date, status, priority")
        .eq("workspace_id", profile.workspace_id)
        .not("due_date", "is", null)
        .gte("due_date", rangeStart)
        .lte("due_date", rangeEnd)
        .neq("status", "cancelled");

    // Fetch events from the events table
    const { data: events } = await (supabase
        .from("events") as ReturnType<typeof supabase.from>)
        .select(`
      id,
      title,
      description,
      location,
      start_at,
      end_at,
      is_all_day,
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
            initialAnnouncements={announcements || []}
            initialMeetings={meetings || []}
            initialTasks={tasks || []}
            initialEvents={events || []}
            userRole={profile.role}
        />
    );
}
