import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Helper: Normalize All-Day event times
function normalizeAllDayTimes(startAt: string, endAt: string, isAllDay: boolean) {
    if (!isAllDay) {
        return { start_at: startAt, end_at: endAt };
    }

    // For all-day events: start at 00:00:00, end at 23:59:59 of respective dates
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    // Set start to beginning of day (00:00:00)
    startDate.setHours(0, 0, 0, 0);

    // Set end to end of day (23:59:59)
    endDate.setHours(23, 59, 59, 999);

    return {
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
    };
}

// GET /api/events - List events for workspace
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // Build query
    let query = (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .select(`
            *,
            created_by_profile:created_by (
                full_name
            ),
            announcements (
                id,
                title,
                status
            )
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('start_at', { ascending: false });

    // Apply date filters if provided
    if (startDate) {
        query = query.gte('start_at', startDate);
    }
    if (endDate) {
        query = query.lte('end_at', endDate);
    }

    const { data: events, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ events });
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest) {
    const supabase = await createClient();

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
        return NextResponse.json({ error: 'Only admins and leaders can create events' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
        title,
        description,
        location,
        start_at,
        end_at,
        is_all_day = false,
        promote_to_announcement = false,
        external_source_id = null,
        external_source_type = null,
    } = body;

    // Validate required fields
    if (!title || !start_at || !end_at) {
        return NextResponse.json({ error: 'Title, start_at, and end_at are required' }, { status: 400 });
    }

    // Normalize times for All-Day events
    const normalizedTimes = normalizeAllDayTimes(start_at, end_at, is_all_day);

    // Create the event
    const { data: event, error: eventError } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .insert({
            workspace_id: profile.workspace_id,
            title,
            description: description || null,
            location: location || null,
            start_at: normalizedTimes.start_at,
            end_at: normalizedTimes.end_at,
            is_all_day,
            external_source_id: external_source_id || null,
            external_source_type: external_source_type || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (eventError) {
        return NextResponse.json({ error: eventError.message }, { status: 500 });
    }

    let announcement = null;

    // Handle "Promote to Announcement" logic
    if (promote_to_announcement) {
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

    return NextResponse.json({
        event,
        announcement,
    }, { status: 201 });
}
