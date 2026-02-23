"use server";

import { createClient } from "@/lib/supabase/server";

export async function dismissReleaseNoteAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("profiles") as any)
    .update({ last_read_release_note_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    return { success: false };
  }

  return { success: true };
}
