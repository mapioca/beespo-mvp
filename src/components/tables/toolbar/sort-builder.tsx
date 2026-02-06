"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { useTablesStore } from "@/stores/tables-store";
import type { Column, Sort } from "@/types/table-types";

interface SortBuilderProps {
  columns: Column[];
  onClose: () => void;
}

export function SortBuilder({ columns, onClose }: SortBuilderProps) {
  const { sorts, addSort, removeSort, clearSorts } = useTablesStore();

  const availableColumns = columns.filter(
    (col) => !sorts.some((s) => s.columnId === col.id)
  );

  const handleAddSort = () => {
    if (availableColumns.length === 0) return;

    addSort({
      columnId: availableColumns[0].id,
      direction: "asc",
    });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Sort</h4>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {sorts.map((sort, index) => (
          <SortRow
            key={sort.columnId}
            sort={sort}
            availableColumns={[
              columns.find((c) => c.id === sort.columnId)!,
              ...availableColumns,
            ]}
            showPrefix={index > 0}
            onUpdate={(updates) =>
              addSort({ ...sort, ...updates })
            }
            onRemove={() => removeSort(sort.columnId)}
          />
        ))}

        {sorts.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No sorting applied. Add a sort to order your data.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddSort}
          disabled={availableColumns.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add sort
        </Button>
        {sorts.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearSorts}>
            Clear all
          </Button>
        )}
      </div>
    </Card>
  );
}

interface SortRowProps {
  sort: Sort;
  availableColumns: Column[];
  showPrefix: boolean;
  onUpdate: (updates: Partial<Sort>) => void;
  onRemove: () => void;
}

function SortRow({
  sort,
  availableColumns,
  showPrefix,
  onUpdate,
  onRemove,
}: SortRowProps) {
  return (
    <div className="flex items-center gap-2">
      {showPrefix && (
        <span className="text-sm text-muted-foreground w-10">then</span>
      )}
      {!showPrefix && <div className="w-10" />}

      {/* Column select */}
      <Select
        value={sort.columnId}
        onValueChange={(columnId) => onUpdate({ columnId })}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {availableColumns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Direction toggle */}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          onUpdate({
            direction: sort.direction === "asc" ? "desc" : "asc",
          })
        }
        className="w-[140px] justify-start"
      >
        {sort.direction === "asc" ? (
          <>
            <ArrowUp className="h-4 w-4 mr-2" />
            Ascending
          </>
        ) : (
          <>
            <ArrowDown className="h-4 w-4 mr-2" />
            Descending
          </>
        )}
      </Button>

      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
