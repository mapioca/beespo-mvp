import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail } from '@/lib/email/send-invite-email';

// GET /api/invitations - List pending invitations for workspace
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Fetch invitations
    const { data: invitations, error } = await (supabase
        .from('workspace_invitations') as any)
        .select(`
      id,
      email,
      role,
      status,
      expires_at,
      created_at,
      invited_by (
        full_name
      )
    `)
        .eq('workspace_id', profile.workspace_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ invitations });
}

// POST /api/invitations - Create and send a new invitation
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile and check if admin
    const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('workspace_id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    if (profile.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can invite members' }, { status: 403 });
    }

    // Get workspace details
    const { data: workspace } = await (supabase
        .from('workspaces') as any)
        .select('name')
        .eq('id', profile.workspace_id)
        .single();

    // Parse request body
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!['admin', 'leader', 'guest'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists in workspace
    const { data: existingUser } = await (supabase
        .from('profiles') as any)
        .select('id')
        .eq('email', email)
        .eq('workspace_id', profile.workspace_id)
        .single();

    if (existingUser) {
        return NextResponse.json({ error: 'User is already a member of this workspace' }, { status: 400 });
    }

    // Check for pending invitation
    const { data: existingInvite } = await (supabase
        .from('workspace_invitations') as any)
        .select('id')
        .eq('email', email)
        .eq('workspace_id', profile.workspace_id)
        .eq('status', 'pending')
        .single();

    if (existingInvite) {
        return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 400 });
    }

    // Create invitation
    const { data: invitation, error: insertError } = await (supabase
        .from('workspace_invitations') as any)
        .insert({
            workspace_id: profile.workspace_id,
            email,
            role,
            invited_by: user.id,
        })
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Send email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/accept-invite?token=${invitation.token}`;

    const emailResult = await sendInviteEmail({
        toEmail: email,
        inviterName: profile.full_name,
        workspaceName: workspace?.name || 'your workspace',
        role: role.charAt(0).toUpperCase() + role.slice(1),
        inviteLink,
    });

    if (!emailResult.success) {
        // Still return success but note the email issue
        console.error('Email sending failed:', emailResult.error);
    }

    return NextResponse.json({
        invitation,
        emailSent: emailResult.success,
    }, { status: 201 });
}
