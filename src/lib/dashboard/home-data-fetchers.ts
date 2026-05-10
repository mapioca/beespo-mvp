import type { SupabaseClient } from "@supabase/supabase-js";
import { isAnnouncementInWindow } from "@/lib/announcement-utils";
import {
  describeAssignmentRole,
  getUpcomingSundayIsoDates,
  parseMeetingConfirmations,
} from "@/lib/sacrament-confirmations";

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

// ── Sacrament Meeting Home ──────────────────────────────────────────────────

type MeetingSpecialType =
  | "standard"
  | "fast-testimony"
  | "general-conference"
  | "stake-conference"
  | "ward-conference";

type AgendaAssigneeField = "invocation" | "benediction";

type StaticEntry = {
  id: string;
  kind: "static";
  title: string;
  assigneeField?: AgendaAssigneeField;
  assigneeName?: string;
  hymnId?: string;
  hymnNumber?: number;
  hymnTitle?: string;
};

type SpeakerEntry = {
  id: string;
  kind: "speaker";
  title: string;
  speakerName: string;
  topic?: string;
};

type AgendaEntry =
  | StaticEntry
  | SpeakerEntry
  | {
      id: string;
      kind: string;
      title?: string;
      [key: string]: unknown;
    };

type PlannerMeetingState = {
  title?: string;
  meetingTime?: string;
  specialType?: MeetingSpecialType;
  standardEntries?: AgendaEntry[];
  fastEntries?: AgendaEntry[];
};

type ConfirmationStatus = "confirmed" | "pending" | "missing";

// Speakers/prayers: full lifecycle (unassigned → pending → confirmed).
// Conducting/presiding: assignment-only (unassigned → assigned), no confirm step.
// Hymns: chosen-only (not chosen → chosen).
export type AssignmentOnlyStatus = "assigned" | "unassigned";
export type HymnStatus = "chosen" | "unchosen";

export interface HomeReadinessPerson {
  id: string;
  role: string;
  name: string | null;
  status: ConfirmationStatus;
  detail: string | null;
}

export interface HomeReadinessItem {
  id: string;
  title: string;
  detail: string | null;
}

export interface HomeAssignmentSlot {
  id: string;
  role: string;
  name: string | null;
  status: AssignmentOnlyStatus;
}

export interface HomeHymnSlot {
  id: string;
  role: string;
  hymnNumber: number | null;
  hymnTitle: string | null;
  status: HymnStatus;
}

export interface SacramentHomeData {
  meetingDate: string;
  meetingTitle: string;
  meetingType: string;
  meetingTime: string;
  plannerHref: string;
  presiding: HomeAssignmentSlot;
  conducting: HomeAssignmentSlot;
  announcementCount: number;
  businessCount: number;
  announcements: HomeReadinessItem[];
  businessItems: HomeReadinessItem[];
  speakers: HomeReadinessPerson[];
  prayers: HomeReadinessPerson[];
  hymns: HomeHymnSlot[];
  programApplicable: boolean;
  confirmedRequiredCount: number;
  totalRequiredCount: number;
  updatedAt: string | null;
}

export interface UpcomingSacramentSummary {
  meetingDate: string;
  meetingType: string;
  plannerHref: string;
  isProgramApplicable: boolean;
  speakersAssigned: number;
  speakersTotal: number;
  prayersAssigned: number;
  prayersTotal: number;
  hymnsChosen: number;
  hymnsTotal: number;
  hasAnyData: boolean;
}

function localIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDatePlusDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localIsoDate(date);
}

function nextSundayIsoDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  today.setDate(today.getDate() + daysUntilSunday);
  return localIsoDate(today);
}

function isFirstSundayOfMonth(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).getDate() <= 7;
}

function isGeneralConferenceSunday(isoDate: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  const month = date.getMonth();
  return (month === 3 || month === 9) && isFirstSundayOfMonth(isoDate);
}

function getDefaultMeetingSpecialType(isoDate: string): MeetingSpecialType {
  if (isGeneralConferenceSunday(isoDate)) return "general-conference";
  if (isFirstSundayOfMonth(isoDate)) return "fast-testimony";
  return "standard";
}

