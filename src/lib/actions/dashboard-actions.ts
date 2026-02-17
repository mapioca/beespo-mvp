"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { DashboardConfig } from "@/types/dashboard";

export async function saveDashboardLayout(config: DashboardConfig) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // Validate shape
  if (config.version !== 1 || !Array.isArray(config.widgets)) {
    return { error: "Invalid dashboard config" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("user_settings") as any).upsert(
    {
      user_id: user.id,
      dashboard_layout: config,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("Failed to save dashboard layout:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}
