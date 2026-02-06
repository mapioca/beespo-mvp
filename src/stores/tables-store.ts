import { create } from "zustand";
import { useMemo } from "react";
import type {
  DynamicTable,
  Column,
  Row,
  TableView,
  Filter,
  Sort,
} from "@/types/table-types";

/**
 * Cell update for optimistic updates queue
 */
interface CellUpdate {
  rowId: string;
  columnId: string;
  value: unknown;
  previousValue: unknown;
  timestamp: number;
}

/**
 * Tables store state interface
 */
export interface TablesState {
  // Tables list
  tables: DynamicTable[];
  isLoadingTables: boolean;

  // Active table state
  activeTableId: string | null;
  activeTable: DynamicTable | null;
  columns: Column[];
  rows: Row[];
  isLoadingTable: boolean;

  // View state
  activeViewId: string | null;
  views: TableView[];
  filters: Filter[];
  sorts: Sort[];
  visibleColumnIds: string[];
  columnWidths: Record<string, number>;

  // Edit state
  editingCell: { rowId: string; columnId: string } | null;
  selectedRowIds: Set<string>;

  // Optimistic updates queue
  pendingUpdates: Map<string, CellUpdate>;

  // Error state
  error: string | null;

  // Actions - Tables
  setTables: (tables: DynamicTable[]) => void;
  addTable: (table: DynamicTable) => void;
  updateTableInList: (tableId: string, updates: Partial<DynamicTable>) => void;
  removeTable: (tableId: string) => void;
  setLoadingTables: (isLoading: boolean) => void;

  // Actions - Active Table
  setActiveTable: (table: DynamicTable | null) => void;
  setActiveTableId: (tableId: string | null) => void;
  setColumns: (columns: Column[]) => void;
  addColumn: (column: Column) => void;
  updateColumn: (columnId: string, updates: Partial<Column>) => void;
  removeColumn: (columnId: string) => void;
  reorderColumns: (columns: Column[]) => void;
  setRows: (rows: Row[]) => void;
  addRow: (row: Row) => void;
  updateRow: (rowId: string, updates: Partial<Row>) => void;
  removeRow: (rowId: string) => void;
  removeRows: (rowIds: string[]) => void;
  setLoadingTable: (isLoading: boolean) => void;

  // Actions - Cell Updates
  updateCell: (rowId: string, columnId: string, value: unknown) => void;
  queueCellUpdate: (rowId: string, columnId: string, value: unknown, previousValue: unknown) => void;
  completeCellUpdate: (key: string) => void;
  revertCellUpdate: (key: string) => void;

  // Actions - Views
  setViews: (views: TableView[]) => void;
  addView: (view: TableView) => void;
  updateView: (viewId: string, updates: Partial<TableView>) => void;
  removeView: (viewId: string) => void;
  setActiveViewId: (viewId: string | null) => void;
  applyView: (view: TableView) => void;

  // Actions - Filters & Sorts
  setFilters: (filters: Filter[]) => void;
  addFilter: (filter: Filter) => void;
  updateFilter: (filterId: string, updates: Partial<Filter>) => void;
  removeFilter: (filterId: string) => void;
  clearFilters: () => void;
  setSorts: (sorts: Sort[]) => void;
  addSort: (sort: Sort) => void;
  removeSort: (columnId: string) => void;
  clearSorts: () => void;

  // Actions - Column Visibility
  setVisibleColumnIds: (columnIds: string[]) => void;
  toggleColumnVisibility: (columnId: string) => void;
  setColumnWidth: (columnId: string, width: number) => void;

  // Actions - Edit State
  setEditingCell: (cell: { rowId: string; columnId: string } | null) => void;
  toggleRowSelection: (rowId: string) => void;
  selectRows: (rowIds: string[]) => void;
  selectAllRows: () => void;
  clearSelection: () => void;

  // Actions - Error
  setError: (error: string | null) => void;

  // Actions - Reset
  reset: () => void;
  resetActiveTable: () => void;
}

