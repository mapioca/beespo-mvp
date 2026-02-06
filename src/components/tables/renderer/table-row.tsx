"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { TableCellRenderer } from "./table-cell";
import { useTablesStore } from "@/stores/tables-store";
import type { Column, Row } from "@/types/table-types";

interface TableRowComponentProps {
  row: Row;
  columns: Column[];
  isSelected: boolean;
  onSelect: () => void;
  onCellClick: (rowId: string, columnId: string) => void;
  onCellSave: (rowId: string, columnId: string, value: unknown) => void;
  onCellKeyDown: (e: React.KeyboardEvent, columnId: string) => void;
  isEditing: (rowId: string, columnId: string) => boolean;
}

export function TableRowComponent({
  row,
  columns,
  isSelected,
  onSelect,
  onCellClick,
  onCellSave,
  onCellKeyDown,
  isEditing,
}: TableRowComponentProps) {
  const { columnWidths } = useTablesStore();

  return (
    <TableRow
      className={cn(
        "group",
        isSelected && "bg-primary/5"
      )}
      data-state={isSelected ? "selected" : undefined}
    >
      {/* Selection checkbox */}
      <TableCell className="w-[40px] min-w-[40px]">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          aria-label={`Select row`}
        />
      </TableCell>

      {/* Drag handle */}
      <TableCell className="w-[24px] min-w-[24px] p-0">
        <div className="flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      </TableCell>

      {/* Data cells */}
      {columns.map((column) => {
        const width = columnWidths[column.id] || 200;
        const value = row.data[column.id];
        const editing = isEditing(row.id, column.id);

        return (
          <TableCell
            key={column.id}
            className={cn(
              "p-0",
              editing && "ring-2 ring-primary ring-inset"
            )}
            style={{
              width: `${width}px`,
              minWidth: `${width}px`,
              maxWidth: `${width}px`,
            }}
            onClick={() => !editing && onCellClick(row.id, column.id)}
          >
            <TableCellRenderer
              column={column}
              value={value}
              isEditing={editing}
              onSave={(newValue) => onCellSave(row.id, column.id, newValue)}
              onKeyDown={(e) => onCellKeyDown(e, column.id)}
            />
          </TableCell>
        );
      })}

      {/* Empty cell for add column button alignment */}
      <TableCell className="w-[40px] min-w-[40px]" />
    </TableRow>
  );
}
