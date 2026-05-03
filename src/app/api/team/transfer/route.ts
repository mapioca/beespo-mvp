import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/team/transfer - Transfer workspace ownership.
// Owner-only. Atomic owner swap is performed by the SECURITY DEFINER RPC
// `transfer_workspace_ownership` to satisfy the partial unique index that
// enforces one owner per workspace.
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { newOwnerId } = body;

    if (!newOwnerId) {
        return NextResponse.json({ error: 'New owner ID is required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('transfer_workspace_ownership', {
        p_new_owner: newOwnerId,
    });

    if (error) {
        const message = error.message || 'Failed to transfer ownership';
        const status = /Only the workspace owner/.test(message) ? 403
            : /already own/.test(message) ? 400
            : /not a member/.test(message) ? 404
            : 500;
        return NextResponse.json({ error: message }, { status });
    }

    return NextResponse.json({ success: true });
}
