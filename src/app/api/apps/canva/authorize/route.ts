import { createClient } from '@/lib/supabase/server';
import { generatePKCE } from '@/lib/canva/pkce';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CANVA_AUTH_URL = 'https://www.canva.com/api/oauth/authorize';
const OAUTH_STATE_COOKIE = 'canva_oauth_state';

// GET /api/apps/canva/authorize - Initiate Canva OAuth flow
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace and role
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (!['admin', 'leader'].includes(profile.role)) {
        return NextResponse.json({ error: 'Only admins and leaders can connect apps' }, { status: 403 });
    }

    // Get Canva app from database
    const { data: canvaApp } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('id, oauth_scopes')
        .eq('slug', 'canva')
        .single();

    if (!canvaApp) {
        return NextResponse.json({ error: 'Canva app not found' }, { status: 404 });
    }

    // Generate PKCE parameters
    const { codeVerifier, codeChallenge, state } = generatePKCE();

    // Store OAuth state in a secure cookie
    const oauthState = JSON.stringify({
        code_verifier: codeVerifier,
        workspace_id: profile.workspace_id,
        app_id: canvaApp.id,
        state,
        redirect_after: '/apps',
    });

    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE, oauthState, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
    });

    // Build Canva authorization URL
    const clientId = process.env.CANVA_CLIENT_ID;
    const redirectUri = process.env.CANVA_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json({ error: 'Canva OAuth not configured' }, { status: 500 });
    }

    const scopes = canvaApp.oauth_scopes.join(' ');

    const authUrl = new URL(CANVA_AUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    // Redirect to Canva authorization
    return NextResponse.redirect(authUrl.toString());
}
