import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeTokens } from '@/lib/zoom/token-manager';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const OAUTH_STATE_COOKIE = 'zoom_oauth_state';

// GET /api/auth/zoom/callback - Handle Zoom OAuth callback
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
        console.error('Zoom OAuth error:', error, errorDescription);
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', errorDescription || error);
        return NextResponse.redirect(errorUrl);
    }

    if (!code || !state) {
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'Missing authorization code or state');
        return NextResponse.redirect(errorUrl);
    }

    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get(OAUTH_STATE_COOKIE);

    if (!storedStateCookie) {
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'OAuth session expired. Please try again.');
        return NextResponse.redirect(errorUrl);
    }

    let oauthState: { state: string; workspace_id: string; app_id: string };
    try {
        oauthState = JSON.parse(storedStateCookie.value);
    } catch {
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'Invalid OAuth state');
        return NextResponse.redirect(errorUrl);
    }

    if (state !== oauthState.state) {
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'Invalid state parameter');
        return NextResponse.redirect(errorUrl);
    }

    cookieStore.delete(OAUTH_STATE_COOKIE);

    try {
        const redirectUri = process.env.ZOOM_REDIRECT_URI;
        if (!redirectUri) throw new Error('Zoom redirect URI not configured');

        const tokens = await exchangeCodeForTokens(code, redirectUri);
        await storeTokens(user.id, oauthState.app_id, oauthState.workspace_id, tokens);

        const successUrl = new URL('/settings', request.url);
        successUrl.searchParams.set('tab', 'integrations');
        successUrl.searchParams.set('connected', 'zoom');
        return NextResponse.redirect(successUrl);
    } catch (tokenError) {
        console.error('Zoom token exchange failed:', tokenError);
        const errorUrl = new URL('/settings', request.url);
        errorUrl.searchParams.set('tab', 'integrations');
        errorUrl.searchParams.set('error', 'Failed to connect to Zoom. Please try again.');
        return NextResponse.redirect(errorUrl);
    }
}
