import { z } from "zod";

const uuidSchema = z.string().uuid();

export const discussionLibrarySchema = z.object({
  topic: z.string().trim().min(1),
  estimated_time: z.number().int().min(0).optional(),
  notes_template: z.string().optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
});

export const segmentLibrarySchema = z.object({
  title: z.string().trim().min(1),
  estimated_time: z.number().int().min(0).optional(),
  description: z.string().optional().nullable(),
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
  ]).optional(),
  catalog_item_id: uuidSchema.optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
});

export type DiscussionLibraryInput = z.infer<typeof discussionLibrarySchema>;
export type SegmentLibraryInput = z.infer<typeof segmentLibrarySchema>;
