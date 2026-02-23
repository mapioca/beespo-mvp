import type { FeatureTier } from "./database";

// Widget type identifiers
export type WidgetType =
  | "team_workload"
  | "kpi_calling_fill_rate"
  | "kpi_meeting_readiness"
  | "kpi_active_discussions"
  | "my_tasks"
  | "calling_pipeline"
  | "upcoming_meetings"
  | "notebooks"
  | "tables"
  | "forms";

// Position of a widget in the grid
export interface WidgetPosition {
  id: string;
  type: WidgetType;
  column: number;
  order: number;
  visible: boolean;
  isKpi: boolean;
}

// Persisted dashboard configuration
export interface DashboardConfig {
  version: 1;
  columns: number;
  widgets: WidgetPosition[];
}

// Static registry entry for a widget
export interface WidgetDefinition {
  type: WidgetType;
  label: string;
  icon: string; // Lucide icon name
  category: "kpi" | "content";
  defaultColumn: number;
  tiers: FeatureTier[];
  mobilePriority: number; // Lower = shown first on mobile
}

// --- Team Workload data ---

export interface TeamWorkloadMember {
  id: string;
  name: string;
  role: string;
  activeTasks: number;
}

export interface TeamWorkloadData {
  members: TeamWorkloadMember[];
}

// --- KPI data interfaces ---

export interface KpiCallingFillRateData {
  fillRate: number;
  unfilledCount: number;
  totalCallings: number;
}

export interface KpiMeetingReadinessData {
  nextMeeting: { id: string; title: string; scheduled_date: string } | null;
  agendaReadiness: number;
  unassignedSpeakers: number;
  sparkline: { value: number }[];
}

export interface KpiActiveDiscussionsData {
  openCount: number;
  pendingDecisions: number;
  resolutionRate: number;
}

// --- Content widget data interfaces ---

export interface MyTasksData {
  tasks: {
    id: string;
    title: string;
    priority: "low" | "medium" | "high";
    due_date: string | null;
  }[];
  totalCount: number;
}

export interface CallingPipelineData {
  processes: {
    candidate_name: string;
    calling_title: string;
    current_stage: string;
  }[];
  totalActive: number;
}

export interface UpcomingMeetingsData {
  meetings: {
    id: string;
    title: string;
    scheduled_date: string;
    agendaItemCount: number;
  }[];
}

export interface NotebooksData {
  notebooks: {
    id: string;
    title: string;
    cover_style: string;
    updated_at: string;
  }[];
}

export interface TablesData {
  tables: {
    id: string;
    name: string;
    icon: string | null;
    row_count: number;
    updated_at: string;
  }[];
}

export interface FormsData {
  forms: {
    id: string;
    title: string;
    is_published: boolean;
    response_count: number;
    updated_at: string;
  }[];
}

// Drag handle props passed through to widget cards
export interface DragHandleProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attributes: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners: any;
}

// Combined data object passed from server to client
export interface DashboardWidgetData {
  teamWorkload: TeamWorkloadData;
  kpiCallingFillRate: KpiCallingFillRateData;
  kpiMeetingReadiness: KpiMeetingReadinessData;
  kpiActiveDiscussions: KpiActiveDiscussionsData;
  myTasks: MyTasksData;
  callingPipeline: CallingPipelineData;
  upcomingMeetings: UpcomingMeetingsData;
  notebooks: NotebooksData;
  tables: TablesData;
  forms: FormsData;
}
