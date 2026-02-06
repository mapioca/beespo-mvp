import Link from "next/link";
import { Plus, Table2, MoreHorizontal, Trash2, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { DynamicTable } from "@/types/table-types";
import { format } from "date-fns";

export default async function TablesPage() {
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
        redirect("/setup");
    }

    // Get tables with row counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tables } = await (supabase.from("dynamic_tables") as any)
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    const tablesList = (tables || []) as DynamicTable[];

    // Get row counts for each table
    const tablesWithCounts = await Promise.all(
        tablesList.map(async (table) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { count } = await (supabase.from("dynamic_rows") as any)
                .select("*", { count: "exact", head: true })
                .eq("table_id", table.id);
            return { ...table, row_count: count || 0 };
        })
    );

    return (
        <div className="h-full overflow-auto">
            <div className="p-6 max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold">Tables</h1>
                        <p className="text-muted-foreground">
                            Create and manage custom databases
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/tables/new">
                            <Plus className="h-4 w-4 mr-2" />
                            New Table
                        </Link>
                    </Button>
                </div>

                {/* Tables List */}
                {tablesWithCounts.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <Table2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle className="mb-2">No tables yet</CardTitle>
                            <CardDescription className="text-center mb-6">
                                Create your first table to start organizing your data
                            </CardDescription>
                            <Button asChild>
                                <Link href="/tables/new">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Table
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>All Tables</CardTitle>
                            <CardDescription>
                                {tablesWithCounts.length} table{tablesWithCounts.length !== 1 ? "s" : ""}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right">Rows</TableHead>
                                        <TableHead>Created</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tablesWithCounts.map((table) => (
                                        <TableRow key={table.id}>
                                            <TableCell>
                                                <Link
                                                    href={`/tables/${table.id}`}
                                                    className="flex items-center gap-2 font-medium hover:underline"
                                                >
                                                    {table.icon && (
                                                        <span className="text-lg">{table.icon}</span>
                                                    )}
                                                    {!table.icon && (
                                                        <Table2 className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                    {table.name}
                                                </Link>
                                                {table.description && (
                                                    <p className="text-sm text-muted-foreground truncate max-w-[300px] mt-0.5">
                                                        {table.description}
                                                    </p>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {table.row_count.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {format(new Date(table.created_at), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                            <span className="sr-only">Actions</span>
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/tables/${table.id}`}>
                                                                <Table2 className="h-4 w-4 mr-2" />
                                                                Open
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild>
                                                            <Link href={`/tables/${table.id}/settings`}>
                                                                <Settings2 className="h-4 w-4 mr-2" />
                                                                Settings
                                                            </Link>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive">
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
