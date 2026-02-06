"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
    DynamicTable,
    DynamicTableWithRelations,
    Column,
    Row,
    TableView,
    CreateTableRequest,
    UpdateTableRequest,
    CreateColumnRequest,
    UpdateColumnRequest,
    CreateRowRequest,
    UpdateRowRequest,
    CreateViewRequest,
    UpdateViewRequest,
    RowData,
    TypeChangeValidation,
    ColumnType,
} from "@/types/table-types";

// =====================================================
// Table Operations
// =====================================================

/**
 * Create a new dynamic table
 */
export async function createTable(data: CreateTableRequest) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        return { error: "No workspace found" };
    }

    // Create the table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table, error } = await (supabase.from("dynamic_tables") as any)
        .insert({
            workspace_id: profile.workspace_id,
            name: data.name,
            description: data.description || null,
            icon: data.icon || null,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating table:", error);
        return { error: "Failed to create table" };
    }

    // Create initial columns if provided
    if (data.columns && data.columns.length > 0) {
        const columnsToInsert = data.columns.map((col, index) => ({
            table_id: table.id,
            name: col.name,
            type: col.type,
            config: col.config || {},
            position: index + 1,
            is_required: col.is_required || false,
            default_value: col.default_value ?? null,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: colError } = await (supabase.from("dynamic_columns") as any)
            .insert(columnsToInsert);

        if (colError) {
            console.error("Error creating columns:", colError);
        }
    }

    // Create default view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("dynamic_views") as any).insert({
        table_id: table.id,
        name: "All",
        is_default: true,
        created_by: user.id,
    });

    revalidatePath("/tables");
    return { data: table as DynamicTable };
}

/**
 * Update an existing table
 */
export async function updateTable(
    tableId: string,
    data: UpdateTableRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
        updateData.name = data.name;
    }
    if (data.description !== undefined) {
        updateData.description = data.description;
    }
    if (data.icon !== undefined) {
        updateData.icon = data.icon;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table, error } = await (supabase.from("dynamic_tables") as any)
        .update(updateData)
        .eq("id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating table:", error);
        return { error: "Failed to update table" };
    }

    revalidatePath("/tables");
    revalidatePath(`/tables/${tableId}`);
    return { data: table as DynamicTable };
}

/**
 * Delete a table
 */
export async function deleteTable(tableId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_tables") as any)
        .delete()
        .eq("id", tableId);

    if (error) {
        console.error("Error deleting table:", error);
        return { error: "Failed to delete table" };
    }

    revalidatePath("/tables");
    return { success: true };
}

/**
 * Get a table by ID with columns and default view
 */
export async function getTable(tableId: string) {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table, error } = await (supabase.from("dynamic_tables") as any)
        .select("*")
        .eq("id", tableId)
        .single();

    if (error) {
        console.error("Error fetching table:", error);
        return { error: "Table not found" };
    }

    // Get active columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: columns } = await (supabase.from("dynamic_columns") as any)
        .select("*")
        .eq("table_id", tableId)
        .is("deleted_at", null)
        .order("position", { ascending: true });

    // Get views
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: views } = await (supabase.from("dynamic_views") as any)
        .select("*")
        .eq("table_id", tableId)
        .order("created_at", { ascending: true });

    // Get row count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase.from("dynamic_rows") as any)
        .select("*", { count: "exact", head: true })
        .eq("table_id", tableId);

    return {
        data: {
            ...table,
            columns: columns || [],
            views: views || [],
            row_count: count || 0,
        } as DynamicTableWithRelations,
    };
}

/**
 * Get all tables in workspace
 */
export async function getWorkspaceTables() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized", data: [] };
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        return { error: "No workspace found", data: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tables, error } = await (supabase.from("dynamic_tables") as any)
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching tables:", error);
        return { error: "Failed to fetch tables", data: [] };
    }

    return { data: tables as DynamicTable[] };
}

// =====================================================
// Column Operations
// =====================================================

/**
 * Create a new column
 */
