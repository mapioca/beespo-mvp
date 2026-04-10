import { z } from "zod";

const uuidSchema = z.string().uuid();

export const createEventSchema = z.object({
  title: z.string().trim().min(1),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  description: z.string().trim().optional().nullable(),
  location: z.string().trim().optional().nullable(),
  is_all_day: z.boolean().optional().default(false),
  external_source_id: z.string().trim().optional().nullable(),
  external_source_type: z.enum(["google", "outlook", "ics", "apple", "other"]).optional().nullable(),
  promote_to_announcement: z.boolean().optional().default(false),
});

export const createEventAndMeetingSchema = createEventSchema.extend({
  meeting: z.object({
    title: z.string().trim().optional().nullable(),
    plan_type: z.enum(["agenda", "program"]).optional().nullable(),
    template_id: uuidSchema.optional().nullable(),
  }).optional(),
});

export const linkMeetingToEventSchema = z.object({
  event_id: uuidSchema,
  title: z.string().trim().optional().nullable(),
  plan_type: z.enum(["agenda", "program"]).optional().nullable(),
  template_id: uuidSchema.optional().nullable(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type CreateEventAndMeetingInput = z.infer<typeof createEventAndMeetingSchema>;
export type LinkMeetingToEventInput = z.infer<typeof linkMeetingToEventSchema>;
