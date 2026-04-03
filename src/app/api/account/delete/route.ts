import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/account/delete - Permanently delete the auth user and anonymize workspace data
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (body.confirmation !== 'DELETE') {
        return NextResponse.json({
            error: 'Invalid confirmation. Please type DELETE to confirm.'
        }, { status: 400 });
    }

    const adminClient = createAdminClient();

    try {
        // Use the admin client so cleanup is not dependent on the current user's RLS state.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile, error: profileError } = await (adminClient.from('profiles') as any)
            .select('id, workspace_id, role, email, is_deleted')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
        }

        if (profile.is_deleted) {
            return NextResponse.json({ error: 'This account has already been deleted.' }, { status: 400 });
        }

        let workspaceToDelete: string | null = null;

        if (profile.workspace_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: members, error: membersError } = await (adminClient.from('profiles') as any)
                .select('id, role')
                .eq('workspace_id', profile.workspace_id)
                .eq('is_deleted', false);

            if (membersError) {
                console.error('Failed to load workspace members during delete:', membersError);
                return NextResponse.json({ error: 'Failed to validate workspace membership' }, { status: 500 });
            }

            const totalMembers = (members ?? []).length;

            if (totalMembers <= 1) {
                workspaceToDelete = profile.workspace_id;
            } else if (profile.role === 'admin') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const otherAdmins = (members ?? []).filter((member: any) => member.id !== user.id && member.role === 'admin');
                if (otherAdmins.length === 0) {
                    return NextResponse.json({
                        error: 'You are the only admin. Please promote another member to admin before deleting your account.'
                    }, { status: 400 });
                }
            }
        }

        const anonymizedEmail = `deleted_${user.id}_${Date.now()}@deleted.beespo.com`;
        const deletedAt = new Date().toISOString();

        // Step 1: Anonymize the profile and detach it from the workspace.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: anonymizeError } = await (adminClient.from('profiles') as any)
            .update({
                full_name: 'Former User',
                email: anonymizedEmail,
                role_title: null,
                role: 'guest',
                feature_interests: null,
                feature_tier: null,
                workspace_id: null,
                is_deleted: true,
                deleted_at: deletedAt,
                updated_at: deletedAt,
            })
            .eq('id', user.id);

        if (anonymizeError) {
            console.error('Profile anonymization error:', anonymizeError);
            return NextResponse.json({ error: 'Failed to anonymize account data' }, { status: 500 });
        }

        // Step 2: Unassign any incomplete tasks still assigned to the user.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: updatedTasks, error: tasksError } = await (adminClient.from('tasks') as any)
            .update({ assigned_to: null, updated_at: deletedAt })
            .eq('assigned_to', user.id)
            .neq('status', 'completed')
            .select('id');

        if (tasksError) {
            console.error('Task unassignment error:', tasksError);
            return NextResponse.json({ error: 'Failed to unassign active tasks' }, { status: 500 });
        }

        // Step 3: Remove any lingering invitation ownership and revoke pending invites to the old email.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: sentInvitesError } = await (adminClient.from('workspace_invitations') as any)
            .update({ invited_by: null })
            .eq('invited_by', user.id);

        if (sentInvitesError) {
            console.error('Invitation cleanup error:', sentInvitesError);
            return NextResponse.json({ error: 'Failed to clean up invitations' }, { status: 500 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: receivedInvitesError } = await (adminClient.from('workspace_invitations') as any)
            .update({ status: 'revoked' })
            .eq('email', profile.email)
            .eq('status', 'pending');

        if (receivedInvitesError) {
            console.error('Invitation revoke error:', receivedInvitesError);
            return NextResponse.json({ error: 'Failed to revoke pending invitations' }, { status: 500 });
        }

        // Step 4: Delete the workspace if this was the last active member.
        if (workspaceToDelete) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: workspaceDeleteError } = await (adminClient.from('workspaces') as any)
                .delete()
                .eq('id', workspaceToDelete);

            if (workspaceDeleteError) {
                console.error('Workspace deletion error:', workspaceDeleteError);
                return NextResponse.json({ error: 'Failed to delete workspace' }, { status: 500 });
            }
        }

        // Step 5: Delete the auth user. This must succeed or the account can still sign in.
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deleteAuthError) {
            console.error('Auth deletion error:', deleteAuthError);
            return NextResponse.json({
                error: 'Failed to fully delete the account authentication record'
            }, { status: 500 });
        }

        // Step 6: Best-effort server-side sign-out; client also clears its local session on success.
        await supabase.auth.signOut({ scope: 'global' });

        return NextResponse.json({
            success: true,
            message: 'Your account has been permanently deleted',
            details: {
                unassigned_tasks: updatedTasks?.length ?? 0,
                deleted_at: deletedAt,
                workspace_deleted: Boolean(workspaceToDelete),
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred during account deletion' }, { status: 500 });
    }
}
