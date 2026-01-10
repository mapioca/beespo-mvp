import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/team/transfer - Transfer workspace ownership
export async function POST(request: NextRequest) {
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
        return NextResponse.json({ error: 'Only admins can transfer ownership' }, { status: 403 });
    }

    const body = await request.json();
    const { newOwnerId } = body;

    if (!newOwnerId) {
        return NextResponse.json({ error: 'New owner ID is required' }, { status: 400 });
    }

    if (newOwnerId === user.id) {
        return NextResponse.json({ error: 'You already own this workspace' }, { status: 400 });
    }

    // Check that new owner is in the same workspace
    const { data: newOwnerProfile } = await (supabase
        .from('profiles'))
        .select('workspace_id, role')
        .eq('id', newOwnerId)
        .single();

    if (!newOwnerProfile || newOwnerProfile.workspace_id !== currentProfile.workspace_id) {
        return NextResponse.json({ error: 'User not found in workspace' }, { status: 404 });
    }

    // Transfer ownership: make new owner admin, keep current user as leader
    const { error: updateNewOwner } = await (supabase
        .from('profiles'))
        .update({ role: 'admin' })
        .eq('id', newOwnerId);

    if (updateNewOwner) {
        return NextResponse.json({ error: updateNewOwner.message }, { status: 500 });
    }

    // Demote current user to leader (optional - they can stay admin)
    // For now, both stay as admin - true "ownership" is just being admin

    return NextResponse.json({ success: true });
}
