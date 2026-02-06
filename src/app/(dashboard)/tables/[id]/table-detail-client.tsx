"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Settings2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableRenderer } from "@/components/tables/renderer/table-renderer";
import { TableToolbar } from "@/components/tables/toolbar/table-toolbar";
import { AddColumnDialog } from "@/components/tables/dialogs/add-column-dialog";
import { EditColumnDialog } from "@/components/tables/dialogs/edit-column-dialog";
import { DeleteColumnDialog } from "@/components/tables/dialogs/delete-column-dialog";
import { RecoverColumnDialog } from "@/components/tables/dialogs/recover-column-dialog";
import { useTablesStore } from "@/stores/tables-store";
import type { DynamicTableWithRelations, Column } from "@/types/table-types";

interface TableDetailClientProps {
    table: DynamicTableWithRelations;
}

export function TableDetailClient({ table }: TableDetailClientProps) {
    const {
        setActiveTable,
        setColumns,
        setRows,
        setViews,
        columns,
        views,
        resetActiveTable,
    } = useTablesStore();

    // Dialog states
    const [addColumnOpen, setAddColumnOpen] = useState(false);
    const [editColumnOpen, setEditColumnOpen] = useState(false);
    const [deleteColumnOpen, setDeleteColumnOpen] = useState(false);
    const [recoverColumnOpen, setRecoverColumnOpen] = useState(false);
    const [selectedColumn, setSelectedColumn] = useState<Column | null>(null);

    // Initialize store with server data
    useEffect(() => {
        setActiveTable(table);
        setColumns(table.columns || []);
        setRows(table.rows || []);
        setViews(table.views || []);

        return () => {
            resetActiveTable();
        };
    }, [table, setActiveTable, setColumns, setRows, setViews, resetActiveTable]);

    const handleColumnClick = (column: Column) => {
        setSelectedColumn(column);
        setEditColumnOpen(true);
    };

    const handleAddColumn = () => {
        setAddColumnOpen(true);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/tables">
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex items-center gap-2">
                        {table.icon && (
                            <span className="text-2xl">{table.icon}</span>
                        )}
                        <div>
                            <h1 className="text-xl font-semibold">{table.name}</h1>
                            {table.description && (
                                <p className="text-sm text-muted-foreground">
                                    {table.description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRecoverColumnOpen(true)}
                    >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Recover
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/tables/${table.id}/settings`}>
                            <Settings2 className="h-4 w-4 mr-1" />
                            Settings
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-3 border-b bg-muted/30">
                <TableToolbar
                    tableId={table.id}
                    columns={columns}
                    views={views}
                />
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                <TableRenderer
                    tableId={table.id}
                    columns={columns}
                    onColumnClick={handleColumnClick}
                    onAddColumn={handleAddColumn}
                />
            </div>

            {/* Dialogs */}
            <AddColumnDialog
                tableId={table.id}
                open={addColumnOpen}
                onOpenChange={setAddColumnOpen}
            />

            <EditColumnDialog
                tableId={table.id}
                column={selectedColumn}
                open={editColumnOpen}
                onOpenChange={(open) => {
                    setEditColumnOpen(open);
                    if (!open) setSelectedColumn(null);
                }}
            />

            <DeleteColumnDialog
                tableId={table.id}
                column={selectedColumn}
                open={deleteColumnOpen}
                onOpenChange={(open) => {
                    setDeleteColumnOpen(open);
                    if (!open) setSelectedColumn(null);
                }}
            />

            <RecoverColumnDialog
                tableId={table.id}
                open={recoverColumnOpen}
                onOpenChange={setRecoverColumnOpen}
            />
        </div>
    );
}
