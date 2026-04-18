import type { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────

export interface HomeWeekMeeting {
  id: string;
  title: string;
  scheduled_date: string;
  agendaItemCount: number;
}

export interface HomeFeaturedTemplate {
  id: string;
  title: string;
  description: string | null;
  item_count: number;
}

export type DiscussionStatus =
  | "new"
  | "active"
  | "decision_required"
  | "monitoring"
  | "resolved"
  | "deferred";

export interface HomeDiscussion {
  id: string;
  title: string;
  description: string | null;
  status: DiscussionStatus;
  category: string;
  priority: "low" | "medium" | "high";
  due_date: string | null;
  updated_at: string;
}

export interface HomePageData {
  weekMeetings: HomeWeekMeeting[];
  featuredTemplates: HomeFeaturedTemplate[];
  discussions: HomeDiscussion[];
}

// ── Fetchers ───────────────────────────────────────────────────────────────

/**
 * Fetches meetings scheduled in the current ISO week (Mon–Sun).
 */
async function fetchWeekMeetings(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<HomeWeekMeeting[]> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("meetings") as any)
    .select("id, title, scheduled_date, agenda_items(id)")
    .eq("workspace_id", workspaceId)
    .in("status", ["scheduled", "in_progress"])
    .gte("scheduled_date", fmt(monday))
    .lte("scheduled_date", fmt(sunday))
    .order("scheduled_date", { ascending: true })
    .limit(10);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).map((m: any) => ({
      id: m.id as string,
      title: m.title as string,
      scheduled_date: m.scheduled_date as string,
      agendaItemCount: (m.agenda_items || []).length as number,
    }))
  );
}

/**
 * Fetches featured templates — Beespo official + workspace templates, newest first.
 */
async function fetchFeaturedTemplates(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<HomeFeaturedTemplate[]> {
  const filter = `workspace_id.is.null,workspace_id.eq.${workspaceId}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: templates } = await (supabase.from("templates") as any)
    .select("id, title, description, template_items(id)")
    .or(filter)
    .order("created_at", { ascending: false })
    .limit(6);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (templates || []).map((t: any) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      item_count: (t.template_items || []).length as number,
    }))
  );
}

/**
 * Fetches open/active discussions — excludes resolved & deferred, newest first.
 * Lightweight: only the columns needed for the carousel card.
 */
async function fetchDiscussions(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<HomeDiscussion[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("discussions") as any)
    .select("id, title, description, status, category, priority, due_date, updated_at")
    .eq("workspace_id", workspaceId)
    .in("status", ["new", "active", "decision_required", "monitoring"])
    .order("updated_at", { ascending: false })
    .limit(10);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data || []).map((d: any) => ({
      id: d.id as string,
      title: d.title as string,
      description: (d.description as string | null) ?? null,
      status: d.status as DiscussionStatus,
      category: d.category as string,
      priority: d.priority as "low" | "medium" | "high",
      due_date: (d.due_date as string | null) ?? null,
      updated_at: d.updated_at as string,
    }))
  );
}

// ── Orchestrator ───────────────────────────────────────────────────────────

export async function fetchHomePageData(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<HomePageData> {
  const [weekMeetings, featuredTemplates, discussions] = await Promise.all([
    fetchWeekMeetings(supabase, workspaceId),
    fetchFeaturedTemplates(supabase, workspaceId),
    fetchDiscussions(supabase, workspaceId),
  ]);

  return { weekMeetings, featuredTemplates, discussions };
}