const initialState = {
  tables: [] as DynamicTable[],
  isLoadingTables: false,

  activeTableId: null as string | null,
  activeTable: null as DynamicTable | null,
  columns: [] as Column[],
  rows: [] as Row[],
  isLoadingTable: false,

  activeViewId: null as string | null,
  views: [] as TableView[],
  filters: [] as Filter[],
  sorts: [] as Sort[],
  visibleColumnIds: [] as string[],
  columnWidths: {} as Record<string, number>,

  editingCell: null as { rowId: string; columnId: string } | null,
  selectedRowIds: new Set<string>(),

  pendingUpdates: new Map<string, CellUpdate>(),

  error: null as string | null,
};

export const useTablesStore = create<TablesState>()((set, get) => ({
  ...initialState,

  // =====================================================
  // Tables List Actions
  // =====================================================

  setTables: (tables) => set({ tables }),

  addTable: (table) =>
    set((state) => ({
      tables: [table, ...state.tables],
    })),

  updateTableInList: (tableId, updates) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, ...updates } : t
      ),
    })),

  removeTable: (tableId) =>
    set((state) => ({
      tables: state.tables.filter((t) => t.id !== tableId),
    })),

  setLoadingTables: (isLoading) => set({ isLoadingTables: isLoading }),

  // =====================================================
  // Active Table Actions
  // =====================================================

  setActiveTable: (table) =>
    set({
      activeTable: table,
      activeTableId: table?.id || null,
    }),

  setActiveTableId: (tableId) => set({ activeTableId: tableId }),

  setColumns: (columns) =>
    set({
      columns,
      visibleColumnIds: columns.map((c) => c.id),
    }),

  addColumn: (column) =>
    set((state) => ({
      columns: [...state.columns, column].sort((a, b) => a.position - b.position),
      visibleColumnIds: [...state.visibleColumnIds, column.id],
    })),

  updateColumn: (columnId, updates) =>
    set((state) => ({
      columns: state.columns.map((c) =>
        c.id === columnId ? { ...c, ...updates } : c
      ),
    })),

  removeColumn: (columnId) =>
    set((state) => ({
      columns: state.columns.filter((c) => c.id !== columnId),
      visibleColumnIds: state.visibleColumnIds.filter((id) => id !== columnId),
    })),

  reorderColumns: (columns) => set({ columns }),

  setRows: (rows) => set({ rows }),

  addRow: (row) =>
    set((state) => ({
      rows: [...state.rows, row].sort((a, b) => a.position - b.position),
    })),

  updateRow: (rowId, updates) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId ? { ...r, ...updates } : r
      ),
    })),

  removeRow: (rowId) =>
    set((state) => ({
      rows: state.rows.filter((r) => r.id !== rowId),
      selectedRowIds: new Set([...state.selectedRowIds].filter((id) => id !== rowId)),
    })),

  removeRows: (rowIds) =>
    set((state) => ({
      rows: state.rows.filter((r) => !rowIds.includes(r.id)),
      selectedRowIds: new Set([...state.selectedRowIds].filter((id) => !rowIds.includes(id))),
    })),

  setLoadingTable: (isLoading) => set({ isLoadingTable: isLoading }),

  // =====================================================
  // Cell Update Actions
  // =====================================================

  updateCell: (rowId, columnId, value) =>
    set((state) => ({
      rows: state.rows.map((r) =>
        r.id === rowId
          ? { ...r, data: { ...r.data, [columnId]: value } }
          : r
      ),
    })),

  queueCellUpdate: (rowId, columnId, value, previousValue) => {
    const key = `${rowId}:${columnId}`;
    const update: CellUpdate = {
      rowId,
      columnId,
      value,
      previousValue,
      timestamp: Date.now(),
    };
    set((state) => {
      const newUpdates = new Map(state.pendingUpdates);
      newUpdates.set(key, update);
      return { pendingUpdates: newUpdates };
    });
  },

  completeCellUpdate: (key) =>
    set((state) => {
      const newUpdates = new Map(state.pendingUpdates);
      newUpdates.delete(key);
      return { pendingUpdates: newUpdates };
    }),

  revertCellUpdate: (key) => {
    const { pendingUpdates } = get();
    const update = pendingUpdates.get(key);
    if (update) {
      set((state) => ({
        rows: state.rows.map((r) =>
          r.id === update.rowId
            ? { ...r, data: { ...r.data, [update.columnId]: update.previousValue } }
            : r
        ),
      }));
      get().completeCellUpdate(key);
    }
  },

  // =====================================================
  // View Actions
  // =====================================================

  setViews: (views) => set({ views }),

  addView: (view) =>
    set((state) => ({
      views: [...state.views, view],
    })),

  updateView: (viewId, updates) =>
    set((state) => ({
      views: state.views.map((v) =>
        v.id === viewId ? { ...v, ...updates } : v
      ),
    })),

  removeView: (viewId) =>
    set((state) => ({
      views: state.views.filter((v) => v.id !== viewId),
    })),

  setActiveViewId: (viewId) => set({ activeViewId: viewId }),

  applyView: (view) =>
    set({
      activeViewId: view.id,
      filters: view.filters,
      sorts: view.sorts,
      visibleColumnIds: view.visible_columns.length > 0 ? view.visible_columns : get().columns.map((c) => c.id),
      columnWidths: view.column_widths,
    }),

  // =====================================================
  // Filter & Sort Actions
  // =====================================================

  setFilters: (filters) => set({ filters }),

  addFilter: (filter) =>
    set((state) => ({
      filters: [...state.filters, filter],
    })),

  updateFilter: (filterId, updates) =>
    set((state) => ({
      filters: state.filters.map((f) =>
        f.id === filterId ? { ...f, ...updates } : f
      ),
    })),

  removeFilter: (filterId) =>
    set((state) => ({
      filters: state.filters.filter((f) => f.id !== filterId),
    })),

  clearFilters: () => set({ filters: [] }),

  setSorts: (sorts) => set({ sorts }),

  addSort: (sort) =>
    set((state) => ({
      // Only one sort per column
      sorts: [...state.sorts.filter((s) => s.columnId !== sort.columnId), sort],
    })),

  removeSort: (columnId) =>
    set((state) => ({
      sorts: state.sorts.filter((s) => s.columnId !== columnId),
    })),

  clearSorts: () => set({ sorts: [] }),

  // =====================================================
  // Column Visibility Actions
  // =====================================================

  setVisibleColumnIds: (columnIds) => set({ visibleColumnIds: columnIds }),

  toggleColumnVisibility: (columnId) =>
    set((state) => {
      const isVisible = state.visibleColumnIds.includes(columnId);
      return {
        visibleColumnIds: isVisible
          ? state.visibleColumnIds.filter((id) => id !== columnId)
          : [...state.visibleColumnIds, columnId],
      };
    }),

  setColumnWidth: (columnId, width) =>
    set((state) => ({
      columnWidths: { ...state.columnWidths, [columnId]: width },
    })),

  // =====================================================
  // Edit State Actions
  // =====================================================

  setEditingCell: (cell) => set({ editingCell: cell }),

  toggleRowSelection: (rowId) =>
    set((state) => {
      const newSelection = new Set(state.selectedRowIds);
      if (newSelection.has(rowId)) {
        newSelection.delete(rowId);
      } else {
        newSelection.add(rowId);
      }
      return { selectedRowIds: newSelection };
    }),

  selectRows: (rowIds) =>
    set((state) => ({
      selectedRowIds: new Set([...state.selectedRowIds, ...rowIds]),
    })),

  selectAllRows: () =>
    set((state) => ({
      selectedRowIds: new Set(state.rows.map((r) => r.id)),
    })),

  clearSelection: () => set({ selectedRowIds: new Set() }),

  // =====================================================
  // Error Actions
  // =====================================================

  setError: (error) => set({ error }),

  // =====================================================
  // Reset Actions
  // =====================================================

  reset: () => set(initialState),

  resetActiveTable: () =>
    set({
      activeTableId: null,
      activeTable: null,
      columns: [],
      rows: [],
      isLoadingTable: false,
      activeViewId: null,
      views: [],
      filters: [],
      sorts: [],
      visibleColumnIds: [],
      columnWidths: {},
      editingCell: null,
      selectedRowIds: new Set(),
      pendingUpdates: new Map(),
      error: null,
    }),
}));

