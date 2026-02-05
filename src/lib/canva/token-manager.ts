// Token management utilities for Canva OAuth

import { createClient } from '@/lib/supabase/server';
import type { CanvaTokenResponse } from '@/types/canva';

const CANVA_TOKEN_URL = 'https://api.canva.com/rest/v1/oauth/token';
const TOKEN_REFRESH_BUFFER_SECONDS = 300; // Refresh 5 minutes before expiry

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<CanvaTokenResponse> {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Canva OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
  });

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token exchange failed:', error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<CanvaTokenResponse> {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Canva OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(CANVA_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Get a valid access token for the current user
 * Automatically refreshes if expired or about to expire
 */
export async function getValidAccessToken(
  userId: string,
  workspaceId: string
): Promise<string | null> {
  const supabase = await createClient();

  // Get the Canva app ID
  const { data: canvaApp } = await (supabase
    .from('apps') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('slug', 'canva')
    .single();

  if (!canvaApp) {
    console.error('Canva app not found');
    return null;
  }

  // Get the token for this user/workspace
  const { data: tokenRecord, error } = await (supabase
    .from('app_tokens') as ReturnType<typeof supabase.from>)
    .select('*')
    .eq('user_id', userId)
    .eq('app_id', canvaApp.id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !tokenRecord) {
    console.error('No token found for user');
    return null;
  }

  // Check if token needs refresh
  const expiresAt = new Date(tokenRecord.expires_at);
  const now = new Date();
  const bufferTime = TOKEN_REFRESH_BUFFER_SECONDS * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferTime) {
    // Token is expired or about to expire, refresh it
    try {
      const newTokens = await refreshAccessToken(tokenRecord.refresh_token);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      // Update the token in the database
      await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          expires_at: newExpiresAt.toISOString(),
          scopes: newTokens.scope.split(' '),
        })
        .eq('id', tokenRecord.id);

      return newTokens.access_token;
    } catch (refreshError) {
      console.error('Failed to refresh token:', refreshError);
      // Mark the workspace app as error
      await (supabase
        .from('workspace_apps') as ReturnType<typeof supabase.from>)
        .update({ status: 'error' })
        .eq('workspace_id', workspaceId)
        .eq('app_id', canvaApp.id);
      return null;
    }
  }

  return tokenRecord.access_token;
}

/**
 * Store tokens for a user
 */
export async function storeTokens(
  userId: string,
  appId: string,
  workspaceId: string,
  tokens: CanvaTokenResponse
): Promise<void> {
  const supabase = await createClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  // Upsert the token record
  const { error } = await (supabase
    .from('app_tokens') as ReturnType<typeof supabase.from>)
    .upsert({
      user_id: userId,
      app_id: appId,
      workspace_id: workspaceId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      scopes: tokens.scope.split(' '),
    }, {
      onConflict: 'user_id,app_id,workspace_id',
    });

  if (error) {
    console.error('Failed to store tokens:', error);
    throw new Error('Failed to store tokens');
  }
}

/**
 * Revoke tokens (for disconnect flow)
 */
export async function revokeTokens(accessToken: string): Promise<void> {
  const clientId = process.env.CANVA_CLIENT_ID;
  const clientSecret = process.env.CANVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Canva OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    token: accessToken,
  });

  try {
    await fetch('https://api.canva.com/rest/v1/oauth/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: params.toString(),
    });
  } catch (error) {
    console.error('Token revocation failed:', error);
    // Don't throw - we'll still delete locally
  }
}
