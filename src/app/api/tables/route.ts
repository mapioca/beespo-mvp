import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/tables - List all tables in workspace
export async function GET() {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Get tables with row counts
    const { data: tables, error } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .select('*')
        .eq('workspace_id', profile.workspace_id)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tables });
}

// POST /api/tables - Create a new table
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's workspace
    const { data: profile } = await (supabase
        .from('profiles') as ReturnType<typeof supabase.from>)
        .select('workspace_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.workspace_id) {
        return NextResponse.json({ error: 'No workspace found' }, { status: 404 });
    }

    // Parse request body
    const body = await request.json();
    const { name, description, icon, columns } = body;

    // Validate required fields
    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Create the table
    const { data: table, error: tableError } = await (supabase
        .from('dynamic_tables') as ReturnType<typeof supabase.from>)
        .insert({
            workspace_id: profile.workspace_id,
            name,
            description: description || null,
            icon: icon || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (tableError) {
        return NextResponse.json({ error: tableError.message }, { status: 500 });
    }

    // Create initial columns if provided
    if (columns && Array.isArray(columns) && columns.length > 0) {
        const columnsToInsert = columns.map((col: {
            name: string;
            type: string;
            config?: object;
            is_required?: boolean;
            default_value?: unknown;
        }, index: number) => ({
            table_id: table.id,
            name: col.name,
            type: col.type || 'text',
            config: col.config || {},
            position: index + 1,
            is_required: col.is_required || false,
            default_value: col.default_value ?? null,
        }));

        const { error: colError } = await (supabase
            .from('dynamic_columns') as ReturnType<typeof supabase.from>)
            .insert(columnsToInsert);

        if (colError) {
            console.error('Error creating columns:', colError);
        }
    }

    // Create default view
    await (supabase
        .from('dynamic_views') as ReturnType<typeof supabase.from>)
        .insert({
            table_id: table.id,
            name: 'All',
            is_default: true,
            created_by: user.id,
        });

    return NextResponse.json({ table }, { status: 201 });
}
