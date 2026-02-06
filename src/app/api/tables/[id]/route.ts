import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/tables/[id] - Get table with columns and views
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

    // Get table
    const { data: table, error: tableError } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('id', id)
        .single();

    if (tableError || !table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Get active columns
    const { data: columns } = await (supabase
        .from('dynamic_columns') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('table_id', id)
        .is('deleted_at', null)
        .order('position', { ascending: true });

    // Get views
    const { data: views } = await (supabase
        .from('dynamic_views') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('table_id', id)
        .order('created_at', { ascending: true });

    // Get row count
    const { count } = await (supabase
        .from('dynamic_rows') as ReturnType<typeof supabase.from>)
        .select('*', { count: 'exact', head: true })
        .eq('table_id', id);

    return NextResponse.json({
        table: {
            ...table,
            columns: columns || [],
            views: views || [],
            row_count: count || 0,
        },
    });
}

// PUT /api/tables/[id] - Update table metadata
export async function PUT(
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
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;

    const { data: table, error } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ table });
}

// DELETE /api/tables/[id] - Delete table
export async function DELETE(
    request: NextRequest,
    { params }: Params
) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .delete()
        .eq('id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
