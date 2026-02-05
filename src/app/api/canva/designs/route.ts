import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/canva/token-manager';
import { CanvaClient } from '@/lib/canva/canva-client';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/canva/designs - List designs for an event
export async function GET(request: NextRequest) {
    const supabase = await createClient();

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

    // Get event_id from query params
    const eventId = request.nextUrl.searchParams.get('event_id');
    if (!eventId) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Get designs for this event
    const { data: designs, error } = await (supabase
        .from('event_designs') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('event_id', eventId)
        .eq('workspace_id', profile.workspace_id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ designs });
}

// POST /api/canva/designs - Create a new design for an event
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
        return NextResponse.json({ error: 'Only admins and leaders can create designs' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { event_id, title, width = 480, height = 672 } = body;

    if (!event_id) {
        return NextResponse.json({ error: 'event_id is required' }, { status: 400 });
    }

    // Verify the event exists and belongs to the workspace
    const { data: event } = await (supabase
        .from('events') as ReturnType<typeof supabase.from>)
        .select('id, title')
        .eq('id', event_id)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get a valid Canva access token
    const accessToken = await getValidAccessToken(user.id, profile.workspace_id);
    if (!accessToken) {
        return NextResponse.json({
            error: 'Canva is not connected or token expired',
            needsAuth: true,
        }, { status: 401 });
    }

    // Create design in Canva
    const designTitle = title || `Invitation - ${event.title}`;
    const canvaClient = new CanvaClient(accessToken);

    try {
        const canvaResponse = await canvaClient.createDesign(designTitle, width, height);

        // Calculate edit URL expiration (Canva edit URLs typically expire in 24 hours)
        const editUrlExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        // Store design in database
        const { data: design, error: createError } = await (supabase
            .from('event_designs') as ReturnType<typeof supabase.from>)
            .insert({
                event_id,
                workspace_id: profile.workspace_id,
                canva_design_id: canvaResponse.design.id,
                canva_edit_url: canvaResponse.design.urls.edit_url,
                edit_url_expires_at: editUrlExpiresAt.toISOString(),
                title: designTitle,
                width,
                height,
                export_status: 'pending',
                created_by: user.id,
            })
            .select()
            .single();

        if (createError) {
            return NextResponse.json({ error: createError.message }, { status: 500 });
        }

        return NextResponse.json({
            design,
            edit_url: canvaResponse.design.urls.edit_url,
        }, { status: 201 });
    } catch (canvaError) {
        console.error('Failed to create Canva design:', canvaError);
        return NextResponse.json({
            error: 'Failed to create design in Canva',
        }, { status: 500 });
    }
}
