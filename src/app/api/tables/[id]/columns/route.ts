import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/tables/[id]/columns - Get columns (including soft-deleted for recovery)
export async function GET(
    request: NextRequest,
    { params }: Params
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    let query = (supabase
        .from('dynamic_columns') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('table_id', id)
        .order('position', { ascending: true });

    if (!includeDeleted) {
        query = query.is('deleted_at', null);
    }

    const { data: columns, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ columns });
}

// POST /api/tables/[id]/columns - Create a new column
export async function POST(
    request: NextRequest,
    { params }: Params
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, config, is_required, default_value, position } = body;

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: column, error } = await (supabase
        .from('dynamic_columns') as ReturnType<typeof supabase.from>)
        .insert({
            table_id: id,
            name,
            type: type || 'text',
            config: config || {},
            is_required: is_required || false,
            default_value: default_value ?? null,
            position: position || 0, // Trigger will auto-set if 0
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ column }, { status: 201 });
}
