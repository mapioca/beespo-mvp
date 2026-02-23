"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { waitlistSchema } from "@/lib/waitlist/validation";

export async function joinWaitlist(formData: FormData) {
  const email = formData.get("email");

  const parsed = waitlistSchema.safeParse({ email });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("waitlist_signups")
    .insert({ email: parsed.data.email });

  if (error) {
    if (error.code === "23505") {
      return { error: "You're already on the waitlist!" };
    }
    console.error("Waitlist signup error:", error);
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true, message: "You're on the list! We'll be in touch." };
}
