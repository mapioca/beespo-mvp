import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

type Params = { params: Promise<{ id: string }> };

// GET /api/tables/[id]/rows - Get rows with pagination
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = (page - 1) * limit;

    const { data: rows, error, count } = await (supabase
        .from('dynamic_rows') as ReturnType<typeof supabase.from>)
        .select('*', { count: 'exact' })
        .eq('table_id', id)
        .order('position', { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        rows,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    });
}

// POST /api/tables/[id]/rows - Create a new row
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

    // Get workspace_id from table
    const { data: table } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', id)
        .single();

    if (!table) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const body = await request.json();
    const { data, position } = body;

    const { data: row, error } = await (supabase
        .from('dynamic_rows') as ReturnType<typeof supabase.from>)
        .insert({
            table_id: id,
            workspace_id: table.workspace_id,
            data: data || {},
            position: position || 0,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ row }, { status: 201 });
}

// PATCH /api/tables/[id]/rows - Bulk update rows
export async function PATCH(
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
    const { updates } = body; // Array of { id, data }

    if (!updates || !Array.isArray(updates)) {
        return NextResponse.json({ error: 'Updates array is required' }, { status: 400 });
    }

    const results = [];
    for (const update of updates) {
        const { data: row, error } = await (supabase
            .from('dynamic_rows') as ReturnType<typeof supabase.from>)
            .update({ data: update.data })
            .eq('id', update.id)
            .eq('table_id', id)
            .select()
            .single();

        if (!error && row) {
            results.push(row);
        }
    }

    return NextResponse.json({ rows: results });
}

// DELETE /api/tables/[id]/rows - Bulk delete rows
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

    const body = await request.json();
    const { rowIds } = body;

    if (!rowIds || !Array.isArray(rowIds) || rowIds.length === 0) {
        return NextResponse.json({ error: 'Row IDs are required' }, { status: 400 });
    }

    const { error } = await (supabase
        .from('dynamic_rows') as ReturnType<typeof supabase.from>)
        .delete()
        .in('id', rowIds)
        .eq('table_id', id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deletedCount: rowIds.length });
}
