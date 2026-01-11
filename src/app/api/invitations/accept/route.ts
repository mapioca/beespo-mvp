import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Get the invitation by token (RLS allows anyone to view by token)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: invitation, error: fetchError } = await (supabase as any)
        .from('workspace_invitations')
        .select('*, workspaces(name)')
        .eq('token', token)
        .single();

    if (fetchError || !invitation) {
        return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
        return NextResponse.json({ error: 'Invitation has already been used or revoked' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
        // Mark as expired
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
            .from('workspace_invitations')
            .update({ status: 'expired' })
            .eq('id', invitation.id);
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        // Return invitation info so frontend can redirect to signup
        return NextResponse.json({
            needsAuth: true,
            invitation: {
                email: invitation.email,
                workspaceName: invitation.workspaces?.name,
                role: invitation.role,
            }
        }, { status: 200 });
    }

    // Check if user already has a profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingProfile } = await (supabase as any)
        .from('profiles')
        .select('id, workspace_id')
        .eq('id', user.id)
        .single();

    if (existingProfile?.workspace_id) {
        return NextResponse.json({
            error: 'You already belong to a workspace. Please leave your current workspace first.'
        }, { status: 400 });
    }

    // Create or update profile
    if (existingProfile) {
        // Update existing profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
            .from('profiles')
            .update({
                workspace_id: invitation.workspace_id,
                role: invitation.role,
            })
            .eq('id', user.id);

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
    } else {
        // Create new profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insertError } = await (supabase as any)
            .from('profiles')
            .insert({
                id: user.id,
                email: user.email!,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                workspace_id: invitation.workspace_id,
                role: invitation.role,
            });

        if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }
    }

    // Mark invitation as accepted
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
        .from('workspace_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

    return NextResponse.json({
        success: true,
        workspaceName: invitation.workspaces?.name,
    });
}
