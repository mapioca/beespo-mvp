import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/zoom/token-manager';
import { NextRequest, NextResponse } from 'next/server';
import type { ZoomMeetingResponse, ZoomMeetingUpdatePayload } from '@/types/zoom';

/** Generate a 6-character alphanumeric passcode, avoiding visually ambiguous characters. */
function generatePasscode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// POST /api/meetings/[id]/zoom - Create a Zoom meeting for this agenda
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const body = await request.json().catch(() => ({}));
    const duration: number = body.duration && body.duration > 0 ? body.duration : 60;
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Fetch the meeting and verify workspace ownership
    const { data: meeting, error: meetingError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .select('id, title, scheduled_date, workspace_id')
        .eq('id', id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.workspace_id !== profile.workspace_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get a valid Zoom access token (with auto-refresh)
    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({ error: 'zoom_not_connected' }, { status: 400 });
    }

    const passcode = generatePasscode();

    // Create the Zoom meeting
    const zoomResponse = await fetch('https://api.zoom.us/v2/users/me/meetings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            topic: meeting.title,
            type: 2, // Scheduled meeting
            start_time: meeting.scheduled_date,
            duration,
            timezone: 'UTC',
            password: passcode,
        }),
    });

    if (!zoomResponse.ok) {
        const zoomError = await zoomResponse.text();
        console.error('Zoom API error:', zoomError);
        return NextResponse.json({ error: 'Failed to create Zoom meeting' }, { status: 502 });
    }

    const zoomMeeting: ZoomMeetingResponse = await zoomResponse.json();

    // Prefer the passcode Zoom echoes back (it may normalise it); fall back to ours
    const storedPasscode = zoomMeeting.password ?? passcode;

    // Save the Zoom meeting details back to the meetings record
    const { error: updateError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .update({
            zoom_meeting_id: String(zoomMeeting.id),
            zoom_join_url: zoomMeeting.join_url,
            zoom_start_url: zoomMeeting.start_url,
            zoom_passcode: storedPasscode,
        })
        .eq('id', id);

    if (updateError) {
        console.error('Failed to save Zoom meeting details:', updateError);
        return NextResponse.json({ error: 'Failed to save Zoom meeting details' }, { status: 500 });
    }

    return NextResponse.json({
        zoom_join_url: zoomMeeting.join_url,
        zoom_start_url: zoomMeeting.start_url,
        zoom_passcode: storedPasscode,
    });
}

// PATCH /api/meetings/[id]/zoom - Update Zoom meeting topic/time
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    const { data: meeting, error: meetingError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .select('id, title, scheduled_date, workspace_id, zoom_meeting_id')
        .eq('id', id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.workspace_id !== profile.workspace_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!meeting.zoom_meeting_id) {
        return NextResponse.json({ error: 'No Zoom meeting linked' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({ error: 'zoom_not_connected' }, { status: 400 });
    }

    const body = await request.json();

    // Zoom requires a full ISO 8601 string (e.g. "2026-03-15T11:00:00Z").
    // datetime-local inputs produce "2026-03-15T11:00" without seconds/timezone,
    // so we coerce it through Date to get the proper format.
    const startTimeIso = body.start_time
        ? new Date(body.start_time).toISOString()
        : undefined;

    const payload: ZoomMeetingUpdatePayload = {
        topic: body.topic,
        start_time: startTimeIso,
        timezone: 'UTC',
        ...(body.duration && body.duration > 0 ? { duration: body.duration } : {}),
    };

    const zoomResponse = await fetch(`https://api.zoom.us/v2/meetings/${meeting.zoom_meeting_id}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    if (!zoomResponse.ok) {
        const zoomError = await zoomResponse.text();
        console.error('Zoom PATCH error:', zoomResponse.status, zoomError);
        return NextResponse.json({ error: 'Failed to update Zoom meeting' }, { status: 502 });
    }

    // Keep DB in sync
    const dbUpdate: Record<string, unknown> = {};
    if (body.topic) dbUpdate.title = body.topic;
    if (startTimeIso) dbUpdate.scheduled_date = startTimeIso;

    if (Object.keys(dbUpdate).length > 0) {
        await (supabase.from('meetings') as ReturnType<typeof supabase.from>)
            .update(dbUpdate)
            .eq('id', id);
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/meetings/[id]/zoom - Remove Zoom meeting
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    const { data: meeting, error: meetingError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .select('id, workspace_id, zoom_meeting_id')
        .eq('id', id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.workspace_id !== profile.workspace_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!meeting.zoom_meeting_id) {
        return NextResponse.json({ error: 'No Zoom meeting linked' }, { status: 400 });
    }

    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({ error: 'zoom_not_connected' }, { status: 400 });
    }

    const zoomResponse = await fetch(`https://api.zoom.us/v2/meetings/${meeting.zoom_meeting_id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 204 = success; 404 = already deleted on Zoom side — both are fine
    if (!zoomResponse.ok && zoomResponse.status !== 404) {
        const zoomError = await zoomResponse.text();
        console.error('Zoom DELETE error:', zoomError);
        return NextResponse.json({ error: 'Failed to delete Zoom meeting' }, { status: 502 });
    }

    const { error: updateError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .update({ zoom_meeting_id: null, zoom_join_url: null, zoom_start_url: null, zoom_passcode: null })
        .eq('id', id);

    if (updateError) {
        console.error('Failed to clear Zoom fields:', updateError);
        return NextResponse.json({ error: 'Failed to clear Zoom meeting' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
