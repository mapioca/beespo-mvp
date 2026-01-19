import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper: Normalize All-Day event times
function normalizeAllDayTimes(startAt: string, endAt: string, isAllDay: boolean) {
    if (!isAllDay) {
        return { start_at: startAt, end_at: endAt };
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return {
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
    };
}

// GET /api/events/[id] - Get a single event
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Fetch the event
    const { data: event, error } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .select(`
            *,
            created_by_profile:created_by (
                full_name
            ),
            announcements (
                id,
                title,
                status,
                workspace_announcement_id
            )
        `)
        .eq('id', id)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
}

// PATCH /api/events/[id] - Update an event
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check permissions
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (!['admin', 'leader'].includes(profile.role)) {
        return NextResponse.json({ error: 'Only admins and leaders can update events' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
        title,
        description,
        location,
        start_at,
        end_at,
        is_all_day,
        promote_to_announcement = false,
    } = body;

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (location !== undefined) updateData.location = location;
    if (is_all_day !== undefined) updateData.is_all_day = is_all_day;

    // Handle date normalization for All-Day events
    if (start_at !== undefined && end_at !== undefined) {
        const shouldNormalize = is_all_day !== undefined ? is_all_day : false;
        const normalizedTimes = normalizeAllDayTimes(start_at, end_at, shouldNormalize);
        updateData.start_at = normalizedTimes.start_at;
        updateData.end_at = normalizedTimes.end_at;
    } else if (start_at !== undefined) {
        updateData.start_at = start_at;
    } else if (end_at !== undefined) {
        updateData.end_at = end_at;
    }

    // Update the event
    const { data: event, error: eventError } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', profile.workspace_id)
        .select()
        .single();

    if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    let announcement = null;

    // Handle "Promote to Announcement" on update
    if (promote_to_announcement) {
        // Check if an announcement already exists for this event
        const { data: existingAnnouncement } = await (supabase
            .from('announcements') as ReturnType<typeof supabase.from>)
            .select('id')
            .eq('event_id', id)
            .single();

        if (!existingAnnouncement) {
            const now = new Date().toISOString();

            const { data: announcementData, error: announcementError } = await (supabase
                .from('announcements') as ReturnType<typeof supabase.from>)
                .insert({
                    workspace_id: profile.workspace_id,
                    title: event.title,
                    content: event.description || null,
                    priority: 'medium',
                    status: 'active',
                    event_id: event.id,
                    display_start: now,
                    display_until: event.start_at,
                    created_by: user.id,
                })
                .select()
                .single();

            if (announcementError) {
                console.error('Failed to create announcement:', announcementError);
            } else {
                announcement = announcementData;
            }
        }
    }

    return NextResponse.json({ event, announcement });
}

// DELETE /api/events/[id] - Delete an event
export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createClient();
    const { id } = await params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check permissions
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (!['admin', 'leader'].includes(profile.role)) {
        return NextResponse.json({ error: 'Only admins and leaders can delete events' }, { status: 403 });
    }

    // Delete the event (announcements with event_id FK will be set to NULL due to ON DELETE SET NULL)
    const { error } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('id', id)
        .eq('workspace_id', profile.workspace_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