export async function createColumn(
    tableId: string,
    data: CreateColumnRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: column, error } = await (supabase.from("dynamic_columns") as any)
        .insert({
            table_id: tableId,
            name: data.name,
            type: data.type,
            config: data.config || {},
            is_required: data.is_required || false,
            default_value: data.default_value ?? null,
            position: data.position || 0, // Trigger will auto-set if 0
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating column:", error);
        return { error: "Failed to create column" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: column as Column };
}

/**
 * Update a column
 */
export async function updateColumn(
    tableId: string,
    columnId: string,
    data: UpdateColumnRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
        updateData.name = data.name;
    }
    if (data.type !== undefined) {
        updateData.type = data.type;
    }
    if (data.config !== undefined) {
        updateData.config = data.config;
    }
    if (data.is_required !== undefined) {
        updateData.is_required = data.is_required;
    }
    if (data.default_value !== undefined) {
        updateData.default_value = data.default_value;
    }
    if (data.position !== undefined) {
        updateData.position = data.position;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: column, error } = await (supabase.from("dynamic_columns") as any)
        .update(updateData)
        .eq("id", columnId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating column:", error);
        return { error: "Failed to update column" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: column as Column };
}

/**
 * Soft delete a column
 */
export async function deleteColumn(tableId: string, columnId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_columns") as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", columnId)
        .eq("table_id", tableId);

    if (error) {
        console.error("Error deleting column:", error);
        return { error: "Failed to delete column" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Restore a soft-deleted column
 */
export async function restoreColumn(tableId: string, columnId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: column, error } = await (supabase.from("dynamic_columns") as any)
        .update({ deleted_at: null })
        .eq("id", columnId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error restoring column:", error);
        return { error: "Failed to restore column" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: column as Column };
}

/**
 * Get deleted columns for recovery
 */
export async function getDeletedColumns(tableId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized", data: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: columns, error } = await (supabase.from("dynamic_columns") as any)
        .select("*")
        .eq("table_id", tableId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

    if (error) {
        console.error("Error fetching deleted columns:", error);
        return { error: "Failed to fetch deleted columns", data: [] };
    }

    return { data: columns as Column[] };
}

/**
 * Reorder columns
 */
export async function reorderColumns(
    tableId: string,
    columnPositions: { id: string; position: number }[]
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Update positions one by one
    for (const { id, position } of columnPositions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("dynamic_columns") as any)
            .update({ position })
            .eq("id", id)
            .eq("table_id", tableId);
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Validate type change for a column
 */
export async function validateTypeChange(
    tableId: string,
    columnId: string,
    newType: ColumnType
): Promise<{ data?: TypeChangeValidation; error?: string }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get current column
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: column } = await (supabase.from("dynamic_columns") as any)
        .select("*")
        .eq("id", columnId)
        .single();

    if (!column) {
        return { error: "Column not found" };
    }

    // Get all rows with data in this column
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from("dynamic_rows") as any)
        .select("id, data")
        .eq("table_id", tableId);

    const invalidRowIds: string[] = [];
    const warnings: string[] = [];

    // Check each row's value
    for (const row of rows || []) {
        const value = row.data?.[columnId];
        if (value !== null && value !== undefined) {
            if (!canConvertValue(value, column.type, newType)) {
                invalidRowIds.push(row.id);
            }
        }
    }

    if (invalidRowIds.length > 0) {
        warnings.push(
            `${invalidRowIds.length} row(s) have values that cannot be converted to ${newType}`
        );
    }

    return {
        data: {
            canChange: invalidRowIds.length === 0,
            invalidRowIds,
            warnings,
            suggestions: invalidRowIds.length > 0
                ? "Clear or update the invalid values before changing the column type"
                : undefined,
        },
    };
}

// Helper function for type conversion validation
function canConvertValue(
    value: unknown,
    fromType: ColumnType,
    toType: ColumnType
): boolean {
    if (value === null || value === undefined || value === "") return true;

    // Same type is always valid
    if (fromType === toType) return true;

    // Text can convert to most types
    if (fromType === "text") {
        switch (toType) {
            case "number":
                return !isNaN(Number(value));
            case "date":
            case "datetime":
                return !isNaN(Date.parse(String(value)));
            case "checkbox":
                return ["true", "false", "1", "0", "yes", "no"].includes(
                    String(value).toLowerCase()
                );
            default:
                return true;
        }
    }

    // Number conversions
    if (fromType === "number") {
        switch (toType) {
            case "text":
                return true;
            case "checkbox":
                return value === 0 || value === 1;
            default:
                return false;
        }
    }

    // Checkbox to text/number
    if (fromType === "checkbox") {
        return toType === "text" || toType === "number";
    }

    // Date conversions
    if (fromType === "date" || fromType === "datetime") {
        return toType === "text" || toType === "date" || toType === "datetime";
    }

    // Select to text
    if (fromType === "select") {
        return toType === "text" || toType === "multi_select";
    }

    // Multi-select to text
    if (fromType === "multi_select") {
        return toType === "text";
    }

    return false;
}

// =====================================================
// Row Operations
// =====================================================

/**
 * Create a new row
 */
export async function createRow(
    tableId: string,
    data: CreateRowRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get workspace_id from table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table } = await (supabase.from("dynamic_tables") as any)
        .select("workspace_id")
        .eq("id", tableId)
        .single();

    if (!table) {
        return { error: "Table not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase.from("dynamic_rows") as any)
        .insert({
            table_id: tableId,
            workspace_id: table.workspace_id,
            data: data.data,
            position: data.position || 0, // Trigger will auto-set if 0
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating row:", error);
        return { error: "Failed to create row" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: row as Row };
}

/**
 * Update a row
 */
export async function updateRow(
    tableId: string,
    rowId: string,
    data: UpdateRowRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.data !== undefined) {
        updateData.data = data.data;
    }
    if (data.position !== undefined) {
        updateData.position = data.position;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase.from("dynamic_rows") as any)
        .update(updateData)
        .eq("id", rowId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating row:", error);
        return { error: "Failed to update row" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: row as Row };
}

/**
 * Update a single cell (optimistic update friendly)
 */
export async function updateCell(
    tableId: string,
    rowId: string,
    columnId: string,
    value: unknown
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get current row data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentRow } = await (supabase.from("dynamic_rows") as any)
        .select("data")
        .eq("id", rowId)
        .single();

    if (!currentRow) {
        return { error: "Row not found" };
    }

    // Merge the new value
    const newData = {
        ...currentRow.data,
        [columnId]: value,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase.from("dynamic_rows") as any)
        .update({ data: newData })
        .eq("id", rowId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating cell:", error);
        return { error: "Failed to update cell" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: row as Row };
}

/**
 * Delete a row
 */
export async function deleteRow(tableId: string, rowId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_rows") as any)
        .delete()
        .eq("id", rowId)
        .eq("table_id", tableId);

    if (error) {
        console.error("Error deleting row:", error);
        return { error: "Failed to delete row" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Bulk create rows
 */
export async function bulkCreateRows(
    tableId: string,
    rows: CreateRowRequest[]
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get workspace_id from table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table } = await (supabase.from("dynamic_tables") as any)
        .select("workspace_id")
        .eq("id", tableId)
        .single();

    if (!table) {
        return { error: "Table not found" };
    }

    const rowsToInsert = rows.map((row) => ({
        table_id: tableId,
        workspace_id: table.workspace_id,
        data: row.data,
        position: row.position || 0,
        created_by: user.id,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdRows, error } = await (supabase.from("dynamic_rows") as any)
        .insert(rowsToInsert)
        .select();

    if (error) {
        console.error("Error bulk creating rows:", error);
        return { error: "Failed to create rows" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: createdRows as Row[] };
}

/**
 * Bulk delete rows
 */
export async function bulkDeleteRows(tableId: string, rowIds: string[]) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_rows") as any)
        .delete()
        .in("id", rowIds)
        .eq("table_id", tableId);

    if (error) {
        console.error("Error bulk deleting rows:", error);
        return { error: "Failed to delete rows" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Get rows with optional filtering and sorting
 */
export async function getTableRows(
    tableId: string,
    options?: {
        page?: number;
        limit?: number;
        search?: string;
    }
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized", data: [] };
    }

    const page = options?.page || 1;
    const limit = options?.limit || 100;
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query = (supabase.from("dynamic_rows") as any)
        .select("*", { count: "exact" })
        .eq("table_id", tableId)
        .order("position", { ascending: true })
        .range(offset, offset + limit - 1);

    const { data: rows, error, count } = await query;

    if (error) {
        console.error("Error fetching rows:", error);
        return { error: "Failed to fetch rows", data: [] };
    }

    return {
        data: rows as Row[],
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

/**
 * Reorder rows
 */
export async function reorderRows(
    tableId: string,
    rowPositions: { id: string; position: number }[]
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    for (const { id, position } of rowPositions) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("dynamic_rows") as any)
            .update({ position })
            .eq("id", id)
            .eq("table_id", tableId);
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

// =====================================================
// View Operations
// =====================================================

/**
 * Create a new view
 */
export async function createView(
    tableId: string,
    data: CreateViewRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: view, error } = await (supabase.from("dynamic_views") as any)
        .insert({
            table_id: tableId,
            name: data.name,
            filters: data.filters || [],
            sorts: data.sorts || [],
            visible_columns: data.visible_columns || [],
            column_widths: data.column_widths || {},
            is_default: data.is_default || false,
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating view:", error);
        return { error: "Failed to create view" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: view as TableView };
}

/**
 * Update a view
 */
export async function updateView(
    tableId: string,
    viewId: string,
    data: UpdateViewRequest
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.name !== undefined) {
        updateData.name = data.name;
    }
    if (data.filters !== undefined) {
        updateData.filters = data.filters;
    }
    if (data.sorts !== undefined) {
        updateData.sorts = data.sorts;
    }
    if (data.visible_columns !== undefined) {
        updateData.visible_columns = data.visible_columns;
    }
    if (data.column_widths !== undefined) {
        updateData.column_widths = data.column_widths;
    }
    if (data.is_default !== undefined) {
        updateData.is_default = data.is_default;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: view, error } = await (supabase.from("dynamic_views") as any)
        .update(updateData)
        .eq("id", viewId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error updating view:", error);
        return { error: "Failed to update view" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: view as TableView };
}

/**
 * Delete a view
 */
export async function deleteView(tableId: string, viewId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Check if this is the default view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: view } = await (supabase.from("dynamic_views") as any)
        .select("is_default")
        .eq("id", viewId)
        .single();

    if (view?.is_default) {
        return { error: "Cannot delete the default view" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_views") as any)
        .delete()
        .eq("id", viewId)
        .eq("table_id", tableId);

    if (error) {
        console.error("Error deleting view:", error);
        return { error: "Failed to delete view" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Set a view as default
 */
export async function setDefaultView(tableId: string, viewId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // The trigger will handle unsetting other defaults
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: view, error } = await (supabase.from("dynamic_views") as any)
        .update({ is_default: true })
        .eq("id", viewId)
        .eq("table_id", tableId)
        .select()
        .single();

    if (error) {
        console.error("Error setting default view:", error);
        return { error: "Failed to set default view" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: view as TableView };
}

// =====================================================
// Form Integration
// =====================================================

/**
 * Link a form to a table
 */
export async function linkForm(
    tableId: string,
    formId: string,
    autoCreateColumns: boolean = false
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get form schema if auto-creating columns
    if (autoCreateColumns) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: form } = await (supabase.from("forms") as any)
            .select("schema")
            .eq("id", formId)
            .single();

        if (form?.schema?.fields) {
            const columns = form.schema.fields.map(
                (field: { id: string; label: string; type: string; required: boolean }, index: number) => ({
                    table_id: tableId,
                    name: field.label,
                    type: mapFormTypeToColumnType(field.type),
                    position: index + 1,
                    is_required: field.required || false,
                })
            );

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("dynamic_columns") as any).insert(columns);
        }
    }

    // Link the form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_tables") as any)
        .update({ linked_form_id: formId })
        .eq("id", tableId);

    if (error) {
        console.error("Error linking form:", error);
        return { error: "Failed to link form" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Unlink a form from a table
 */
export async function unlinkForm(tableId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("dynamic_tables") as any)
        .update({ linked_form_id: null })
        .eq("id", tableId);

    if (error) {
        console.error("Error unlinking form:", error);
        return { error: "Failed to unlink form" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { success: true };
}

/**
 * Create a row from a form submission
 */
export async function createRowFromFormSubmission(
    tableId: string,
    formSubmissionId: string,
    data: RowData
) {
    const supabase = await createClient();

    // Get workspace_id from table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table } = await (supabase.from("dynamic_tables") as any)
        .select("workspace_id")
        .eq("id", tableId)
        .single();

    if (!table) {
        return { error: "Table not found" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row, error } = await (supabase.from("dynamic_rows") as any)
        .insert({
            table_id: tableId,
            workspace_id: table.workspace_id,
            data,
            form_submission_id: formSubmissionId,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating row from form:", error);
        return { error: "Failed to create row" };
    }

    revalidatePath(`/tables/${tableId}`);
    return { data: row as Row };
}

// Helper to map form field types to column types
function mapFormTypeToColumnType(formType: string): ColumnType {
    const mapping: Record<string, ColumnType> = {
        text: "text",
        textarea: "text",
        select: "select",
        radio: "select",
        checkbox: "multi_select",
    };
    return mapping[formType] || "text";
}
