"use client";

import { useRef, useCallback, useTransition } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTablesStore, useFilteredRows, useVisibleColumns } from "@/stores/tables-store";
import { useInlineEditing } from "@/components/tables";
import { TableRowComponent } from "./table-row";
import { TableHeaderCell } from "./table-header";
import { createRow } from "@/lib/actions/table-actions";
import { useToast } from "@/lib/hooks/use-toast";
import type { Column } from "@/types/table-types";

interface TableRendererProps {
  tableId: string;
  columns?: Column[]; // Optional, uses store if not provided
  onColumnClick?: (column: Column) => void;
  onAddColumn?: () => void;
}

export function TableRenderer({
  tableId,
  onColumnClick,
  onAddColumn,
}: TableRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const {
    selectedRowIds,
    toggleRowSelection,
    selectAllRows,
    clearSelection,
    addRow,
  } = useTablesStore();

  const rows = useFilteredRows();
  const visibleColumns = useVisibleColumns();

  const {
    startEditing,
    saveCell,
    handleKeyDown,
    isEditing,
  } = useInlineEditing(tableId);

  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const someSelected = selectedRowIds.size > 0 && selectedRowIds.size < rows.length;

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllRows();
    }
  }, [allSelected, clearSelection, selectAllRows]);

  const handleAddRow = useCallback(() => {
    startTransition(async () => {
      const result = await createRow(tableId, { data: {} });
      if (result.error) {
        toast({
          title: "Failed to add row",
          description: result.error,
          variant: "destructive",
        });
      } else if (result.data) {
        addRow(result.data);
        // Start editing first cell of new row
        if (visibleColumns.length > 0) {
          setTimeout(() => {
            startEditing(result.data!.id, visibleColumns[0].id);
          }, 100);
        }
      }
    });
  }, [tableId, addRow, visibleColumns, startEditing, toast, startTransition]);

  const rowIds = rows.map((r) => r.id);

  return (
    <div ref={containerRef} className="w-full overflow-auto border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          <TableRow className="hover:bg-transparent">
            {/* Selection checkbox */}
            <TableHead className="w-[40px] min-w-[40px]">
              <Checkbox
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                aria-label="Select all rows"
                className={cn(someSelected && "data-[state=checked]:bg-primary/50")}
              />
            </TableHead>

            {/* Drag handle placeholder */}
            <TableHead className="w-[24px] min-w-[24px] p-0" />

            {/* Column headers */}
            {visibleColumns.map((column) => (
              <TableHeaderCell
                key={column.id}
                column={column}
                onClick={() => onColumnClick?.(column)}
              />
            ))}

            {/* Add column button */}
            <TableHead className="w-[40px] min-w-[40px]">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onAddColumn}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row) => (
            <TableRowComponent
              key={row.id}
              row={row}
              columns={visibleColumns}
              isSelected={selectedRowIds.has(row.id)}
              onSelect={() => toggleRowSelection(row.id)}
              onCellClick={startEditing}
              onCellSave={saveCell}
              onCellKeyDown={(e, columnId) =>
                handleKeyDown(e, row.id, columnId, visibleColumns, rowIds)
              }
              isEditing={isEditing}
            />
          ))}

          {/* Add row button */}
          <TableRow className="hover:bg-muted/30">
            <td colSpan={visibleColumns.length + 3} className="p-0">
              <Button
                variant="ghost"
                className="w-full justify-start h-10 rounded-none text-muted-foreground hover:text-foreground"
                onClick={handleAddRow}
                disabled={isPending}
              >
                <Plus className="h-4 w-4 mr-2" />
                {isPending ? "Adding..." : "New row"}
              </Button>
            </td>
          </TableRow>
        </TableBody>
      </Table>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground mb-4">No rows yet</p>
          <Button onClick={handleAddRow} variant="outline" disabled={isPending}>
            <Plus className="h-4 w-4 mr-2" />
            {isPending ? "Adding..." : "Add first row"}
          </Button>
        </div>
      )}
    </div>
  );
}
