"use server";

import { createClient } from "@/lib/supabase/server";

export async function rebuildLegacyMeeting(legacyMeetingId: string, targetPlanType: "agenda" | "program" = "agenda") {
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: { event_id: string; meeting_id: string; plan_document_id: string } | null; error: { message: string } | null }>)(
    "rebuild_legacy_meeting",
    {
      p_legacy_meeting_id: legacyMeetingId,
      p_target_plan_type: targetPlanType,
    }
  );

  if (error) return { error: error.message };
  return { data };
}
