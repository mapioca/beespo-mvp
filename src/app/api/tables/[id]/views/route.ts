import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/tables/[id]/views - Get all views for a table
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

    const { data: views, error } = await (supabase
        .from('dynamic_views') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('table_id', id)
        .order('created_at', { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ views });
}

// POST /api/tables/[id]/views - Create a new view
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
    const {
        name,
        filters,
        sorts,
        visible_columns,
        column_widths,
        is_default,
    } = body;

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const { data: view, error } = await (supabase
        .from('dynamic_views') as ReturnType<typeof supabase.from>)
        .insert({
            table_id: id,
            name,
            filters: filters || [],
            sorts: sorts || [],
            visible_columns: visible_columns || [],
            column_widths: column_widths || {},
            is_default: is_default || false,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ view }, { status: 201 });
}
