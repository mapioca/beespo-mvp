import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { TableDetailClient } from "./table-detail-client";
import type { DynamicTableWithRelations, Column, Row, TableView } from "@/types/table-types";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function TableDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        redirect("/onboarding");
    }

    // Get table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: table, error: tableError } = await (supabase.from("dynamic_tables") as any)
        .select("*")
        .eq("id", id)
        .eq("workspace_id", profile.workspace_id)
        .single();

    if (tableError || !table) {
        notFound();
    }

    // Get columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: columns } = await (supabase.from("dynamic_columns") as any)
        .select("*")
        .eq("table_id", id)
        .is("deleted_at", null)
        .order("position", { ascending: true });

    // Get views
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: views } = await (supabase.from("dynamic_views") as any)
        .select("*")
        .eq("table_id", id)
        .order("created_at", { ascending: true });

    // Get rows (limited for initial load)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows } = await (supabase.from("dynamic_rows") as any)
        .select("*")
        .eq("table_id", id)
        .order("position", { ascending: true })
        .limit(100);

    const tableWithRelations: DynamicTableWithRelations = {
        ...table,
        columns: (columns || []) as Column[],
        views: (views || []) as TableView[],
        rows: (rows || []) as Row[],
    };

    return <TableDetailClient table={tableWithRelations} />;
}
