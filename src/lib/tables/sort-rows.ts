import type { Row, Column, Sort, ColumnType } from "@/types/table-types";

/**
 * Sort rows by multiple columns
 */
export function sortRows(
  rows: Row[],
  sorts: Sort[],
  columns: Column[]
): Row[] {
  if (sorts.length === 0) {
    // Default sort by position
    return [...rows].sort((a, b) => a.position - b.position);
  }

  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const column = columns.find((c) => c.id === sort.columnId);
      if (!column) continue;

      const aValue = a.data[sort.columnId];
      const bValue = b.data[sort.columnId];

      const comparison = compareValues(aValue, bValue, column.type);

      if (comparison !== 0) {
        return sort.direction === "asc" ? comparison : -comparison;
      }
    }

    // Fall back to position if all sort columns are equal
    return a.position - b.position;
  });
}

/**
 * Compare two values based on column type
 */
export function compareValues(
  a: unknown,
  b: unknown,
  type: ColumnType
): number {
  // Handle null/undefined - always sort to end
  if (a === null || a === undefined) {
    return b === null || b === undefined ? 0 : 1;
  }
  if (b === null || b === undefined) {
    return -1;
  }

  // Handle empty strings
  if (a === "") {
    return b === "" ? 0 : 1;
  }
  if (b === "") {
    return -1;
  }

  switch (type) {
    case "number":
      return compareNumbers(a, b);

    case "date":
    case "datetime":
      return compareDates(a, b);

    case "checkbox":
      return compareCheckboxes(a, b);

    case "text":
    case "select":
    case "user_link":
    case "table_link":
      return compareStrings(a, b);

    case "multi_select":
      return compareMultiSelect(a, b);

    default:
      return compareStrings(a, b);
  }
}

/**
 * Compare numbers
 */
function compareNumbers(a: unknown, b: unknown): number {
  const numA = typeof a === "number" ? a : parseFloat(String(a));
  const numB = typeof b === "number" ? b : parseFloat(String(b));

  if (isNaN(numA)) return isNaN(numB) ? 0 : 1;
  if (isNaN(numB)) return -1;

  return numA - numB;
}

/**
 * Compare dates
 */
function compareDates(a: unknown, b: unknown): number {
  const dateA = new Date(String(a)).getTime();
  const dateB = new Date(String(b)).getTime();

  if (isNaN(dateA)) return isNaN(dateB) ? 0 : 1;
  if (isNaN(dateB)) return -1;

  return dateA - dateB;
}

/**
 * Compare checkboxes (true before false)
 */
function compareCheckboxes(a: unknown, b: unknown): number {
  const boolA = Boolean(a);
  const boolB = Boolean(b);

  if (boolA === boolB) return 0;
  return boolA ? -1 : 1; // true comes before false
}

/**
 * Compare strings (case-insensitive, natural sort)
 */
function compareStrings(a: unknown, b: unknown): number {
  const strA = String(a).toLowerCase();
  const strB = String(b).toLowerCase();

  // Use natural sort for strings with numbers
  return strA.localeCompare(strB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * Compare multi-select arrays (by first element, then length)
 */
function compareMultiSelect(a: unknown, b: unknown): number {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];

  if (arrA.length === 0) return arrB.length === 0 ? 0 : 1;
  if (arrB.length === 0) return -1;

  // Compare first elements
  const firstComparison = compareStrings(arrA[0], arrB[0]);
  if (firstComparison !== 0) return firstComparison;

  // If first elements are equal, compare by array length
  return arrA.length - arrB.length;
}

/**
 * Search rows by text query across all text columns
 */
export function searchRows(
  rows: Row[],
  query: string,
  columns: Column[]
): Row[] {
  if (!query || query.trim() === "") return rows;

  const searchTerm = query.toLowerCase().trim();

  // Get searchable column IDs (text-based types)
  const searchableTypes: ColumnType[] = ["text", "select", "multi_select"];
  const searchableColumnIds = columns
    .filter((c) => searchableTypes.includes(c.type))
    .map((c) => c.id);

  return rows.filter((row) => {
    return searchableColumnIds.some((columnId) => {
      const value = row.data[columnId];

      if (value === null || value === undefined) return false;

      if (Array.isArray(value)) {
        return value.some((v) =>
          String(v).toLowerCase().includes(searchTerm)
        );
      }

      return String(value).toLowerCase().includes(searchTerm);
    });
  });
}

/**
 * Get the primary sort column (first in sorts array)
 */
export function getPrimarySortColumn(sorts: Sort[]): Sort | null {
  return sorts.length > 0 ? sorts[0] : null;
}

/**
 * Toggle sort direction for a column
 */
export function toggleSort(
  sorts: Sort[],
  columnId: string
): Sort[] {
  const existingSort = sorts.find((s) => s.columnId === columnId);

  if (!existingSort) {
    // Add new sort (ascending first)
    return [...sorts, { columnId, direction: "asc" }];
  }

  if (existingSort.direction === "asc") {
    // Toggle to descending
    return sorts.map((s) =>
      s.columnId === columnId ? { ...s, direction: "desc" as const } : s
    );
  }

  // Remove sort (cycle: asc -> desc -> none)
  return sorts.filter((s) => s.columnId !== columnId);
}

/**
 * Set single sort (replace all existing sorts)
 */
export function setSingleSort(columnId: string, direction: "asc" | "desc"): Sort[] {
  return [{ columnId, direction }];
}

/**
 * Add sort to existing sorts (multi-column sort)
 */
export function addSort(sorts: Sort[], columnId: string, direction: "asc" | "desc"): Sort[] {
  // Remove existing sort for this column
  const filtered = sorts.filter((s) => s.columnId !== columnId);
  return [...filtered, { columnId, direction }];
}
