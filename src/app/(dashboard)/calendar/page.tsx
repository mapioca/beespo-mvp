import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";

export const revalidate = 0;

export default async function CalendarPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile
  const { data: profile } = await (supabase
    .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspace_id) {
    redirect("/setup");
  }

  // Fetch date range for initial load (current month +/- 1 month buffer)
  const today = new Date();
  const rangeStart = subMonths(startOfMonth(today), 1).toISOString();
  const rangeEnd = addMonths(endOfMonth(today), 1).toISOString();

  // Fetch announcements with schedule_date
  const { data: announcements } = await (supabase
    .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select(
      "id, title, content, priority, status, deadline, schedule_date, recurrence_type, recurrence_end_date, recurrence_config"
    )
    .eq("workspace_id", profile.workspace_id)
    .eq("status", "active")
    .not("schedule_date", "is", null);

  // Fetch meetings in range
  const { data: meetings } = await (supabase
    .from("meetings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("id, title, scheduled_date, status")
    .eq("workspace_id", profile.workspace_id)
    .gte("scheduled_date", rangeStart)
    .lte("scheduled_date", rangeEnd)
    .neq("status", "cancelled");

  // Fetch tasks with due dates in range
  const { data: tasks } = await (supabase
    .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("id, title, description, due_date, status, priority")
    .eq("workspace_id", profile.workspace_id)
    .not("due_date", "is", null)
    .gte("due_date", rangeStart)
    .lte("due_date", rangeEnd)
    .neq("status", "cancelled");

  return (
    <CalendarClient
      initialAnnouncements={announcements || []}
      initialMeetings={meetings || []}
      initialTasks={tasks || []}
      userRole={profile.role}
    />
  );
}
