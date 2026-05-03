import type {
  AssignableType,
  AssigneeType,
  Database,
  MeetingPlanType,
  PlanDocumentStatus,
  ProgramSegmentType,
} from "@/types/database";

export type AgendaDocument = Database["public"]["Tables"]["agenda_documents"]["Row"];
export type AgendaObjective = Database["public"]["Tables"]["agenda_objectives"]["Row"];
export type AgendaDiscussionItem = Database["public"]["Tables"]["agenda_discussion_items"]["Row"];
export type ProgramDocument = Database["public"]["Tables"]["program_documents"]["Row"];
export type ProgramSegment = Database["public"]["Tables"]["program_segments"]["Row"];
export type PlanAssignment = Database["public"]["Tables"]["plan_assignments"]["Row"];
export type CatalogItem = Database["public"]["Tables"]["catalog_items"]["Row"];

export type TaskSummary = Pick<
  Database["public"]["Tables"]["tasks"]["Row"],
  "id" | "title" | "status" | "priority" | "due_date"
>;

export interface AgendaPlanWithDetails extends AgendaDocument {
  objectives: AgendaObjective[];
  discussion_items: Array<
    AgendaDiscussionItem & {
      tasks: Array<{ task_id: string; task: TaskSummary | null }>;
      assignments: PlanAssignment[];
    }
  >;
}

export interface ProgramPlanWithDetails extends ProgramDocument {
  segments: Array<
    ProgramSegment & {
      assignments: PlanAssignment[];
      hymn?: { id: string; title: string; hymn_number: number } | null;
    }
  >;
}

export type MeetingPlan =
  | { type: "agenda"; data: AgendaPlanWithDetails }
  | { type: "program"; data: ProgramPlanWithDetails }
  | { type: null };

export type {
  AssignableType,
  AssigneeType,
  MeetingPlanType,
  PlanDocumentStatus,
  ProgramSegmentType,
};
