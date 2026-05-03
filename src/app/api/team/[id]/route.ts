import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { canManage, INVITABLE_ROLES } from '@/lib/auth/role-permissions';

type Params = { params: Promise<{ id: string }> };

// PATCH /api/team/[id] - Update member role
export async function PATCH(request: NextRequest, { params }: Params) {
    const { id: memberId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!canManage(currentProfile?.role)) {
        return NextResponse.json({ error: 'Only owners and admins can change member roles' }, { status: 403 });
    }

    // Get target member's profile
    const { data: targetProfile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role')
        .eq('id', memberId)
        .single();

    if (!targetProfile || targetProfile.workspace_id !== currentProfile.workspace_id) {
        return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    const body = await request.json();
    const { role } = body;

    if (!(INVITABLE_ROLES as readonly string[]).includes(role)) {
        return NextResponse.json({ error: 'Invalid role. Use the Transfer Ownership flow to assign owner.' }, { status: 400 });
    }

    // Cannot change the owner's role here — ownership transfer goes through /api/team/transfer.
    if (targetProfile.role === 'owner') {
        return NextResponse.json({
            error: 'Cannot change the workspace owner’s role. Transfer ownership first.'
        }, { status: 400 });
    }

    // Update role
    const { error: updateError } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ role })
        .eq('id', memberId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/team/[id] - Remove member from workspace
export async function DELETE(request: NextRequest, { params }: Params) {
    const { id: memberId } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's profile
    const { data: currentProfile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!canManage(currentProfile?.role)) {
        return NextResponse.json({ error: 'Only owners and admins can remove members' }, { status: 403 });
    }

    // Cannot remove yourself
    if (memberId === user.id) {
        return NextResponse.json({ error: 'Cannot remove yourself from the workspace' }, { status: 400 });
    }

    // Get target member's profile
    const { data: targetProfile } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select('workspace_id, role')
        .eq('id', memberId)
        .single();

    if (!targetProfile || targetProfile.workspace_id !== currentProfile.workspace_id) {
        return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // Cannot remove the workspace owner; ownership must be transferred first.
    if (targetProfile.role === 'owner') {
        return NextResponse.json({
            error: 'Cannot remove the workspace owner. Transfer ownership first.'
        }, { status: 400 });
    }

    // Remove from workspace (set workspace_id to null, preserving data)
    const { error: updateError } = await (supabase
        .from('profiles') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({ workspace_id: null })
        .eq('id', memberId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
