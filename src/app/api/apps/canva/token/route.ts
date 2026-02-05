import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/canva/token-manager';
import { NextResponse } from 'next/server';

// GET /api/apps/canva/token - Get a valid access token (auto-refreshes if needed)
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

    // Check if Canva is connected for this workspace
    const { data: canvaApp } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('id')
        .eq('slug', 'canva')
        .single();

    if (!canvaApp) {
        return NextResponse.json({ error: 'Canva app not found' }, { status: 404 });
    }

    const { data: workspaceApp } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .select('status')
        .eq('workspace_id', profile.workspace_id)
        .eq('app_id', canvaApp.id)
        .single();

    if (!workspaceApp || workspaceApp.status !== 'connected') {
        return NextResponse.json({
            error: 'Canva is not connected to this workspace',
            needsAuth: true,
        }, { status: 401 });
    }

    // Get a valid access token
    try {
        const accessToken = await getValidAccessToken(user.id, profile.workspace_id);

        if (!accessToken) {
            return NextResponse.json({
                error: 'No valid token available',
                needsAuth: true,
            }, { status: 401 });
        }

        return NextResponse.json({ accessToken });
    } catch (error) {
        console.error('Failed to get access token:', error);
        return NextResponse.json({
            error: 'Failed to get access token',
            needsAuth: true,
        }, { status: 500 });
    }
}
