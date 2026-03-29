"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useTablesStore } from "@/stores/tables-store";
import { getOperatorsForType, getOperatorLabel } from "@/lib/tables";
import type { Column, Filter, FilterOperator } from "@/types/table-types";

interface FilterBuilderProps {
  columns: Column[];
  onClose: () => void;
}

export function FilterBuilder({ columns, onClose }: FilterBuilderProps) {
  const { filters, addFilter, updateFilter, removeFilter, clearFilters } = useTablesStore();

  const handleAddFilter = () => {
    if (columns.length === 0) return;

    const firstColumn = columns[0];
    const operators = getOperatorsForType(firstColumn.type);

    addFilter({
      id: crypto.randomUUID(),
      columnId: firstColumn.id,
      operator: operators[0] as FilterOperator,
      value: "",
    });
  };

  return (
    <Card className="p-4 bg-muted/30 border-border/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Filters
        </h4>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4 stroke-[1.6]" />
        </Button>
      </div>

      <div className="space-y-2">
        {filters.map((filter, index) => (
          <FilterRow
            key={filter.id}
            filter={filter}
            columns={columns}
            showPrefix={index > 0}
            onUpdate={(updates) => updateFilter(filter.id, updates)}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}

        {filters.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">
            No filters applied. Add a filter to narrow down your data.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" size="sm" onClick={handleAddFilter} className="border-border/60 hover:bg-[hsl(var(--accent-warm)/0.6)] shadow-none">
          <Plus className="h-4 w-4 mr-1 stroke-[1.6]" />
          Add filter
        </Button>
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
            Clear all
          </Button>
        )}
      </div>
    </Card>
  );
}

interface FilterRowProps {
  filter: Filter;
  columns: Column[];
  showPrefix: boolean;
  onUpdate: (updates: Partial<Filter>) => void;
  onRemove: () => void;
}

function FilterRow({
  filter,
  columns,
  showPrefix,
  onUpdate,
  onRemove,
}: FilterRowProps) {
  const column = columns.find((c) => c.id === filter.columnId);
  const operators: FilterOperator[] = column ? getOperatorsForType(column.type) : [];

  const handleColumnChange = (columnId: string) => {
    const newColumn = columns.find((c) => c.id === columnId);
    if (newColumn) {
      const newOperators = getOperatorsForType(newColumn.type);
      onUpdate({
        columnId,
        operator: newOperators[0] as FilterOperator,
        value: "",
      });
    }
  };

  const needsValue = !["is_empty", "is_not_empty"].includes(filter.operator);

  return (
    <div className="flex items-center gap-2">
      {showPrefix && (
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground w-12">
          And
        </span>
      )}
      {!showPrefix && <div className="w-12" />}

      {/* Column select */}
      <Select value={filter.columnId} onValueChange={handleColumnChange}>
      <SelectTrigger className="w-[150px] h-9 bg-background border-border/60 focus:ring-0 focus:border-foreground/30 text-sm">
        <SelectValue placeholder="Column" />
      </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator select */}
      <Select
        value={filter.operator}
        onValueChange={(op) => onUpdate({ operator: op as FilterOperator })}
      >
      <SelectTrigger className="w-[160px] h-9 bg-background border-border/60 focus:ring-0 focus:border-foreground/30 text-sm">
        <SelectValue placeholder="Operator" />
      </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {getOperatorLabel(op)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {needsValue && (
        <Input
          value={String(filter.value ?? "")}
          onChange={(e) => onUpdate({ value: e.target.value })}
          placeholder="Value"
          className="w-[150px] h-9 bg-background border-border/60 focus-visible:ring-0 focus-visible:border-foreground/30 text-sm"
        />
      )}

      <Button variant="ghost" size="icon" onClick={onRemove} className="text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4 stroke-[1.6]" />
      </Button>
    </div>
  );
}
