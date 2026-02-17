import type { FeatureTier } from "./database";

// Widget type identifiers
export type WidgetType = "sunday_morning" | "action_inbox" | "organizational_pulse";

// Position of a widget in the grid
export interface WidgetPosition {
  id: string;
  type: WidgetType;
  column: number;
  order: number;
  visible: boolean;
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
  defaultColumn: number;
  tiers: FeatureTier[];
  mobilePriority: number; // Lower = shown first on mobile
}

// --- Widget data interfaces ---

export interface SundayMorningData {
  nextMeeting: {
    id: string;
    title: string;
    scheduled_date: string;
    status: string;
    template_name: string | null;
    agenda_items: {
      id: string;
      title: string;
      item_type: string;
      participant_name: string | null;
    }[];
  } | null;
  readiness: {
    percent: number;
    label: string;
    issues: string[];
  } | null;
}

export interface ActionInboxData {
  tasks: {
    id: string;
    title: string;
    priority: "low" | "medium" | "high";
    due_date: string | null;
    status: string;
    meeting_title?: string | null;
  }[];
  totalCount: number;
}

export interface OrganizationalPulseData {
  vacancyCount: number;
  activeDiscussions: number;
  pendingBusiness: number;
  sparklineData: { date: string; completion: number }[];
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
  sundayMorning: SundayMorningData;
  actionInbox: ActionInboxData;
  organizationalPulse: OrganizationalPulseData;
}
