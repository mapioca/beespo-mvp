import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/account/delete - Delete (anonymize) user account
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // Server-side pre-flight: enforce workspace rules before deletion

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from('profiles') as any)
            .select('workspace_id, role')
            .eq('id', user.id)
            .single();

        let workspaceToDelete: string | null = null;

        if (profile?.workspace_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: members } = await (supabase.from('profiles') as any)
                .select('id, role')
                .eq('workspace_id', profile.workspace_id)
                .eq('is_deleted', false);

            const totalMembers = (members ?? []).length;

            if (totalMembers <= 1) {
                // Last member — workspace gets deleted after anonymization
                workspaceToDelete = profile.workspace_id;
            } else if (profile.role === 'admin') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const otherAdmins = (members ?? []).filter((m: any) => m.id !== user.id && m.role === 'admin');
                if (otherAdmins.length === 0) {
                    return NextResponse.json({
                        error: 'You are the only admin. Please promote another member to admin before deleting your account.'
                    }, { status: 400 });
                }
            }
        }

        // Step 1: Anonymize the user's profile (clears workspace_id, PII, etc.)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: anonymizeResult, error: anonymizeError } = await (supabase as any)
            .rpc('anonymize_user_account', { target_user_id: user.id }) as {
                data: {
                    success: boolean;
                    error?: string;
                    user_id?: string;
                    old_email?: string;
                    anonymized_email?: string;
                    unassigned_tasks?: number;
                    deleted_at?: string;
                } | null;
                error: Error | null;
            };

        if (anonymizeError) {
            console.error('Anonymization error:', anonymizeError);
            return NextResponse.json({ error: 'Failed to anonymize account data' }, { status: 500 });
        }

        if (!anonymizeResult?.success) {
            return NextResponse.json({
                error: anonymizeResult?.error || 'Failed to anonymize account'
            }, { status: 500 });
        }

        // Step 2: Delete workspace if user was the last member
        if (workspaceToDelete) {
            const { error: wsDeleteError } = await adminClient
                .from('workspaces')
                .delete()
                .eq('id', workspaceToDelete);

            if (wsDeleteError) {
                console.error('Workspace deletion error:', wsDeleteError);
                // Non-fatal — profile is already anonymized and workspace_id is cleared
            }
        }

        // Step 3: Sign out all sessions
        await supabase.auth.signOut({ scope: 'global' });

        // Step 4: Delete auth user
        const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(user.id);

        if (deleteAuthError) {
            console.error('Auth deletion error:', deleteAuthError);
            // Profile is already anonymized — acceptable outcome
            return NextResponse.json({
                success: true,
                warning: 'Account anonymized but auth cleanup had issues',
                details: anonymizeResult
            }, { status: 200 });
        }

        return NextResponse.json({
            success: true,
            message: 'Your account has been permanently deleted',
            details: {
                unassigned_tasks: anonymizeResult.unassigned_tasks,
                deleted_at: anonymizeResult.deleted_at
            }
        }, { status: 200 });

    } catch (error) {
        console.error('Account deletion error:', error);
        return NextResponse.json({ error: 'An unexpected error occurred during account deletion' }, { status: 500 });
    }
}
