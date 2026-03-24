import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/share/recent — return the most recently shared-with email addresses
// for this workspace (used as suggestions in the share dialog)
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  const workspaceId = (profile as any)?.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ emails: [] });
  }

  // Get the most recently shared-with emails via activity log for this workspace
  const { data: log } = await (supabase as any)
    .from("share_activity_log")
    .select("target_email")
    .eq("workspace_id", workspaceId)
    .eq("action", "shared")
    .not("target_email", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!log) {
    return NextResponse.json({ emails: [] });
  }

  // Deduplicate and take first 10
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const entry of log) {
    if (entry.target_email && !seen.has(entry.target_email)) {
      seen.add(entry.target_email);
      emails.push(entry.target_email);
      if (emails.length >= 10) break;
    }
  }

  return NextResponse.json({ emails });
}
