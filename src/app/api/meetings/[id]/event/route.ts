import { createClient } from "@/lib/supabase/server";
import { canEdit } from "@/lib/auth/role-permissions";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const bodySchema = z.object({
    event_id: z.string().uuid(),
});

async function getAuthorizedProfile() {
    const supabase = await createClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { supabase, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }

    const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        return { supabase, error: NextResponse.json({ error: "No workspace found" }, { status: 404 }) };
    }

    if (!canEdit(profile.role)) {
        return {
            supabase,
            error: NextResponse.json({ error: "You do not have permission to manage event links" }, { status: 403 }),
        };
    }

    return { supabase, profile };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthorizedProfile();
    if ("error" in auth) return auth.error;

    const { supabase, profile } = auth;
    const body = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { data: meeting, error: meetingError } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, workspace_id, event_id")
        .eq("id", id)
        .eq("workspace_id", profile.workspace_id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    const { data: event, error: eventError } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
        .select("id, title, start_at, location")
        .eq("id", parsed.data.event_id)
        .eq("workspace_id", profile.workspace_id)
        .single();

    if (eventError || !event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: conflictingMeeting } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id")
        .eq("event_id", event.id)
        .neq("id", meeting.id)
        .maybeSingle();

    if (conflictingMeeting?.id) {
        return NextResponse.json(
            { error: "This event is already linked to another meeting." },
            { status: 409 }
        );
    }

    const { error: updateError } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .update({
            event_id: event.id,
            scheduled_date: event.start_at,
        })
        .eq("id", meeting.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        meeting: {
            id: meeting.id,
            event_id: event.id,
        },
        event,
    });
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthorizedProfile();
    if ("error" in auth) return auth.error;

    const { supabase, profile } = auth;
    const { data: meeting, error: meetingError } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .select("id, workspace_id, event_id")
        .eq("id", id)
        .eq("workspace_id", profile.workspace_id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    if (!meeting.event_id) {
        return NextResponse.json({ success: true, meeting: { id: meeting.id, event_id: null } });
    }

    const { error: updateError } = await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
        .update({ event_id: null })
        .eq("id", meeting.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        meeting: {
            id: meeting.id,
            event_id: null,
        },
    });
}
