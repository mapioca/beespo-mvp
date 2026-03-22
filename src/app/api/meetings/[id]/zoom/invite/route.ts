import { createClient } from '@/lib/supabase/server';
import { sendZoomInviteEmail } from '@/lib/email/send-zoom-invite-email';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/meetings/[id]/zoom/invite - Send Zoom join link via email
export async function POST(
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
        .select('workspace_id, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    const { data: meeting, error: meetingError } = await (supabase
        .from('meetings') as ReturnType<typeof supabase.from>)
        .select('id, title, scheduled_date, workspace_id, zoom_join_url, zoom_passcode')
        .eq('id', id)
        .single();

    if (meetingError || !meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.workspace_id !== profile.workspace_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!meeting.zoom_join_url) {
        return NextResponse.json({ error: 'No Zoom meeting linked' }, { status: 400 });
    }

    const body = await request.json();
    const email = body.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const result = await sendZoomInviteEmail({
        toEmail: email,
        inviterName: profile.full_name || user.email || 'Someone',
        meetingTitle: meeting.title,
        scheduledDate: meeting.scheduled_date,
        joinUrl: meeting.zoom_join_url,
        passcode: meeting.zoom_passcode ?? undefined,
    });

    if (!result.success) {
        return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