function getMeetingTypeLabel(specialType: MeetingSpecialType) {
  switch (specialType) {
    case "fast-testimony":
      return "Fast & Testimony Meeting";
    case "general-conference":
      return "General Conference";
    case "stake-conference":
      return "Stake Conference";
    case "ward-conference":
      return "Ward Conference";
    default:
      return "Sacrament Meeting";
  }
}

function defaultStandardEntries(isoDate: string): AgendaEntry[] {
  return [
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    {
      id: "invocation",
      kind: "static",
      title: "Invocation",
      assigneeField: "invocation",
      assigneeName: "",
    },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    {
      id: `${isoDate}-speaker-1`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
    },
    {
      id: `${isoDate}-speaker-2`,
      kind: "speaker",
      title: "Speaker",
      speakerName: "",
    },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    {
      id: "benediction",
      kind: "static",
      title: "Benediction",
      assigneeField: "benediction",
      assigneeName: "",
    },
  ];
}

function defaultFastEntries(): AgendaEntry[] {
  return [
    { id: "opening-hymn", kind: "static", title: "Opening Hymn" },
    {
      id: "invocation",
      kind: "static",
      title: "Invocation",
      assigneeField: "invocation" as const,
      assigneeName: "",
    },
    { id: "sacrament-hymn", kind: "static", title: "Sacrament Hymn" },
    { id: "closing-hymn", kind: "static", title: "Closing Hymn" },
    {
      id: "benediction",
      kind: "static",
      title: "Benediction",
      assigneeField: "benediction" as const,
      assigneeName: "",
    },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMeetingState(value: unknown, meetingDate: string): PlannerMeetingState {
  if (!isRecord(value)) {
    return {
      specialType: getDefaultMeetingSpecialType(meetingDate),
      standardEntries: defaultStandardEntries(meetingDate),
      fastEntries: defaultFastEntries(),
    };
  }

  const defaultSpecialType = getDefaultMeetingSpecialType(meetingDate);
  const specialType =
    typeof value.specialType === "string"
      ? (value.specialType as MeetingSpecialType)
      : defaultSpecialType;

  return {
    title: typeof value.title === "string" ? value.title : "",
    meetingTime: typeof value.meetingTime === "string" ? value.meetingTime : "9:00 AM",
    specialType,
    standardEntries: Array.isArray(value.standardEntries)
      ? (value.standardEntries as AgendaEntry[])
      : defaultStandardEntries(meetingDate),
    fastEntries: Array.isArray(value.fastEntries)
      ? (value.fastEntries as AgendaEntry[])
      : defaultFastEntries(),
  };
}

function visibleEntries(meeting: PlannerMeetingState) {
  return meeting.specialType === "fast-testimony"
    ? meeting.fastEntries ?? []
    : meeting.standardEntries ?? [];
}

function normalizePersonName(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function personStatus(
  name: string | null,
  role: "speaker" | "prayer",
  confirmationByRoleAndName: Map<string, ConfirmationStatus>
): ConfirmationStatus {
  if (!name) return "missing";
  return confirmationByRoleAndName.get(`${role}:${name.toLowerCase()}`) ?? "pending";
}

function isProgramApplicable(meeting: PlannerMeetingState) {
  return (
    meeting.specialType !== "general-conference" &&
    meeting.specialType !== "stake-conference"
  );
}

const HYMN_ROLE_LABELS: Record<string, string> = {
  "opening-hymn": "Opening",
  "sacrament-hymn": "Sacrament",
  "closing-hymn": "Closing",
  "intermediate-hymn": "Intermediate",
  "rest-hymn": "Rest",
};

function isHymnEntry(entry: AgendaEntry): entry is StaticEntry {
  if (entry.kind !== "static") return false;
  const id = entry.id ?? "";
  return id.includes("hymn");
}

function hymnRoleLabel(entry: StaticEntry) {
  return HYMN_ROLE_LABELS[entry.id] ?? entry.title ?? "Hymn";
}

function getHymnsFromMeeting(meeting: PlannerMeetingState): HomeHymnSlot[] {
  if (!isProgramApplicable(meeting)) return [];
  const entries = visibleEntries(meeting);
  return entries.filter(isHymnEntry).map((entry) => {
    const title = entry.hymnTitle?.trim() || null;
    const number = typeof entry.hymnNumber === "number" ? entry.hymnNumber : null;
    const chosen = Boolean(title || number);
    return {
      id: entry.id,
      role: hymnRoleLabel(entry),
      hymnNumber: number,
      hymnTitle: title,
      status: chosen ? "chosen" : "unchosen",
    };
  });
}

function getPeopleFromMeeting(
  meeting: PlannerMeetingState,
  confirmationByRoleAndName: Map<string, ConfirmationStatus>
) {
  if (!isProgramApplicable(meeting)) {
    return { speakers: [], prayers: [] };
  }

  const entries = visibleEntries(meeting);
  const speakers = entries
    .filter((entry): entry is SpeakerEntry => entry.kind === "speaker")
    .map((entry, index) => {
      const name = normalizePersonName(entry.speakerName);
      return {
        id: entry.id,
        role: index === 0 ? "Speaker 1" : index === 1 ? "Speaker 2" : `Speaker ${index + 1}`,
        name,
        status: personStatus(name, "speaker", confirmationByRoleAndName),
        detail: entry.topic?.trim() || null,
      };
    });

  const prayerLabels: Record<AgendaAssigneeField, string> = {
    invocation: "Invocation",
    benediction: "Benediction",
  };

  const prayers = entries
    .filter(
      (entry): entry is StaticEntry =>
        entry.kind === "static" &&
        (entry.assigneeField === "invocation" || entry.assigneeField === "benediction")
    )
    .map((entry) => {
      const name = normalizePersonName(entry.assigneeName);
      return {
        id: entry.id,
        role: entry.assigneeField ? prayerLabels[entry.assigneeField] : entry.title,
        name,
        status: personStatus(name, "prayer", confirmationByRoleAndName),
        detail: null,
      };
    });

  return { speakers, prayers };
}

function getAssignmentName(
  assignments: unknown,
  field: "presiding" | "conductor"
) {
  if (!isRecord(assignments)) return null;
  const value = assignments[field];
  if (typeof value !== "string") return null;
  return normalizePersonName(value);
}

function buildAssignmentSlot(
  id: "presiding" | "conducting",
  role: string,
  name: string | null
): HomeAssignmentSlot {
  return {
    id,
    role,
    name,
    status: name ? "assigned" : "unassigned",
  };
}

async function fetchFallbackItems(
  supabase: SupabaseClient,
  workspaceId: string,
  meetingDate: string
) {
  const [announcementResult, businessResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("announcements") as any)
      .select("id, title, content, display_start, display_until")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("business_items") as any)
      .select("id, person_name, position_calling, category", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .eq("action_date", meetingDate)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type AnnouncementRow = {
    id: string;
    title: string;
    content: string | null;
    display_start: string | null;
    display_until: string | null;
  };

  type BusinessRow = {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string | null;
  };

  const eligibleAnnouncements = ((announcementResult.data ?? []) as AnnouncementRow[])
    .filter((item) => isAnnouncementInWindow(item, meetingDate));

  return {
    announcementCount: eligibleAnnouncements.length,
    businessCount: businessResult.count ?? businessResult.data?.length ?? 0,
    announcements: eligibleAnnouncements
      .slice(0, 5)
      .map((item) => ({
        id: item.id,
        title: item.title,
        detail: null,
      })),
    businessItems: ((businessResult.data ?? []) as BusinessRow[]).map((item) => ({
      id: item.id,
      title: item.position_calling
        ? `${item.person_name} - ${item.position_calling}`
        : item.person_name,
      detail: item.category,
    })),
  };
}

async function fetchConfirmationStatuses(
  supabase: SupabaseClient,
  workspaceId: string,
  meetingDate: string
) {
  const nextDate = isoDatePlusDays(meetingDate, 1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meetings } = await (supabase.from("meetings") as any)
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("scheduled_date", meetingDate)
    .lt("scheduled_date", nextDate);

  const meetingIds = ((meetings ?? []) as Array<{ id: string }>).map((meeting) => meeting.id);
  if (meetingIds.length === 0) return new Map<string, ConfirmationStatus>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agendaItems } = await (supabase.from("agenda_items") as any)
    .select("id, meeting_id")
    .in("meeting_id", meetingIds);

  const agendaItemIds = new Set(
    ((agendaItems ?? []) as Array<{ id: string }>).map((item) => item.id)
  );
  const meetingIdSet = new Set(meetingIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: assignmentRows } = await (supabase.from("meeting_assignments") as any)
    .select("id, directory_id, meeting_id, agenda_item_id, assignment_type, is_confirmed, created_at")
    .eq("workspace_id", workspaceId)
    .in("assignment_type", ["speaker", "prayer"])
    .order("created_at", { ascending: false })
    .limit(500);

  type AssignmentRow = {
    directory_id: string | null;
    meeting_id: string | null;
    agenda_item_id: string | null;
    assignment_type: "speaker" | "prayer";
    is_confirmed: boolean | null;
  };

  const rows = ((assignmentRows ?? []) as AssignmentRow[]).filter(
    (row) =>
      (row.meeting_id && meetingIdSet.has(row.meeting_id)) ||
      (row.agenda_item_id && agendaItemIds.has(row.agenda_item_id))
  );

  const directoryIds = Array.from(
    new Set(rows.map((row) => row.directory_id).filter((id): id is string => Boolean(id)))
  );

  if (directoryIds.length === 0) return new Map<string, ConfirmationStatus>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: directoryRows } = await (supabase.from("directory") as any)
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .in("id", directoryIds);

  const directoryById = new Map(
    ((directoryRows ?? []) as Array<{ id: string; name: string }>).map((entry) => [
      entry.id,
      entry.name,
    ])
  );

  const statuses = new Map<string, ConfirmationStatus>();
  for (const row of rows) {
    if (!row.directory_id) continue;
    const name = directoryById.get(row.directory_id);
    if (!name) continue;
    const key = `${row.assignment_type}:${name.trim().toLowerCase()}`;
    const nextStatus: ConfirmationStatus = row.is_confirmed ? "confirmed" : "pending";
    if (statuses.get(key) !== "confirmed") {
      statuses.set(key, nextStatus);
    }
  }

  return statuses;
}

export async function fetchSacramentHomeData(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<SacramentHomeData> {
  const meetingDate = nextSundayIsoDate();

  const [plannerResult, fallbackItems, confirmationStatuses] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("sacrament_planner_entries") as any)
      .select("meeting_state, notes_state, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("meeting_date", meetingDate)
      .maybeSingle(),
    fetchFallbackItems(supabase, workspaceId, meetingDate),
    fetchConfirmationStatuses(supabase, workspaceId, meetingDate),
  ]);

  const plannerEntry = plannerResult.data as
    | { meeting_state: unknown; notes_state: unknown; updated_at: string | null }
    | null;

  const meeting = parseMeetingState(plannerEntry?.meeting_state, meetingDate);
  const programApplicable = isProgramApplicable(meeting);
  const { speakers, prayers } = getPeopleFromMeeting(meeting, confirmationStatuses);
  const hymns = getHymnsFromMeeting(meeting);
  const people = [...speakers, ...prayers];
  const confirmedRequiredCount = people.filter((person) => person.status === "confirmed").length;
  const totalRequiredCount = people.length;
  const meetingType = getMeetingTypeLabel(meeting.specialType ?? "standard");
  const meetingTitle = meeting.title?.trim() || meetingType;

  const businessItemsList = fallbackItems.businessItems;
  const announcementsList = fallbackItems.announcements;

  const assignments = (plannerEntry?.meeting_state as { assignments?: unknown } | undefined)
    ?.assignments;
  const presidingName = getAssignmentName(assignments, "presiding");
  const conductingName = getAssignmentName(assignments, "conductor");

  return {
    meetingDate,
    meetingTitle,
    meetingType,
    meetingTime: meeting.meetingTime?.trim() || "9:00 AM",
    plannerHref: `/meetings/sacrament/planner?date=${meetingDate}`,
    presiding: buildAssignmentSlot("presiding", "Presiding", presidingName),
    conducting: buildAssignmentSlot("conducting", "Conducting", conductingName),
    announcementCount: fallbackItems.announcementCount,
    businessCount: fallbackItems.businessCount,
    announcements: announcementsList,
    businessItems: businessItemsList,
    speakers,
    prayers,
    hymns,
    programApplicable,
    confirmedRequiredCount,
    totalRequiredCount,
    updatedAt: plannerEntry?.updated_at ?? null,
  };
}

