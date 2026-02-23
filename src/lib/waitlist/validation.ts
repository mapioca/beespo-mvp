import { z } from "zod";

export const waitlistSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email"),
});

export type WaitlistFormData = z.infer<typeof waitlistSchema>;
