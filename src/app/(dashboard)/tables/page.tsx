import { createClient } from "@/lib/supabase/server"
import { TablesClient } from "./tables-client"
import type { DynamicTable } from "@/types/table-types"
import { getDashboardRequestContext } from "@/lib/dashboard/request-context"

export default async function TablesPage() {
    const [{ profile }, supabase] = await Promise.all([
        getDashboardRequestContext(),
        createClient(),
    ])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tables } = await (supabase.from("dynamic_tables") as any)
        .select("id, workspace_id, name, description, icon, slug, linked_form_id, created_by, created_at, updated_at")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false })

    const tablesList = (tables || []) as DynamicTable[]

    // Fetch row counts in one query
    const countMap: Record<string, number> = {}
    if (tablesList.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: rowData } = await (supabase.from("dynamic_rows") as any)
            .select("table_id")
            .in("table_id", tablesList.map((t) => t.id))

        ;((rowData || []) as { table_id: string }[]).forEach((r) => {
            countMap[r.table_id] = (countMap[r.table_id] || 0) + 1
        })
    }

    const tablesWithCounts = tablesList.map((table) => ({
        ...table,
        row_count: countMap[table.id] || 0,
    }))

    return <TablesClient tables={tablesWithCounts} />
}
