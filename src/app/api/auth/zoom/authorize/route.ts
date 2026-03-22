import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize';
const OAUTH_STATE_COOKIE = 'zoom_oauth_state';

// GET /api/auth/zoom/authorize - Initiate Zoom OAuth flow
export async function GET() {
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

    const { data: zoomApp } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('id, oauth_scopes')
        .eq('slug', 'zoom')
        .single();

    if (!zoomApp) {
        return NextResponse.json({ error: 'Zoom app not configured' }, { status: 404 });
    }

    const clientId = process.env.ZOOM_CLIENT_ID;
    const redirectUri = process.env.ZOOM_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'Zoom OAuth not configured' }, { status: 500 });
    }

    const state = crypto.randomUUID();

    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE, JSON.stringify({
        state,
        workspace_id: profile.workspace_id,
        app_id: zoomApp.id,
    }), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
    });

    const authUrl = new URL(ZOOM_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', (zoomApp.oauth_scopes as string[]).join(' '));

    return NextResponse.redirect(authUrl.toString());
}
