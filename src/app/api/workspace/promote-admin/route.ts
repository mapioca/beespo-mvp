import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { memberId } = await request.json();
    if (!memberId) {
        return NextResponse.json({ error: 'memberId is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentProfile } = await (supabase.from('profiles') as any)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (currentProfile?.role !== 'admin') {
        return NextResponse.json({ error: 'Only admins can promote members' }, { status: 403 });
    }

    // Verify target is in same workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: targetProfile } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('id', memberId)
        .eq('workspace_id', currentProfile.workspace_id)
        .single();

    if (!targetProfile) {
        return NextResponse.json({ error: 'Member not found in workspace' }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from('profiles') as any)
        .update({ role: 'admin', updated_at: new Date().toISOString() })
        .eq('id', memberId)
        .eq('workspace_id', currentProfile.workspace_id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
