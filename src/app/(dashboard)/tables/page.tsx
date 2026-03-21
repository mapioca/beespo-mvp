import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getProfile } from "@/lib/supabase/cached-queries"
import { TablesClient } from "./tables-client"
import type { DynamicTable } from "@/types/table-types"

export const dynamic = "force-dynamic"

export default async function TablesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect("/login")
    }

    const profile = await getProfile(user.id)

    if (!profile?.workspace_id) {
        redirect("/onboarding")
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tables } = await (supabase.from("dynamic_tables") as any)
        .select("*")
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
