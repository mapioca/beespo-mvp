import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/share/activity
// Query params:
//   entity_id — filter by meeting/form/table id (optional)
//   entity_type — filter by entity type (optional, default all)
//   limit — page size (default 20, max 100)
//   offset — pagination offset (default 0)
export async function GET(request: NextRequest) {
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (profile as any)?.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  const params = request.nextUrl.searchParams;
  const entityId = params.get("entity_id");
  const entityType = params.get("entity_type");
  const limit = Math.min(parseInt(params.get("limit") ?? "20", 10), 100);
  const offset = parseInt(params.get("offset") ?? "0", 10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("share_activity_log")
    .select(`
      id, action, entity_type, entity_id, target_email,
      sharing_group_id, details, created_at,
      performer:performed_by (full_name, email),
      sharing_groups:sharing_group_id (name)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (entityId) {
    query = query.eq("entity_id", entityId);
  }
  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  const { data: entries, error } = await query;

  if (error) {
    console.error("Failed to fetch activity log:", error);
    return NextResponse.json({ error: "Failed to fetch activity" }, { status: 500 });
  }

  return NextResponse.json({ entries: entries ?? [], offset, limit });
}
