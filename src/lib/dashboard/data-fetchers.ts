import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  KpiTaskCompletionData,
  KpiCallingFillRateData,
  KpiMeetingReadinessData,
  KpiActiveDiscussionsData,
  MyTasksData,
  CallingPipelineData,
  UpcomingMeetingsData,
  NotebooksData,
  TablesData,
  FormsData,
  DashboardWidgetData,
} from "@/types/dashboard";

// --- KPI Fetchers ---

export async function fetchKpiTaskCompletion(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<KpiTaskCompletionData> {
  const today = new Date().toISOString().split("T")[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

  const [overdueResult, highPriorityResult, completedResult, totalResult, sparklineResult] =
    await Promise.all([
      // Overdue tasks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("tasks") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "in_progress"])
        .lt("due_date", today),

      // High priority pending
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("tasks") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["pending", "in_progress"])
        .eq("priority", "high"),

      // Completed in last 30 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("tasks") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "completed")
        .gte("completed_at", thirtyDaysAgo),

      // Total tasks created in last 30 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("tasks") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", thirtyDaysAgo),

      // Sparkline: completed per day last 7 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("tasks") as any)
        .select("completed_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "completed")
        .gte("completed_at", new Date(Date.now() - 7 * 86400000).toISOString()),
    ]);

  // Build sparkline from last 7 days
  const sparkline: { value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStr = new Date(Date.now() - i * 86400000).toISOString().split("T")[0];
    const count = (sparklineResult.data || []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => t.completed_at?.startsWith(dayStr)
    ).length;
    sparkline.push({ value: count });
  }

  const completed = completedResult.count ?? 0;
  const total = totalResult.count ?? 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    overdueCount: overdueResult.count ?? 0,
    completionRate,
    highPriorityPending: highPriorityResult.count ?? 0,
    sparkline,
  };
}

export async function fetchKpiCallingFillRate(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<KpiCallingFillRateData> {
  const [totalResult, unfilledResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("callings") as any)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId),

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("callings") as any)
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("is_filled", false),
  ]);

  const total = totalResult.count ?? 0;
  const unfilled = unfilledResult.count ?? 0;
  const fillRate = total > 0 ? Math.round(((total - unfilled) / total) * 100) : 0;

  return { fillRate, unfilledCount: unfilled, totalCallings: total };
}

export async function fetchKpiMeetingReadiness(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<KpiMeetingReadinessData> {
  const now = new Date().toISOString();

  const [nextMeetingResult, sparklineMeetings] = await Promise.all([
    // Next upcoming meeting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("meetings") as any)
      .select(
        "id, title, scheduled_date, agenda_items(id, item_type, participant_name)"
      )
      .eq("workspace_id", workspaceId)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_date", now.split("T")[0])
      .order("scheduled_date", { ascending: true })
      .limit(1)
      .single(),

    // Last 4 completed meetings for sparkline
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("meetings") as any)
      .select("id, agenda_items(id, item_type, participant_name)")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .order("scheduled_date", { ascending: false })
      .limit(4),
  ]);

  const meeting = nextMeetingResult.data;
  let nextMeeting: KpiMeetingReadinessData["nextMeeting"] = null;
  let agendaReadiness = 0;
  let unassignedSpeakers = 0;

  if (meeting) {
    nextMeeting = {
      id: meeting.id,
      title: meeting.title,
      scheduled_date: meeting.scheduled_date,
    };

    const items = meeting.agenda_items || [];
    const speakerItems = items.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) => i.item_type === "speaker"
    );
    unassignedSpeakers = speakerItems.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (i: any) => !i.participant_name
    ).length;

    const totalSlots = Math.max(items.length, 1);
    const filledSlots = items.length - unassignedSpeakers;
    agendaReadiness = Math.min(100, Math.round((filledSlots / totalSlots) * 100));
  }

  // Sparkline: readiness of last 4 completed meetings
  const sparkline = (sparklineMeetings.data || [])
    .reverse()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((m: any) => {
      const items = m.agenda_items || [];
      const speakers = items.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => i.item_type === "speaker"
      );
      const unassigned = speakers.filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (i: any) => !i.participant_name
      ).length;
      const total = Math.max(items.length, 1);
      return { value: Math.round(((items.length - unassigned) / total) * 100) };
    });

  return { nextMeeting, agendaReadiness, unassignedSpeakers, sparkline };
}

