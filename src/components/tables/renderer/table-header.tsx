"use client";

import { useState, useCallback } from "react";
import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Type,
  Hash,
  ChevronDown,
  Tags,
  Calendar,
  Clock,
  CheckSquare,
  User,
  Link,
  ArrowUp,
  ArrowDown,
  EyeOff,
  Trash2,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTablesStore } from "@/stores/tables-store";
import type { Column, ColumnType } from "@/types/table-types";

interface TableHeaderCellProps {
  column: Column;
  onClick?: () => void;
}

const columnTypeIcons: Record<ColumnType, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  select: <ChevronDown className="h-3.5 w-3.5" />,
  multi_select: <Tags className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  datetime: <Clock className="h-3.5 w-3.5" />,
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  user_link: <User className="h-3.5 w-3.5" />,
  table_link: <Link className="h-3.5 w-3.5" />,
};

export function TableHeaderCell({ column, onClick }: TableHeaderCellProps) {
  const [isResizing, setIsResizing] = useState(false);

  const {
    sorts,
    addSort,
    removeSort,
    toggleColumnVisibility,
    columnWidths,
    setColumnWidth,
  } = useTablesStore();

  const currentSort = sorts.find((s) => s.columnId === column.id);
  const width = columnWidths[column.id] || 200;

  const handleSortAsc = useCallback(() => {
    addSort({ columnId: column.id, direction: "asc" });
  }, [column.id, addSort]);

  const handleSortDesc = useCallback(() => {
    addSort({ columnId: column.id, direction: "desc" });
  }, [column.id, addSort]);

  const handleRemoveSort = useCallback(() => {
    removeSort(column.id);
  }, [column.id, removeSort]);

  const handleHide = useCallback(() => {
    toggleColumnVisibility(column.id);
  }, [column.id, toggleColumnVisibility]);

  const handleResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const startX = e.clientX;
      const startWidth = width;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const diff = moveEvent.clientX - startX;
        const newWidth = Math.max(80, Math.min(600, startWidth + diff));
        setColumnWidth(column.id, newWidth);
      };

      const handleMouseUp = () => {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [column.id, width, setColumnWidth]
  );

  return (
    <TableHead
      className={cn(
        "relative group select-none",
        isResizing && "cursor-col-resize"
      )}
      style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-full justify-start px-2 font-medium hover:bg-muted/50"
          >
            <span className="text-muted-foreground mr-1.5">
              {columnTypeIcons[column.type]}
            </span>
            <span className="truncate">{column.name}</span>
            {currentSort && (
              <span className="ml-1">
                {currentSort.direction === "asc" ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleSortAsc}>
            <ArrowUp className="h-4 w-4 mr-2" />
            Sort ascending
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSortDesc}>
            <ArrowDown className="h-4 w-4 mr-2" />
            Sort descending
          </DropdownMenuItem>
          {currentSort && (
            <DropdownMenuItem onClick={handleRemoveSort}>
              Remove sort
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onClick}>
            <Settings2 className="h-4 w-4 mr-2" />
            Edit column
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleHide}>
            <EyeOff className="h-4 w-4 mr-2" />
            Hide column
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onClick}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Resize handle */}
      <div
        className={cn(
          "absolute top-0 right-0 h-full w-1 cursor-col-resize",
          "opacity-0 group-hover:opacity-100 hover:bg-primary/50",
          isResizing && "opacity-100 bg-primary"
        )}
        onMouseDown={handleResize}
      />
    </TableHead>
  );
}
