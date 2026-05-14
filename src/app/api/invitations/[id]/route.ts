import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendInviteEmail } from '@/lib/email/send-invite-email';
import { getAppUrlFromRequest } from '@/lib/url/app-url';
import { canManage, formatRoleLabel } from '@/lib/auth/role-permissions';
import { logSecurityEvent } from '@/lib/security/audit-log';
import { getClientIp } from '@/lib/security/request-ip';


type Params = { params: Promise<{ id: string }> };

// DELETE /api/invitations/[id] - Revoke an invitation
export async function DELETE(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!canManage(profile?.role)) {
        return NextResponse.json({ error: 'Only owners and admins can revoke invitations' }, { status: 403 });
    }

    // Revoke the invitation
    const { error } = await (supabase
        .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ status: 'revoked' })
        .eq('id', id)
        .eq('workspace_id', profile.workspace_id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    void logSecurityEvent({
        eventType: 'workspace.invitation.revoke',
        outcome: 'success',
        actorUserId: user.id,
        workspaceId: profile.workspace_id,
        ipAddress: await getClientIp(),
        userAgent: request.headers.get('user-agent'),
        details: { invitation_id: id },
    });

    return NextResponse.json({ success: true });
}

// POST /api/invitations/[id] - Resend an invitation
export async function POST(request: NextRequest, { params }: Params) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's profile
    const { data: profile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role, full_name')
        .eq('id', user.id)
        .single();

    if (!canManage(profile?.role)) {
        return NextResponse.json({ error: 'Only owners and admins can resend invitations' }, { status: 403 });
    }

    // Get the invitation
    const { data: invitation, error: fetchError } = await (supabase
        .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('*')
        .eq('id', id)
        .eq('workspace_id', profile.workspace_id)
        .eq('status', 'pending')
        .single();

    if (fetchError || !invitation) {
        return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Get workspace details
    const { data: workspace } = await (supabase
        .from('workspaces') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('name')
        .eq('id', profile.workspace_id)
        .single();

    // Resend email
    const baseUrl = getAppUrlFromRequest(request);
    const inviteLink = `${baseUrl}/accept-invite?token=${invitation.token}`;

    const emailResult = await sendInviteEmail({
        toEmail: invitation.email,
        inviterName: profile.full_name,
        workspaceName: workspace?.name || 'your workspace',
        role: formatRoleLabel(invitation.role),
        inviteLink,
    });

    // Update expires_at to extend invitation
    await (supabase
        .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    return NextResponse.json({
        success: true,
        emailSent: emailResult.success,
    });
}
