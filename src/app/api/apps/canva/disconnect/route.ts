import { createClient } from '@/lib/supabase/server';
import { revokeTokens } from '@/lib/canva/token-manager';
import { NextResponse } from 'next/server';

// POST /api/apps/canva/disconnect - Disconnect Canva from workspace
export async function POST() {
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
        return NextResponse.json({ error: 'Only admins and leaders can disconnect apps' }, { status: 403 });
    }

    // Get Canva app
    const { data: canvaApp } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('id')
        .eq('slug', 'canva')
        .single();

    if (!canvaApp) {
        return NextResponse.json({ error: 'Canva app not found' }, { status: 404 });
    }

    // Get the user's token to revoke
    const { data: tokenRecord } = await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .select('access_token')
        .eq('user_id', user.id)
        .eq('app_id', canvaApp.id)
        .eq('workspace_id', profile.workspace_id)
        .single();

    // Revoke the token at Canva (best effort)
    if (tokenRecord) {
        try {
            await revokeTokens(tokenRecord.access_token);
        } catch (error) {
            console.error('Token revocation failed:', error);
            // Continue anyway - we'll delete locally
        }
    }

    // Delete the token record
    await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('user_id', user.id)
        .eq('app_id', canvaApp.id)
        .eq('workspace_id', profile.workspace_id);

    // Check if any other users in the workspace have tokens
    const { count } = await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .select('*', { count: 'exact', head: true })
        .eq('app_id', canvaApp.id)
        .eq('workspace_id', profile.workspace_id);

    // If no more tokens, update workspace app status to disconnected
    if (count === 0) {
        await (supabase
            .from('workspace_apps') as ReturnType<typeof supabase.from>)
            .update({
                status: 'disconnected',
                connected_at: null,
            })
            .eq('workspace_id', profile.workspace_id)
            .eq('app_id', canvaApp.id);
    }

    return NextResponse.json({ success: true });
}
