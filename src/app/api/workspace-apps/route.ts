import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/workspace-apps - List apps connected to the current workspace
export async function GET() {
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

    // Get workspace apps with joined app data
    const { data: workspaceApps, error } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .select(`
            *,
            app:apps (*)
        `)
        .eq('workspace_id', profile.workspace_id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaceApps });
}

// POST /api/workspace-apps - Add an app to the workspace (initiate connection)
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
        return NextResponse.json({ error: 'Only admins and leaders can add apps' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { app_slug } = body;

    if (!app_slug) {
        return NextResponse.json({ error: 'app_slug is required' }, { status: 400 });
    }

    // Get the app by slug
    const { data: app, error: appError } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('slug', app_slug)
        .eq('is_active', true)
        .single();

    if (appError || !app) {
        return NextResponse.json({ error: 'App not found' }, { status: 404 });
    }

    // Check if app is already connected
    const { data: existingApp } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .select('id, status')
        .eq('workspace_id', profile.workspace_id)
        .eq('app_id', app.id)
        .single();

    if (existingApp) {
        // If disconnected, update to pending for reconnection
        if (existingApp.status === 'disconnected') {
            const { data: updatedApp, error: updateError } = await (supabase
                .from('workspace_apps') as ReturnType<typeof supabase.from>)
                .update({
                    status: 'pending',
                    connected_by: user.id,
                    connected_at: null,
                })
                .eq('id', existingApp.id)
                .select(`
                    *,
                    app:apps (*)
                `)
                .single();

            if (updateError) {
                return NextResponse.json({ error: updateError.message }, { status: 500 });
            }

            return NextResponse.json({
                workspaceApp: updatedApp,
                requiresOAuth: app.requires_oauth,
            });
        }

        return NextResponse.json({
            error: 'App is already connected to this workspace',
            status: existingApp.status,
        }, { status: 409 });
    }

    // Create workspace app record with pending status
    const { data: workspaceApp, error: createError } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .insert({
            workspace_id: profile.workspace_id,
            app_id: app.id,
            connected_by: user.id,
            status: 'pending',
        })
        .select(`
            *,
            app:apps (*)
        `)
        .single();

    if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
        workspaceApp,
        requiresOAuth: app.requires_oauth,
    }, { status: 201 });
}
