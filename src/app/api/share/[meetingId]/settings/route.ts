import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { MeetingShareSettings } from "@/types/share";

// GET /api/share/[meetingId]/settings - Get share settings
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  const supabase = await createClient();

  const { meetingId } = await context.params;

  // Check if user has access
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch meeting to check access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting, error: meetingError } = await (supabase.from("meetings") as any)
    .select("id, workspace_id, is_publicly_shared")
    .eq("id", meetingId)
    .single();

  if (meetingError || !meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Check access: either authenticated user in workspace or public meeting
  if (!meeting.is_publicly_shared) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.workspace_id !== meeting.workspace_id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Fetch settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: settingsError } = await (supabase.from("meeting_share_settings") as any)
    .select("*")
    .eq("meeting_id", meetingId)
    .single();

  if (settingsError && settingsError.code !== "PGRST116") {
    // PGRST116 is "no rows returned"
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  // Return default settings if none exist
  const defaultSettings: MeetingShareSettings = {
    meeting_id: meetingId,
    allow_notes_export: false,
    show_duration_estimates: true,
    show_presenter_names: true,
    custom_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return NextResponse.json({ settings: settings || defaultSettings });
}

// PUT /api/share/[meetingId]/settings - Update share settings
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ meetingId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { meetingId } = await context.params;

  // Get user's profile and check permissions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can update share settings" },
      { status: 403 }
    );
  }

  // Verify meeting belongs to user's workspace
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: meeting } = await (supabase.from("meetings") as any)
    .select("id, workspace_id")
    .eq("id", meetingId)
    .single();

  if (!meeting || meeting.workspace_id !== profile.workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // Parse request body
  const body = await request.json();
  const {
    allow_notes_export,
    show_duration_estimates,
    show_presenter_names,
    custom_message,
  } = body;

  // Upsert settings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings, error: upsertError } = await (supabase.from("meeting_share_settings") as any)
    .upsert(
      {
        meeting_id: meetingId,
        allow_notes_export:
          allow_notes_export !== undefined ? allow_notes_export : false,
        show_duration_estimates:
          show_duration_estimates !== undefined ? show_duration_estimates : true,
        show_presenter_names:
          show_presenter_names !== undefined ? show_presenter_names : true,
        custom_message: custom_message || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "meeting_id",
      }
    )
    .select()
    .single();

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ settings });
}
