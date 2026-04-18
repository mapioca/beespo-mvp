import { createClient } from '@/lib/supabase/server';
import { createEventAndMeetingSchema } from '@/lib/validations/event-meeting';
import { NextRequest, NextResponse } from 'next/server';

// Helper: Normalize All-Day event times
function normalizeAllDayTimes(startAt: string, endAt: string, isAllDay: boolean) {
    if (!isAllDay) {
        return { start_at: startAt, end_at: endAt };
    }

    const startDate = startAt.slice(0, 10);
    const endDate = endAt.slice(0, 10);

    return {
        start_at: `${startDate}T00:00:00.000Z`,
        end_at: `${endDate}T23:59:59.999Z`,
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
            ),
            meetings!event_id (
                id,
                title,
                status,
                plan_type,
                workspace_meeting_id,
                event_id,
                is_legacy
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
    const parsed = createEventAndMeetingSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Validation failed', details: parsed.error.issues }, { status: 400 });
    }
    const {
        title,
        event_type = "activity",
        description,
        location,
        start_at,
        end_at,
        is_all_day = false,
        date_tbd = false,
        time_tbd = false,
        duration_mode = is_all_day ? "all_day" : "minutes",
        duration_minutes = null,
        promote_to_announcement = false,
        external_source_id = null,
        external_source_type = null,
        meeting,
    } = parsed.data;

    if (meeting) {
        const { data: rpcData, error: rpcError } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: { event_id: string; meeting_id: string } | null; error: { message: string } | null }>)(
            'create_event_and_meeting',
            {
                p_event_title: title,
                p_event_start_at: start_at,
                p_event_end_at: end_at,
                p_event_description: description ?? null,
                p_event_location: location ?? null,
                p_event_is_all_day: is_all_day,
                p_meeting_title: meeting.title ?? null,
                p_meeting_plan_type: meeting.plan_type ?? null,
                p_template_id: meeting.template_id ?? null,
                p_meeting_modality: meeting.modality ?? null,
            }
        );

        if (rpcError || !rpcData) {
            return NextResponse.json({ error: rpcError?.message ?? 'Failed to create linked event and meeting' }, { status: 500 });
        }

        const { error: metadataError } = await (supabase
            .from('events') as ReturnType<typeof supabase.from>)
            .update({
                event_type,
                date_tbd,
                time_tbd,
                duration_mode: is_all_day ? "all_day" : duration_mode,
                duration_minutes: is_all_day ? null : duration_minutes,
            })
            .eq('id', rpcData.event_id);

        if (metadataError) {
            return NextResponse.json({ error: metadataError.message }, { status: 500 });
        }

        const { data: createdEvent, error: fetchError } = await (supabase
            .from('events') as ReturnType<typeof supabase.from>)
            .select(`
                *,
                meetings!event_id (
                    id,
                    title,
                    status,
                    plan_type,
                    workspace_meeting_id,
                    event_id,
                    is_legacy
                )
            `)
            .eq('id', rpcData.event_id)
            .single();

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }

        return NextResponse.json({
            event: createdEvent,
            meeting_id: rpcData.meeting_id,
            announcement: null,
        }, { status: 201 });
    }

    // Normalize times for All-Day events
    const normalizedTimes = normalizeAllDayTimes(start_at, end_at, is_all_day);

    // Create the event
    const { data: event, error: eventError } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .insert({
            workspace_id: profile.workspace_id,
            title,
            event_type,
            description: description || null,
            location: location || null,
            start_at: normalizedTimes.start_at,
            end_at: normalizedTimes.end_at,
            is_all_day,
            date_tbd,
            time_tbd,
            duration_mode: is_all_day ? "all_day" : duration_mode,
            duration_minutes: is_all_day ? null : duration_minutes,
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