export async function fetchKpiActiveDiscussions(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<KpiActiveDiscussionsData> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [openResult, pendingResult, resolvedResult, totalRecentResult] =
    await Promise.all([
      // Open discussions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("discussions") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", ["new", "active", "decision_required"]),

      // Pending decisions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("discussions") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "decision_required"),

      // Resolved in last 30 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("discussions") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "resolved")
        .gte("updated_at", thirtyDaysAgo),

      // Total discussions in last 30 days
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("discussions") as any)
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .gte("created_at", thirtyDaysAgo),
    ]);

  const resolved = resolvedResult.count ?? 0;
  const totalRecent = totalRecentResult.count ?? 0;
  const resolutionRate =
    totalRecent > 0 ? Math.round((resolved / totalRecent) * 100) : 0;

  return {
    openCount: openResult.count ?? 0,
    pendingDecisions: pendingResult.count ?? 0,
    resolutionRate,
  };
}

// --- Content Widget Fetchers ---

export async function fetchMyTasks(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<MyTasksData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, count } = await (supabase.from("tasks") as any)
    .select("id, title, priority, due_date", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .eq("assigned_to", userId)
    .in("status", ["pending", "in_progress"])
    .order("priority", { ascending: false })
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(5);

  return {
    tasks: (tasks || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        due_date: t.due_date,
      })
    ),
    totalCount: count ?? 0,
  };
}

export async function fetchCallingPipeline(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<CallingPipelineData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, count } = await (supabase.from("calling_processes") as any)
    .select(
      "id, current_stage, callings(title, workspace_id), candidate_names(name)",
      { count: "exact" }
    )
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(5);

  const processes = (data || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((p: any) => p.callings?.workspace_id === workspaceId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any) => ({
      candidate_name: p.candidate_names?.name ?? "Unknown",
      calling_title: p.callings?.title ?? "Unknown",
      current_stage: p.current_stage,
    }));

  return { processes, totalActive: count ?? 0 };
}

export async function fetchUpcomingMeetings(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<UpcomingMeetingsData> {
  const today = new Date().toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meetings } = await (supabase.from("meetings") as any)
    .select("id, title, scheduled_date, agenda_items(id)")
    .eq("workspace_id", workspaceId)
    .in("status", ["scheduled", "in_progress"])
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(5);

  return {
    meetings: (meetings || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (m: any) => ({
        id: m.id,
        title: m.title,
        scheduled_date: m.scheduled_date,
        agendaItemCount: (m.agenda_items || []).length,
      })
    ),
  };
}

export async function fetchNotebooks(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<NotebooksData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notebooks } = await (supabase.from("notebooks") as any)
    .select("id, title, cover_style, updated_at")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(3);

  return {
    notebooks: (notebooks || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (n: any) => ({
        id: n.id,
        title: n.title,
        cover_style: n.cover_style ?? "gradient-ocean",
        updated_at: n.updated_at,
      })
    ),
  };
}

export async function fetchTables(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<TablesData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tables } = await (supabase.from("dynamic_tables") as any)
    .select("id, name, icon, updated_at, dynamic_rows(id)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(3);

  return {
    tables: (tables || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => ({
        id: t.id,
        name: t.name,
        icon: t.icon ?? null,
        row_count: (t.dynamic_rows || []).length,
        updated_at: t.updated_at,
      })
    ),
  };
}

export async function fetchForms(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<FormsData> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: forms } = await (supabase.from("forms") as any)
    .select("id, title, is_published, updated_at, form_submissions(id)")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(3);

  return {
    forms: (forms || []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (f: any) => ({
        id: f.id,
        title: f.title,
        is_published: f.is_published ?? false,
        response_count: (f.form_submissions || []).length,
        updated_at: f.updated_at,
      })
    ),
  };
}

// --- Orchestrator ---

export async function fetchDashboardData(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string
): Promise<DashboardWidgetData> {
  const [
    kpiTaskCompletion,
    kpiCallingFillRate,
    kpiMeetingReadiness,
    kpiActiveDiscussions,
    myTasks,
    callingPipeline,
    upcomingMeetings,
    notebooks,
    tables,
    forms,
  ] = await Promise.all([
    fetchKpiTaskCompletion(supabase, workspaceId),
    fetchKpiCallingFillRate(supabase, workspaceId),
    fetchKpiMeetingReadiness(supabase, workspaceId),
    fetchKpiActiveDiscussions(supabase, workspaceId),
    fetchMyTasks(supabase, workspaceId, userId),
    fetchCallingPipeline(supabase, workspaceId),
    fetchUpcomingMeetings(supabase, workspaceId),
    fetchNotebooks(supabase, workspaceId),
    fetchTables(supabase, workspaceId),
    fetchForms(supabase, workspaceId),
  ]);

  return {
    kpiTaskCompletion,
    kpiCallingFillRate,
    kpiMeetingReadiness,
    kpiActiveDiscussions,
    myTasks,
    callingPipeline,
    upcomingMeetings,
    notebooks,
    tables,
    forms,
  };
}
