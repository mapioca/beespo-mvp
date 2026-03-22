import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/auth/zoom/disconnect - Remove Zoom connection for current user
export async function POST() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: zoomApp } = await (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('id')
        .eq('slug', 'zoom')
        .single();

    if (!zoomApp) {
        return NextResponse.json({ error: 'Zoom app not found' }, { status: 404 });
    }

    await (supabase
        .from('app_tokens') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('user_id', user.id)
        .eq('app_id', zoomApp.id);

    return NextResponse.json({ success: true });
}
