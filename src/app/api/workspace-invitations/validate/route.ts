import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limiter';

// POST /api/workspace-invitations/validate - Validate a workspace invitation token
// Used during signup to check if a token is valid without accepting it
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { token } = body;

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = checkRateLimit(ip, 10, 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { valid: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
    );
  }

  // Get the invitation by token (RLS allows anyone to view by token)
  const { data: invitation, error: fetchError } = await (supabase
    .from('workspace_invitations') as ReturnType<typeof supabase.from>)
    .select('*, workspaces(name, type, organization_type)')
    .eq('token', token)
    .single();

  if (fetchError || !invitation) {
    return NextResponse.json({ valid: false, error: 'Invalid invitation token' }, { status: 200 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invitation as any;

  if (inv.status !== 'pending') {
    return NextResponse.json({
      valid: false,
      error: 'Invitation has already been used or revoked'
    }, { status: 200 });
  }

  if (new Date(inv.expires_at) < new Date()) {
    // Mark as expired
    await (supabase
      .from('workspace_invitations') as ReturnType<typeof supabase.from>)
      .update({ status: 'expired' })
      .eq('id', inv.id);
    return NextResponse.json({ valid: false, error: 'Invitation has expired' }, { status: 200 });
  }

  // Token is valid - return invitation details
  return NextResponse.json({
    valid: true,
    email: inv.email,
    workspaceName: inv.workspaces?.name || 'Workspace',
    unitType: inv.workspaces?.type,
    organizationType: inv.workspaces?.organization_type,
    role: inv.role,
  }, { status: 200 });
}
