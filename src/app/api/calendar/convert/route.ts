import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/calendar/convert - Convert external event to announcement
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Authenticate user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user profile
  const { data: profile } = await (supabase
    .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // Only admins and leaders can convert events
  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can convert external events" },
      { status: 403 }
    );
  }

  // Parse request body
  const body = await request.json();
  const { externalEventId, priority = "medium", status = "active" } = body;

  if (!externalEventId) {
    return NextResponse.json(
      { error: "External event ID is required" },
      { status: 400 }
    );
  }

  // Get external event with subscription info
  const { data: externalEvent, error: eventError } = await (supabase
    .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select(`
      *,
      calendar_subscriptions!inner (
        workspace_id
      )
    `)
    .eq("id", externalEventId)
    .single();

  if (eventError || !externalEvent) {
    return NextResponse.json(
      { error: "External event not found" },
      { status: 404 }
    );
  }

  // Verify event belongs to user's workspace
  if (externalEvent.calendar_subscriptions.workspace_id !== profile.workspace_id) {
    return NextResponse.json(
      { error: "Event does not belong to your workspace" },
      { status: 403 }
    );
  }

  // Check if already converted
  const { data: existingLink } = await (supabase
    .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select("announcement_id")
    .eq("external_event_id", externalEventId)
    .single();

  if (existingLink) {
    return NextResponse.json(
      { error: "This event has already been converted to an announcement" },
      { status: 400 }
    );
  }

  // Create announcement from external event
  const { data: announcement, error: announcementError } = await (supabase
    .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      workspace_id: profile.workspace_id,
      title: externalEvent.title,
      content: externalEvent.description || null,
      priority,
      status,
      schedule_date: externalEvent.start_date,
      deadline: externalEvent.end_date || null,
      recurrence_type: "none",
      recurrence_config: {},
      created_by: user.id,
    })
    .select()
    .single();

  if (announcementError) {
    return NextResponse.json(
      { error: announcementError.message || "Failed to create announcement" },
      { status: 500 }
    );
  }

  // Create link between external event and announcement
  const { error: linkError } = await (supabase
    .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      external_event_id: externalEventId,
      announcement_id: announcement.id,
    });

  if (linkError) {
    // Rollback: delete announcement
    await (supabase
      .from("announcements") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .delete()
      .eq("id", announcement.id);

    return NextResponse.json(
      { error: "Failed to link event to announcement" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    announcement,
  }, { status: 201 });
}
