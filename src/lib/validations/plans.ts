import { z } from "zod";

const uuidSchema = z.string().uuid();

export const agendaObjectiveSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
});

export const agendaDiscussionItemSchema = z.object({
  id: uuidSchema.optional(),
  topic: z.string().trim().min(1),
  estimated_time: z.number().int().min(0).default(5),
  notes: z.string().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
  status: z.enum(["pending", "in_progress", "completed", "deferred"]).optional(),
  catalog_item_id: uuidSchema.optional().nullable(),
});

export const createAgendaPlanSchema = z.object({
  meeting_id: uuidSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  objectives: z.array(agendaObjectiveSchema).default([]),
  discussion_items: z.array(agendaDiscussionItemSchema).default([]),
});

export const updateAgendaPlanSchema = z.object({
  agenda_document_id: uuidSchema,
  title: z.string().trim().optional(),
  description: z.string().trim().optional().nullable(),
  status: z.enum(["draft", "finalized", "archived"]).optional(),
  objectives: z.array(agendaObjectiveSchema).optional(),
  discussion_items: z.array(agendaDiscussionItemSchema).optional(),
});

export const programSegmentSchema = z.object({
  id: uuidSchema.optional(),
  title: z.string().trim().min(1),
  estimated_time: z.number().int().min(0).default(5),
  description: z.string().trim().optional().nullable(),
  segment_type: z.enum([
    "prayer",
    "hymn",
    "spiritual_thought",
    "business",
    "speaker",
    "musical_number",
    "rest_hymn",
    "custom",
    "sacrament",
    "welcome",
    "closing",
    "announcement",
  ]),
  order_index: z.number().int().min(0).default(0),
  catalog_item_id: uuidSchema.optional().nullable(),
  hymn_id: uuidSchema.optional().nullable(),
});

export const createProgramPlanSchema = z.object({
  meeting_id: uuidSchema,
  title: z.string().trim().min(1),
  description: z.string().trim().optional().nullable(),
  style_config: z.record(z.string(), z.unknown()).optional(),
  segments: z.array(programSegmentSchema).default([]),
});

export const updateProgramPlanSchema = z.object({
  program_document_id: uuidSchema,
  title: z.string().trim().optional(),
  description: z.string().trim().optional().nullable(),
  style_config: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["draft", "finalized", "archived"]).optional(),
  segments: z.array(programSegmentSchema).optional(),
});

export const planAssignmentSchema = z.object({
  assignable_type: z.enum(["program_segment", "agenda_discussion_item"]),
  assignable_id: uuidSchema,
  assignee_type: z.enum(["member", "participant", "speaker", "external"]),
  assignee_id: uuidSchema.optional().nullable(),
  assignee_name: z.string().trim().optional().nullable(),
  role: z.string().trim().optional().nullable(),
}).refine((value) => Boolean(value.assignee_id || value.assignee_name), {
  message: "At least one of assignee_id or assignee_name is required",
  path: ["assignee_id"],
});

export const linkTaskToDiscussionSchema = z.object({
  agenda_discussion_item_id: uuidSchema,
  task_id: uuidSchema,
});

export type CreateAgendaPlanInput = z.infer<typeof createAgendaPlanSchema>;
export type UpdateAgendaPlanInput = z.infer<typeof updateAgendaPlanSchema>;
export type CreateProgramPlanInput = z.infer<typeof createProgramPlanSchema>;
export type UpdateProgramPlanInput = z.infer<typeof updateProgramPlanSchema>;
export type PlanAssignmentInput = z.infer<typeof planAssignmentSchema>;
export type LinkTaskToDiscussionInput = z.infer<typeof linkTaskToDiscussionSchema>;
