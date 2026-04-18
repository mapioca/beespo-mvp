import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

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

    if (!["admin", "leader"].includes(profile.role)) {
        return NextResponse.json({ error: "Only admins and leaders can enable meeting features" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const requestedTitle =
        typeof body?.title === "string" && body.title.trim().length > 0
            ? body.title.trim()
            : null;

    const { data: event, error: eventError } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
        .select("id, title, workspace_id")
        .eq("id", id)
        .eq("workspace_id", profile.workspace_id)
        .single();

    if (eventError || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: existingMeeting } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id")
        .eq("event_id", id)
        .maybeSingle();

    if (existingMeeting?.id) {
        return NextResponse.json(
            { error: "This event already has meeting features enabled." },
            { status: 409 }
        );
    }

    const { data: meetingId, error: linkError } = await (supabase.rpc as unknown as (
        name: string,
        args: Record<string, unknown>
    ) => Promise<{ data: string | null; error: { message: string } | null }>)(
        "link_meeting_to_event",
        {
            p_event_id: id,
            p_meeting_title: requestedTitle ?? event.title,
            p_plan_type: null,
            p_template_id: null,
        }
    );

    if (linkError || !meetingId) {
        return NextResponse.json(
            { error: linkError?.message ?? "Failed to enable meeting features" },
            { status: 500 }
        );
    }

    const { data: meeting, error: meetingError } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, title, status, plan_type, event_id")
        .eq("id", meetingId)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: "Meeting created but could not be loaded" }, { status: 500 });
    }

    return NextResponse.json({ meeting }, { status: 201 });
}