// =====================================================
// Selector Hooks
// =====================================================

export const useTablesLoading = () =>
  useTablesStore((state) => state.isLoadingTables);

export const useActiveTable = () =>
  useTablesStore((state) => state.activeTable);

export const useActiveTableId = () =>
  useTablesStore((state) => state.activeTableId);

export const useTableColumns = () =>
  useTablesStore((state) => state.columns);

export const useTableRows = () =>
  useTablesStore((state) => state.rows);

export const useVisibleColumns = () => {
  const columns = useTablesStore((state) => state.columns);
  const visibleColumnIds = useTablesStore((state) => state.visibleColumnIds);

  return useMemo(() => {
    return columns.filter((c) => visibleColumnIds.includes(c.id));
  }, [columns, visibleColumnIds]);
};

export const useTableViews = () =>
  useTablesStore((state) => state.views);

export const useActiveView = () => {
  const views = useTablesStore((state) => state.views);
  const activeViewId = useTablesStore((state) => state.activeViewId);

  return useMemo(() => {
    return views.find((v) => v.id === activeViewId) || views.find((v) => v.is_default);
  }, [views, activeViewId]);
};

export const useTableFilters = () =>
  useTablesStore((state) => state.filters);

export const useTableSorts = () =>
  useTablesStore((state) => state.sorts);

