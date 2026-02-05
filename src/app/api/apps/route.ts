import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/apps - List all available apps in the marketplace
export async function GET(request: NextRequest) {
    const supabase = await createClient();

    // Get query params for filtering
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Build query
    let query = (supabase
        .from('apps') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

    // Filter by category if provided
    if (category) {
        query = query.eq('category', category);
    }

    const { data: apps, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ apps });
}
