"use server";

import { createClient } from "@/lib/supabase/server";

export async function isLegacyMeeting(meetingId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select("is_legacy")
    .eq("id", meetingId)
    .single();
  return Boolean(data?.is_legacy);
}

export async function assertNotLegacy(meetingId: string): Promise<void> {
  if (await isLegacyMeeting(meetingId)) {
    throw new Error("This action is only available for non-legacy meetings.");
  }
}

export async function assertLegacy(meetingId: string): Promise<void> {
  if (!(await isLegacyMeeting(meetingId))) {
    throw new Error("This action is only available for legacy meetings.");
  }
}