export const useEditingCell = () =>
  useTablesStore((state) => state.editingCell);

export const useSelectedRowIds = () =>
  useTablesStore((state) => state.selectedRowIds);

export const useSelectedRowCount = () =>
  useTablesStore((state) => state.selectedRowIds.size);

export const useIsRowSelected = (rowId: string) =>
  useTablesStore((state) => state.selectedRowIds.has(rowId));

export const useColumnWidth = (columnId: string) =>
  useTablesStore((state) => state.columnWidths[columnId] || 200);

export const useTableError = () =>
  useTablesStore((state) => state.error);

export const usePendingUpdates = () =>
  useTablesStore((state) => state.pendingUpdates);

export const useHasPendingUpdates = () =>
  useTablesStore((state) => state.pendingUpdates.size > 0);

// Get filtered and sorted rows
export const useFilteredRows = () => {
  const rows = useTablesStore((state) => state.rows);
  const columns = useTablesStore((state) => state.columns);
  const filters = useTablesStore((state) => state.filters);
  const sorts = useTablesStore((state) => state.sorts);

  return useMemo(() => {
    // Apply filters
    let filteredRows = rows;

    for (const filter of filters) {
      if (!columns.some((c) => c.id === filter.columnId)) continue;

      filteredRows = filteredRows.filter((row) => {
        const value = row.data[filter.columnId];
        return applyFilter(value, filter);
      });
    }

    // Apply sorts
    if (sorts.length > 0) {
      filteredRows = [...filteredRows].sort((a, b) => {
        for (const sort of sorts) {
          const aVal = a.data[sort.columnId];
          const bVal = b.data[sort.columnId];
          const comparison = compareValues(aVal, bVal);
          if (comparison !== 0) {
            return sort.direction === "asc" ? comparison : -comparison;
          }
        }
        return a.position - b.position;
      });
    }

    return filteredRows;
  }, [rows, columns, filters, sorts]);
};

// Helper function to apply a filter
function applyFilter(value: unknown, filter: Filter): boolean {
  const filterValue = filter.value;

  switch (filter.operator) {
    case "equals":
      return value === filterValue;
    case "not_equals":
      return value !== filterValue;
    case "is_empty":
      return value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    case "is_not_empty":
      return value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
    case "contains":
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case "not_contains":
      return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
    case "starts_with":
      return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
    case "ends_with":
      return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
    case "greater_than":
      return Number(value) > Number(filterValue);
    case "less_than":
      return Number(value) < Number(filterValue);
    case "greater_than_or_equals":
      return Number(value) >= Number(filterValue);
    case "less_than_or_equals":
      return Number(value) <= Number(filterValue);
    case "is_before":
      return new Date(String(value)) < new Date(String(filterValue));
    case "is_after":
      return new Date(String(value)) > new Date(String(filterValue));
    case "is_on_or_before":
      return new Date(String(value)) <= new Date(String(filterValue));
    case "is_on_or_after":
      return new Date(String(value)) >= new Date(String(filterValue));
    default:
      return true;
  }
}

// Helper function to compare values for sorting
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;

  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }

  if (typeof a === "boolean" && typeof b === "boolean") {
    return a === b ? 0 : a ? -1 : 1;
  }

  return String(a).localeCompare(String(b));
}
