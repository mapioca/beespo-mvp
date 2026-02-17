import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SundayMorningData,
  ActionInboxData,
  OrganizationalPulseData,
  DashboardWidgetData,
} from "@/types/dashboard";

export async function fetchSundayMorningData(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<SundayMorningData> {
  const now = new Date().toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase.from("meetings") as any)
    .select(
      "id, title, scheduled_date, status, template_id, templates(name), agenda_items(id, title, item_type, participant_name)"
    )
    .eq("workspace_id", workspaceId)
    .in("status", ["scheduled", "in_progress"])
    .gte("scheduled_date", now.split("T")[0])
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .single();

  if (!meeting) {
    return { nextMeeting: null, readiness: null };
  }

  const items = meeting.agenda_items || [];
  const speakerItems = items.filter(
    (i: { item_type: string }) => i.item_type === "speaker"
  );
  const unassignedSpeakers = speakerItems.filter(
    (i: { participant_name: string | null }) => !i.participant_name
  );

  const issues: string[] = [];
  if (unassignedSpeakers.length > 0) {
    issues.push(
      `${unassignedSpeakers.length} speaker${unassignedSpeakers.length > 1 ? "s" : ""} unassigned`
    );
  }
  if (items.length === 0) {
    issues.push("No agenda items added");
  }

  const totalSlots = Math.max(items.length, 5);
  const filledSlots = items.length - unassignedSpeakers.length;
  const percent = items.length === 0 ? 0 : Math.min(100, Math.round((filledSlots / totalSlots) * 100));

  let label = "Ready";
  if (percent < 50) label = "Needs attention";
  else if (percent < 80) label = "Almost ready";

  return {
    nextMeeting: {
      id: meeting.id,
      title: meeting.title,
      scheduled_date: meeting.scheduled_date,
      status: meeting.status,
      template_name: meeting.templates?.name ?? null,
      agenda_items: items,
    },
    readiness: { percent, label, issues },
  };
}

export async function fetchActionInboxData(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<ActionInboxData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, count } = await (supabase.from("tasks") as any)
    .select("id, title, priority, due_date, status, meetings(title)", {
      count: "exact",
    })
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  return {
    tasks: (tasks || []).map(
      (t: {
        id: string;
        title: string;
        priority: "low" | "medium" | "high";
        due_date: string | null;
        status: string;
        meetings?: { title: string } | null;
      }) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
        status: t.status,
        meeting_title: t.meetings?.title ?? null,
      })
    ),
    totalCount: count ?? 0,
  };
}

export async function fetchOrganizationalPulseData(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<OrganizationalPulseData> {
  // Run all queries in parallel
  const [vacanciesResult, discussionsResult, businessResult, sparklineResult] =
    await Promise.all([
      // Vacancy count (unfilled callings)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("callings") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("is_filled", false),

      // Active discussions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("discussions") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["new", "active", "decision_required"]),

      // Pending business items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("business_items") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "pending"),

      // Last 4 completed meetings for sparkline
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("meetings") as any)
        .select("id, scheduled_date, agenda_items(id, is_completed)")
        .eq("workspace_id", workspaceId)
        .eq("status", "completed")
        .order("scheduled_date", { ascending: false })
        .limit(4),
    ]);

  const sparklineData = (sparklineResult.data || [])
    .reverse()
    .map(
      (m: {
        scheduled_date: string;
        agenda_items: { id: string; is_completed: boolean }[];
      }) => {
        const items = m.agenda_items || [];
        const completed = items.filter((i) => i.is_completed).length;
        const total = items.length;
        return {
          date: m.scheduled_date,
          completion: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }
    );

  return {
    vacancyCount: vacanciesResult.count ?? 0,
    activeDiscussions: discussionsResult.count ?? 0,
    pendingBusiness: businessResult.count ?? 0,
    sparklineData,
  };
}

export async function fetchDashboardData(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<DashboardWidgetData> {
  const [sundayMorning, actionInbox, organizationalPulse] = await Promise.all([
    fetchSundayMorningData(supabase, workspaceId),
    fetchActionInboxData(supabase, workspaceId, userId),
    fetchOrganizationalPulseData(supabase, workspaceId),
  ]);

  return { sundayMorning, actionInbox, organizationalPulse };
}
