import { createClient } from "@/lib/supabase/server";
import { linkMeetingToEventSchema } from "@/lib/validations/event-meeting";
import { canEdit } from "@/lib/auth/role-permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  const { data, error } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      event:events!event_id (
        id,
        title,
        start_at,
        end_at,
        location,
        is_all_day,
        workspace_event_id
      )
    `)
    .eq("workspace_id", profile.workspace_id)
    .order("scheduled_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meetings: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!canEdit(profile.role)) {
    return NextResponse.json({ error: "You do not have permission to create meetings" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = linkMeetingToEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "link_meeting_to_event",
    {
      p_event_id: parsed.data.event_id,
      p_meeting_title: parsed.data.title ?? null,
      p_plan_type: parsed.data.plan_type ?? null,
      p_template_id: parsed.data.template_id ?? null,
    }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ meeting_id: data }, { status: 201 });
}
