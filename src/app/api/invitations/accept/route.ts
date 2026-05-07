import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createNotification } from '@/lib/actions/notification-actions';
import { NextRequest, NextResponse } from 'next/server';

async function findAuthUserByEmail(email: string) {
    const adminClient = createAdminClient();
    let page = 1;
    const perPage = 200;

    while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (adminClient.auth.admin as any).listUsers({
            page,
            perPage,
        });

        if (error) {
            throw error;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const users = (data?.users ?? []) as any[];
        const matchedUser = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());

        if (matchedUser) {
            return matchedUser;
        }

        if (users.length < perPage) {
            return null;
        }

        page += 1;
    }
}

// POST /api/invitations/accept - Accept an invitation
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { token } = await request.json();

    if (!token) {
        return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Get the invitation by token (RLS allows anyone to view by token)
    const { data: invitation, error: fetchError } = await (supabase
        .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        await (supabase
            .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ status: 'expired' })
            .eq('id', invitation.id);
        return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        const adminClient = createAdminClient();

        const authUser = await findAuthUserByEmail(invitation.email);
        const { data: invitedProfile } = await (adminClient
            .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select('id, workspace_id, workspaces(name)')
            .eq('email', invitation.email.toLowerCase())
            .eq('is_deleted', false)
            .single();

        let authAction: 'signup' | 'login' | 'blocked' = 'signup';
        let message: string | undefined;

        if (invitedProfile?.workspace_id) {
            authAction = 'blocked';
            message = 'This email is already tied to another workspace. Leave that workspace before accepting this invitation.';
        } else if (authUser) {
            authAction = 'login';
        }

        return NextResponse.json({
            needsAuth: true,
            authAction,
            message,
            invitation: {
                email: invitation.email,
                workspaceName: invitation.workspaces?.name,
                role: invitation.role,
                existingWorkspaceName: invitedProfile?.workspaces?.name || null,
            }
        }, { status: 200 });
    }

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return NextResponse.json({
            error: `This invitation was sent to ${invitation.email}. Please sign in with that email address.`
        }, { status: 400 });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        const { error: updateError } = await (supabase
            .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
        const { error: insertError } = await (supabase
            .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
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
    await (supabase
        .from('workspace_invitations') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

    // Notify existing workspace members that someone joined
    const newMemberName =
        user.user_metadata?.full_name || user.email?.split('@')[0] || 'A new member';
    const workspaceName = invitation.workspaces?.name ?? 'your workspace';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingMembers } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('workspace_id', invitation.workspace_id)
        .eq('is_deleted', false)
        .neq('id', user.id);

    if (existingMembers && existingMembers.length > 0) {
        await Promise.all(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (existingMembers as any[]).map((m) =>
                createNotification({
                    recipientUserId: m.id,
                    type: 'workspace_member_joined',
                    title: `${newMemberName} joined ${workspaceName}`,
                    body: `${newMemberName} accepted their invitation as ${invitation.role}.`,
                    metadata: {
                        workspace_id: invitation.workspace_id,
                        new_member_id: user.id,
                        role: invitation.role,
                    },
                }).catch((err) => {
                    console.error('Failed to create workspace_member_joined notification:', err);
                })
            )
        );
    }

    return NextResponse.json({
        success: true,
        workspaceName: invitation.workspaces?.name,
    });
}
