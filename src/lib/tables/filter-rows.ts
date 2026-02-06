import type { Row, Column, Filter, FilterOperator, DateWithinRange } from "@/types/table-types";

/**
 * Apply filters to rows
 */
export function filterRows(
  rows: Row[],
  filters: Filter[],
  columns: Column[]
): Row[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) => {
    // All filters must match (AND logic)
    return filters.every((filter) => {
      const column = columns.find((c) => c.id === filter.columnId);
      if (!column) return true; // Skip unknown columns

      const value = row.data[filter.columnId];
      return applyFilter(value, filter, column);
    });
  });
}

/**
 * Apply a single filter to a value
 */
export function applyFilter(
  value: unknown,
  filter: Filter,
  column: Column
): boolean {
  const filterValue = filter.value;

  switch (filter.operator) {
    // Universal operators
    case "equals":
      return equals(value, filterValue, column);
    case "not_equals":
      return !equals(value, filterValue, column);
    case "is_empty":
      return isEmpty(value);
    case "is_not_empty":
      return !isEmpty(value);

    // Text operators
    case "contains":
      return contains(value, filterValue);
    case "not_contains":
      return !contains(value, filterValue);
    case "starts_with":
      return startsWith(value, filterValue);
    case "ends_with":
      return endsWith(value, filterValue);

    // Number operators
    case "greater_than":
      return greaterThan(value, filterValue);
    case "less_than":
      return lessThan(value, filterValue);
    case "greater_than_or_equals":
      return greaterThanOrEquals(value, filterValue);
    case "less_than_or_equals":
      return lessThanOrEquals(value, filterValue);
    case "between":
      return between(value, filterValue);

    // Date operators
    case "is_before":
      return isBefore(value, filterValue);
    case "is_after":
      return isAfter(value, filterValue);
    case "is_on_or_before":
      return isOnOrBefore(value, filterValue);
    case "is_on_or_after":
      return isOnOrAfter(value, filterValue);
    case "is_within":
      return isWithin(value, filterValue as DateWithinRange);

    default:
      return true;
  }
}

// =====================================================
// Comparison Helpers
// =====================================================

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (value === "") return true;
  return Array.isArray(value) && value.length === 0;

}

function equals(value: unknown, filterValue: unknown, column: Column): boolean {
  if (isEmpty(value) && isEmpty(filterValue)) return true;
  if (isEmpty(value) || isEmpty(filterValue)) return false;

  // Special handling for multi-select (array comparison)
  if (column.type === "multi_select") {
    if (Array.isArray(value) && Array.isArray(filterValue)) {
      return (
        value.length === filterValue.length &&
        value.every((v) => filterValue.includes(v))
      );
    }
    if (Array.isArray(value)) {
      return value.includes(filterValue);
    }
  }

  // Checkbox comparison
  if (column.type === "checkbox") {
    return Boolean(value) === Boolean(filterValue);
  }

  // String comparison (case-insensitive)
  if (typeof value === "string" && typeof filterValue === "string") {
    return value.toLowerCase() === filterValue.toLowerCase();
  }

  return value === filterValue;
}

function contains(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
}

function startsWith(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
}

function endsWith(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
}

function greaterThan(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return Number(value) > Number(filterValue);
}

function lessThan(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return Number(value) < Number(filterValue);
}

function greaterThanOrEquals(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return Number(value) >= Number(filterValue);
}

function lessThanOrEquals(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return Number(value) <= Number(filterValue);
}

function between(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || !Array.isArray(filterValue) || filterValue.length !== 2) {
    return false;
  }
  const num = Number(value);
  const [min, max] = filterValue.map(Number);
  return num >= min && num <= max;
}

function isBefore(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return new Date(String(value)) < new Date(String(filterValue));
}

function isAfter(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return new Date(String(value)) > new Date(String(filterValue));
}

function isOnOrBefore(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return new Date(String(value)) <= new Date(String(filterValue));
}

function isOnOrAfter(value: unknown, filterValue: unknown): boolean {
  if (isEmpty(value) || isEmpty(filterValue)) return false;
  return new Date(String(value)) >= new Date(String(filterValue));
}

function isWithin(value: unknown, range: DateWithinRange): boolean {
  if (isEmpty(value)) return false;

  const valueDate = new Date(String(value));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start: Date;
  let end: Date;

  switch (range) {
    case "today":
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1);
      break;

    case "yesterday":
      start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() - 1);
      break;

    case "this_week":
      const dayOfWeek = today.getDay();
      start = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      break;

    case "last_week":
      const lastWeekStart = new Date(today.getTime() - (today.getDay() + 7) * 24 * 60 * 60 * 1000);
      start = lastWeekStart;
      end = new Date(lastWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      break;

    case "this_month":
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "last_month":
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      break;

    case "this_year":
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "last_year":
      start = new Date(today.getFullYear() - 1, 0, 1);
      end = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;

    case "past_7_days":
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = now;
      break;

    case "past_30_days":
      start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      end = now;
      break;

    case "next_7_days":
      start = today;
      end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;

    case "next_30_days":
      start = today;
      end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      break;

    default:
      return true;
  }

  return valueDate >= start && valueDate <= end;
}

/**
 * Get display label for a filter operator
 */
export function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    equals: "equals",
    not_equals: "does not equal",
    is_empty: "is empty",
    is_not_empty: "is not empty",
    contains: "contains",
    not_contains: "does not contain",
    starts_with: "starts with",
    ends_with: "ends with",
    greater_than: "greater than",
    less_than: "less than",
    greater_than_or_equals: "greater than or equals",
    less_than_or_equals: "less than or equals",
    between: "is between",
    is_before: "is before",
    is_after: "is after",
    is_on_or_before: "is on or before",
    is_on_or_after: "is on or after",
    is_within: "is within",
  };
  return labels[operator] || operator;
}

/**
 * Get display label for a date range
 */
export function getDateRangeLabel(range: DateWithinRange): string {
  const labels: Record<DateWithinRange, string> = {
    today: "Today",
    yesterday: "Yesterday",
    this_week: "This week",
    last_week: "Last week",
    this_month: "This month",
    last_month: "Last month",
    this_year: "This year",
    last_year: "Last year",
    past_7_days: "Past 7 days",
    past_30_days: "Past 30 days",
    next_7_days: "Next 7 days",
    next_30_days: "Next 30 days",
  };
  return labels[range] || range;
}
