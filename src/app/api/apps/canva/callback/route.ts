import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeTokens } from '@/lib/canva/token-manager';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { CanvaOAuthState } from '@/types/canva';

const OAUTH_STATE_COOKIE = 'canva_oauth_state';

// GET /api/apps/canva/callback - Handle Canva OAuth callback
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
        console.error('OAuth error:', error, errorDescription);
        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', errorDescription || error);
        return NextResponse.redirect(errorUrl);
    }

    if (!code || !state) {
        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', 'Missing authorization code or state');
        return NextResponse.redirect(errorUrl);
    }

    // Get stored OAuth state from cookie
    const cookieStore = await cookies();
    const storedStateCookie = cookieStore.get(OAUTH_STATE_COOKIE);

    if (!storedStateCookie) {
        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', 'OAuth session expired. Please try again.');
        return NextResponse.redirect(errorUrl);
    }

    let oauthState: CanvaOAuthState;
    try {
        oauthState = JSON.parse(storedStateCookie.value);
    } catch {
        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', 'Invalid OAuth state');
        return NextResponse.redirect(errorUrl);
    }

    // Verify state parameter
    if (state !== (oauthState as CanvaOAuthState & { state: string }).state) {
        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', 'Invalid state parameter');
        return NextResponse.redirect(errorUrl);
    }

    // Clear the OAuth state cookie
    cookieStore.delete(OAUTH_STATE_COOKIE);

    try {
        const redirectUri = process.env.CANVA_REDIRECT_URI;
        if (!redirectUri) {
            throw new Error('Canva redirect URI not configured');
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(
            code,
            oauthState.code_verifier,
            redirectUri
        );

        // Store tokens in database
        await storeTokens(
            user.id,
            oauthState.app_id,
            oauthState.workspace_id,
            tokens
        );

        // Update workspace_apps status to connected
        const { error: updateError } = await (supabase
            .from('workspace_apps') as ReturnType<typeof supabase.from>)
            .update({
                status: 'connected',
                connected_at: new Date().toISOString(),
            })
            .eq('workspace_id', oauthState.workspace_id)
            .eq('app_id', oauthState.app_id);

        if (updateError) {
            console.error('Failed to update workspace app status:', updateError);
        }

        // Redirect to apps page with success
        const successUrl = new URL(oauthState.redirect_after || '/apps', request.url);
        successUrl.searchParams.set('connected', 'canva');
        return NextResponse.redirect(successUrl);
    } catch (tokenError) {
        console.error('Token exchange failed:', tokenError);

        // Update workspace_apps status to error
        await (supabase
            .from('workspace_apps') as ReturnType<typeof supabase.from>)
            .update({ status: 'error' })
            .eq('workspace_id', oauthState.workspace_id)
            .eq('app_id', oauthState.app_id);

        const errorUrl = new URL('/apps', request.url);
        errorUrl.searchParams.set('error', 'Failed to connect to Canva. Please try again.');
        return NextResponse.redirect(errorUrl);
    }
}
