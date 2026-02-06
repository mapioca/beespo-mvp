"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Filter,
  ArrowUpDown,
  Search,
  Trash2,
} from "lucide-react";
import { FilterBuilder } from "./filter-builder";
import { SortBuilder } from "./sort-builder";
import { ViewSwitcher } from "./view-switcher";
import { ColumnVisibility } from "./column-visibility";
import { useTablesStore, useSelectedRowCount } from "@/stores/tables-store";
import { bulkDeleteRows } from "@/lib/actions/table-actions";
import { useToast } from "@/lib/hooks/use-toast";
import type { Column, TableView } from "@/types/table-types";

interface TableToolbarProps {
  tableId: string;
  columns: Column[];
  views: TableView[];
  onViewSave?: () => void;
}

export function TableToolbar({
  tableId,
  columns,
  views,
  onViewSave,
}: TableToolbarProps) {
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);
  const [showSorts, setShowSorts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    filters,
    sorts,
    selectedRowIds,
    clearSelection,
    removeRows,
  } = useTablesStore();

  const selectedCount = useSelectedRowCount();

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;

    const rowIds = Array.from(selectedRowIds);
    const result = await bulkDeleteRows(tableId, rowIds);

    if (result.error) {
      toast({
        title: "Failed to delete",
        description: result.error,
        variant: "destructive",
      });
    } else {
      removeRows(rowIds);
      clearSelection();
      toast({
        title: "Rows deleted",
        description: `${rowIds.length} row(s) deleted successfully`,
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Main toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <ViewSwitcher
            tableId={tableId}
            views={views}
            onSave={onViewSave}
          />

          {/* Filter button */}
          <Button
            variant={filters.length > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
            {filters.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                {filters.length}
              </span>
            )}
          </Button>

          {/* Sort button */}
          <Button
            variant={sorts.length > 0 ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowSorts(!showSorts)}
          >
            <ArrowUpDown className="h-4 w-4 mr-1" />
            Sort
            {sorts.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded">
                {sorts.length}
              </span>
            )}
          </Button>

          {/* Column visibility */}
          <ColumnVisibility columns={columns} />
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] pl-8 h-9"
            />
          </div>

          {/* Bulk actions */}
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      {/* Filter builder */}
      {showFilters && (
        <FilterBuilder
          columns={columns}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Sort builder */}
      {showSorts && (
        <SortBuilder
          columns={columns}
          onClose={() => setShowSorts(false)}
        />
      )}
    </div>
  );
}
