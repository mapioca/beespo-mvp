import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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
        .from('profiles'))
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (currentProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can change member roles' }, { status: 403 });
    }

    // Get target member's profile
    const { data: targetProfile } = await (supabase
        .from('profiles'))
        .select('workspace_id, role')
        .eq('id', memberId)
        .single();

    if (!targetProfile || targetProfile.workspace_id !== currentProfile.workspace_id) {
        return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    const body = await request.json();
    const { role } = body;

    if (!['admin', 'leader', 'guest'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent demoting the last admin
    if (targetProfile.role === 'admin' && role !== 'admin') {
        const { count } = await (supabase
            .from('profiles'))
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', currentProfile.workspace_id)
            .eq('role', 'admin');

        if (count <= 1) {
            return NextResponse.json({
                error: 'Cannot change role - workspace must have at least one admin'
            }, { status: 400 });
        }
    }

    // Update role
    const { error: updateError } = await (supabase
        .from('profiles'))
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
        .from('profiles'))
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (currentProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Cannot remove yourself
    if (memberId === user.id) {
        return NextResponse.json({ error: 'Cannot remove yourself from the workspace' }, { status: 400 });
    }

    // Get target member's profile
    const { data: targetProfile } = await (supabase
        .from('profiles'))
        .select('workspace_id, role')
        .eq('id', memberId)
        .single();

    if (!targetProfile || targetProfile.workspace_id !== currentProfile.workspace_id) {
        return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // Prevent removing the last admin
    if (targetProfile.role === 'admin') {
        const { count } = await (supabase
            .from('profiles'))
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', currentProfile.workspace_id)
            .eq('role', 'admin');

        if (count <= 1) {
            return NextResponse.json({
                error: 'Cannot remove - workspace must have at least one admin'
            }, { status: 400 });
        }
    }

    // Remove from workspace (set workspace_id to null, preserving data)
    const { error: updateError } = await (supabase
        .from('profiles'))
        .update({ workspace_id: null })
        .eq('id', memberId);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