// ── Looking Ahead ───────────────────────────────────────────────────────────

export async function fetchUpcomingSacramentSummaries(
  supabase: SupabaseClient,
  workspaceId: string,
  fromIsoDate: string,
  count = 3
): Promise<UpcomingSacramentSummary[]> {
  const dates: string[] = [];
  for (let i = 1; i <= count; i++) {
    dates.push(isoDatePlusDays(fromIsoDate, i * 7));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("sacrament_planner_entries") as any)
    .select("meeting_date, meeting_state")
    .eq("workspace_id", workspaceId)
    .in("meeting_date", dates);

  const byDate = new Map<string, unknown>();
  for (const row of (data ?? []) as Array<{ meeting_date: string; meeting_state: unknown }>) {
    byDate.set(row.meeting_date, row.meeting_state);
  }

  return dates.map((date) => {
    const rawState = byDate.get(date);
    const meeting = parseMeetingState(rawState, date);
    const meetingType = getMeetingTypeLabel(meeting.specialType ?? "standard");
    const programApplicable = isProgramApplicable(meeting);

    if (!programApplicable) {
      return {
        meetingDate: date,
        meetingType,
        plannerHref: `/meetings/sacrament/planner?date=${date}`,
        isProgramApplicable: false,
        speakersAssigned: 0,
        speakersTotal: 0,
        prayersAssigned: 0,
        prayersTotal: 0,
        hymnsChosen: 0,
        hymnsTotal: 0,
        hasAnyData: byDate.has(date),
      };
    }

    const entries = visibleEntries(meeting);
    const speakers = entries.filter(
      (entry): entry is SpeakerEntry => entry.kind === "speaker"
    );
    const prayers = entries.filter(
      (entry): entry is StaticEntry =>
        entry.kind === "static" &&
        (entry.assigneeField === "invocation" || entry.assigneeField === "benediction")
    );
    const hymns = entries.filter(isHymnEntry);

    const speakersAssigned = speakers.filter((s) => normalizePersonName(s.speakerName))
      .length;
    const prayersAssigned = prayers.filter((p) => normalizePersonName(p.assigneeName))
      .length;
    const hymnsChosen = hymns.filter(
      (h) => Boolean(h.hymnTitle?.trim()) || typeof h.hymnNumber === "number"
    ).length;

    return {
      meetingDate: date,
      meetingType,
      plannerHref: `/meetings/sacrament/planner?date=${date}`,
      isProgramApplicable: true,
      speakersAssigned,
      speakersTotal: speakers.length,
      prayersAssigned,
      prayersTotal: prayers.length,
      hymnsChosen,
      hymnsTotal: hymns.length,
      hasAnyData: byDate.has(date),
    };
  });
}

