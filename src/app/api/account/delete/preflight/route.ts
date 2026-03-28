import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from('profiles') as any)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ canDelete: true, scenario: 'clear' });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members } = await (supabase.from('profiles') as any)
        .select('id, full_name, email, role')
        .eq('workspace_id', profile.workspace_id)
        .eq('is_deleted', false);

    const totalMembers = (members ?? []).length;

    if (totalMembers <= 1) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: workspace } = await (supabase.from('workspaces') as any)
            .select('name')
            .eq('id', profile.workspace_id)
            .single();

        return NextResponse.json({
            canDelete: true,
            scenario: 'last_member',
            workspaceName: (workspace as { name: string } | null)?.name,
            memberCount: totalMembers,
        });
    }

    if (profile.role === 'admin') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const otherAdmins = (members ?? []).filter((m: any) => m.id !== user.id && m.role === 'admin');

        if (otherAdmins.length === 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const promotableMembers = (members ?? []).filter((m: any) => m.id !== user.id);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: workspace } = await (supabase.from('workspaces') as any)
                .select('name')
                .eq('id', profile.workspace_id)
                .single();

            return NextResponse.json({
                canDelete: false,
                scenario: 'last_admin',
                workspaceName: (workspace as { name: string } | null)?.name,
                memberCount: totalMembers,
                promotableMembers,
            });
        }
    }

    return NextResponse.json({ canDelete: true, scenario: 'clear' });
}
