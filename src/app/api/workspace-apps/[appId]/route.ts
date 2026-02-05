import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/workspace-apps/[appId] - Get workspace app details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const { appId } = await params;
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

    // Get the workspace app
    const { data: workspaceApp, error } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .select(`
            *,
            app:apps (*)
        `)
        .eq('id', appId)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return NextResponse.json({ error: 'Workspace app not found' }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ workspaceApp });
}

// DELETE /api/workspace-apps/[appId] - Remove app from workspace (disconnect)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ appId: string }> }
) {
    const { appId } = await params;
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
        return NextResponse.json({ error: 'Only admins and leaders can remove apps' }, { status: 403 });
    }

    // Check if the workspace app exists
    const { data: workspaceApp, error: findError } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .select('id, app_id')
        .eq('id', appId)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (findError || !workspaceApp) {
        return NextResponse.json({ error: 'Workspace app not found' }, { status: 404 });
    }

    // Delete associated tokens for this user
    await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('workspace_id', profile.workspace_id)
        .eq('app_id', workspaceApp.app_id);

    // Update workspace app status to disconnected (soft delete)
    const { error: updateError } = await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .update({
            status: 'disconnected',
            connected_at: null,
        })
        .eq('id', appId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
