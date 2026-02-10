import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

  // Get the invitation by token (RLS allows anyone to view by token)
  const { data: invitation, error: fetchError } = await (supabase
    .from('workspace_invitations') as ReturnType<typeof supabase.from>)
    .select('*, workspaces(name)')
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
    role: inv.role,
  }, { status: 200 });
}
