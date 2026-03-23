import { createClient } from '@/lib/supabase/server';
import { encryptToken, decryptToken } from '@/lib/encryption';
import type { ZoomTokenResponse } from '@/types/zoom';

const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const TOKEN_REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

interface ZoomUserInfo {
  planType: number | null;
  zoomUserId: string | null;
}

/** Fetch plan type and user ID from /v2/users/me.
 *  Returns nulls if the call fails (e.g. scope not yet granted — non-fatal). */
async function fetchZoomUserInfo(accessToken: string): Promise<ZoomUserInfo> {
  try {
    const res = await fetch('https://api.zoom.us/v2/users/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return { planType: null, zoomUserId: null };
    const data = await res.json();
    return {
      planType: typeof data.type === 'number' ? data.type : null,
      zoomUserId: typeof data.id === 'string' ? data.id : null,
    };
  } catch {
    return { planType: null, zoomUserId: null };
  }
}

/** Fetch the Zoom account plan type from /v2/users/me.
 *  Returns 1 (Basic/Free), 2 (Licensed/Paid), or null if the call fails. */
async function fetchZoomPlanType(accessToken: string): Promise<number | null> {
  const { planType } = await fetchZoomUserInfo(accessToken);
  return planType;
}

/** Read the stored plan type for a connected Zoom account.
 *  Returns 1 (Free), 2 (Paid), or null (unknown / not yet fetched). */
export async function getZoomPlanType(
  userId: string,
  workspaceId: string
): Promise<number | null> {
  const supabase = await createClient();

  const { data: zoomApp } = await (supabase
    .from('apps') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('slug', 'zoom')
    .single();

  if (!zoomApp) return null;

  const { data: tokenRecord } = await (supabase
    .from('app_tokens') as ReturnType<typeof supabase.from>)
    .select('zoom_plan_type')
    .eq('user_id', userId)
    .eq('app_id', zoomApp.id)
    .eq('workspace_id', workspaceId)
    .single();

  return (tokenRecord as { zoom_plan_type?: number | null } | null)?.zoom_plan_type ?? null;
}

function getBasicAuthHeader(): string {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Zoom OAuth credentials not configured');
  }
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<ZoomTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getBasicAuthHeader(),
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Zoom token exchange failed:', error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<ZoomTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: getBasicAuthHeader(),
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Zoom token refresh failed:', error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

export async function getValidAccessToken(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data: zoomApp } = await (supabase
    .from('apps') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('slug', 'zoom')
    .single();

  if (!zoomApp) return null;

  const { data: tokenRecord, error } = await (supabase
    .from('app_tokens') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('user_id', userId)
    .eq('app_id', zoomApp.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !tokenRecord) return null;

  const expiresAt = new Date(tokenRecord.expires_at);
  const bufferMs = TOKEN_REFRESH_BUFFER_SECONDS * 1000;

  if (expiresAt.getTime() - Date.now() < bufferMs) {
    try {
      // Decrypt refresh token before use
      let refreshToken = tokenRecord.refresh_token;
      try {
        refreshToken = decryptToken(tokenRecord.refresh_token);
      } catch {
        // Token might be unencrypted (backward compatibility)
        console.warn('Failed to decrypt refresh token, using as-is');
      }

      const newTokens = await refreshAccessToken(refreshToken);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Re-fetch plan type on each token refresh (keeps it current if user upgrades/downgrades)
      const planType = await fetchZoomPlanType(newTokens.access_token);

      // Encrypt tokens before storing
      const encryptedAccessToken = encryptToken(newTokens.access_token);
      const encryptedRefreshToken = encryptToken(newTokens.refresh_token);

      await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .update({
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: newExpiresAt.toISOString(),
          scopes: newTokens.scope.split(' '),
          ...(planType !== null ? { zoom_plan_type: planType } : {}),
        })
        .eq('id', tokenRecord.id);

      return newTokens.access_token;
    } catch {
      return null;
    }
  }

  // Decrypt access token before returning
  let accessToken = tokenRecord.access_token;
  try {
    accessToken = decryptToken(tokenRecord.access_token);
  } catch {
    // Token might be unencrypted (backward compatibility)
    console.warn('Failed to decrypt access token, using as-is');
  }

  return accessToken;
}

export async function storeTokens(
  userId: string,
  appId: string,
  workspaceId: string,
  tokens: ZoomTokenResponse
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Fetch plan type and Zoom user ID at connect time — non-fatal if it fails
  const { planType, zoomUserId } = await fetchZoomUserInfo(tokens.access_token);

  // Encrypt tokens before storing
  const encryptedAccessToken = encryptToken(tokens.access_token);
  const encryptedRefreshToken = encryptToken(tokens.refresh_token);

  const { error } = await (supabase
    .from('app_tokens') as ReturnType<typeof supabase.from>)
    .upsert({
      user_id: userId,
      app_id: appId,
      workspace_id: workspaceId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt.toISOString(),
      scopes: tokens.scope.split(' '),
      ...(planType !== null ? { zoom_plan_type: planType } : {}),
      ...(zoomUserId !== null ? { zoom_user_id: zoomUserId } : {}),
    }, {
      onConflict: 'user_id,app_id,workspace_id',
    });

  if (error) {
    console.error('Failed to store Zoom tokens:', error);
    throw new Error('Failed to store Zoom tokens');
  }
}
