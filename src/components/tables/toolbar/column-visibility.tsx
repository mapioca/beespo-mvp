"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns } from "lucide-react";
import { useTablesStore } from "@/stores/tables-store";
import type { Column } from "@/types/table-types";

interface ColumnVisibilityProps {
  columns: Column[];
}

export function ColumnVisibility({ columns }: ColumnVisibilityProps) {
  const { visibleColumnIds, toggleColumnVisibility, setVisibleColumnIds } = useTablesStore();

  const hiddenCount = columns.length - visibleColumnIds.length;

  const handleShowAll = () => {
    setVisibleColumnIds(columns.map((c) => c.id));
  };

  const handleHideAll = () => {
    // Keep at least one column visible
    if (columns.length > 0) {
      setVisibleColumnIds([columns[0].id]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={hiddenCount > 0 ? "secondary" : "outline"}
          size="sm"
        >
          <Columns className="h-4 w-4 mr-1" />
          Columns
          {hiddenCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-muted text-muted-foreground rounded">
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={visibleColumnIds.includes(column.id)}
            onCheckedChange={() => toggleColumnVisibility(column.id)}
            disabled={
              visibleColumnIds.length === 1 &&
              visibleColumnIds.includes(column.id)
            }
          >
            {column.name}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between px-2 py-1.5">
          <Button variant="ghost" size="sm" onClick={handleShowAll}>
            Show all
          </Button>
          <Button variant="ghost" size="sm" onClick={handleHideAll}>
            Hide all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