export interface PendingConfirmationsHomeData {
  count: number;
  items: HomeReadinessItem[];
}

const PENDING_CONFIRMATIONS_HORIZON_SUNDAYS = 8;
const PENDING_CONFIRMATIONS_PREVIEW_LIMIT = 3;

/**
 * Aggregate pending speaker + prayer assignments across the next 8 Sundays
 * for the home dashboard "To confirm" tile. Returns a total count and the
 * top-3 most-imminent items (sorted by meeting date ascending).
 */
export async function fetchPendingConfirmationsHomeData(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<PendingConfirmationsHomeData> {
  const dates = getUpcomingSundayIsoDates(PENDING_CONFIRMATIONS_HORIZON_SUNDAYS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("sacrament_planner_entries") as any)
    .select("meeting_date, meeting_state")
    .eq("workspace_id", workspaceId)
    .in("meeting_date", dates);

  const rows = (data ?? []) as Array<{ meeting_date: string; meeting_state: unknown }>;
  const pending = rows
    .flatMap((row) => parseMeetingConfirmations(row.meeting_state, row.meeting_date))
    .filter((assignment) => assignment.status === "pending")
    .sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));

  const items: HomeReadinessItem[] = pending.slice(0, PENDING_CONFIRMATIONS_PREVIEW_LIMIT).map(
    (assignment) => ({
      id: `${assignment.meetingDate}-${assignment.entryId}`,
      title: assignment.name,
      detail: `${describeAssignmentRole(assignment)} · ${formatPendingDateLabel(assignment.meetingDate)}`,
    })
  );

  return { count: pending.length, items };
}

function formatPendingDateLabel(isoDate: string): string {
  try {
    const date = new Date(`${isoDate}T12:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
    if (diffDays <= 0) return "This Sunday";
    if (diffDays <= 7) return "This Sunday";
    if (diffDays <= 14) return "Next Sunday";
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch {
    return isoDate;
  }
}
