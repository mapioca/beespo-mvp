"use server";

import { createClient } from "@/lib/supabase/server";

export async function logDiscussionActivity(
  discussionId: string,
  activityType: string,
  details?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from("discussion_activities") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      discussion_id: discussionId,
      user_id: user.id,
      activity_type: activityType,
      details: details ?? null,
    });
}
