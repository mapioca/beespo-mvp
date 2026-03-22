import { createAdminClient } from '@/lib/supabase/admin';
import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

interface ZoomDeauthorizationPayload {
  account_id: string;
  user_id: string;
  signature: string;
  deauthorization_time: string;
  client_id: string;
}

interface ZoomWebhookEvent {
  event: string;
  event_ts: number;
  payload: ZoomDeauthorizationPayload | { plainToken: string };
}

function verifySignature(
  secretToken: string,
  timestamp: string,
  rawBody: string,
  signature: string
): boolean {
  const message = `v0:${timestamp}:${rawBody}`;
  const hash = createHmac('sha256', secretToken).update(message).digest('hex');
  const expected = `v0=${hash}`;
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  return createHmac('sha256', secretToken)
    .update(expected)
    .digest('hex') ===
    createHmac('sha256', secretToken)
      .update(signature)
      .digest('hex');
}

async function notifyZoomCompliance(payload: ZoomDeauthorizationPayload): Promise<void> {
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!clientId || !clientSecret) return;

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  await fetch('https://api.zoom.us/oauth/data/compliance', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${basicAuth}`,
    },
    body: JSON.stringify({
      client_id: clientId,
      user_id: payload.user_id,
      account_id: payload.account_id,
      deauthorization_event_received: payload,
      compliance_completed: true,
    }),
  });
}

// POST /api/webhooks/zoom/deauthorize
// Called by Zoom when a user uninstalls or revokes the Zoom app.
// Also handles Zoom's URL validation challenge (endpoint.url_validation).
export async function POST(request: NextRequest) {
  const secretToken = process.env.ZOOM_WEBHOOK_SECRET_TOKEN;
  if (!secretToken) {
    console.error('ZOOM_WEBHOOK_SECRET_TOKEN not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const timestamp = request.headers.get('x-zm-request-timestamp');
  const signature = request.headers.get('x-zm-signature');

  if (!timestamp || !signature) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 400 });
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const requestAge = Math.abs(Date.now() - Number(timestamp));
  if (requestAge > 5 * 60 * 1000) {
    return NextResponse.json({ error: 'Request timestamp expired' }, { status: 400 });
  }

  const rawBody = await request.text();

  if (!verifySignature(secretToken, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: ZoomWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Respond to Zoom's URL validation challenge
  if (event.event === 'endpoint.url_validation') {
    const { plainToken } = event.payload as { plainToken: string };
    const encryptedToken = createHmac('sha256', secretToken)
      .update(plainToken)
      .digest('hex');
    return NextResponse.json({ plainToken, encryptedToken });
  }

  if (event.event !== 'app_deauthorized') {
    return NextResponse.json({ received: true });
  }

  const payload = event.payload as ZoomDeauthorizationPayload;

  // Delete the token record for this Zoom user
  const supabase = createAdminClient();

  const { data: zoomApp } = await (supabase
    .from('apps') as ReturnType<typeof supabase.from>)
    .select('id')
    .eq('slug', 'zoom')
    .single();

  if (zoomApp) {
    const { error } = await (supabase
      .from('app_tokens') as ReturnType<typeof supabase.from>)
      .delete()
      .eq('app_id', zoomApp.id)
      .eq('zoom_user_id', payload.user_id);

    if (error) {
      console.error('Failed to delete Zoom tokens for deauthorized user:', error);
    }
  }

  // Notify Zoom that we've deleted the user's data (required for compliance)
  // Fire-and-forget — we must respond to Zoom quickly
  notifyZoomCompliance(payload).catch((err) =>
    console.error('Zoom compliance notification failed:', err)
  );

  return NextResponse.json({ received: true });
}
