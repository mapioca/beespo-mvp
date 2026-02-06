// Dynamic Tables Types - Schema-driven table system (Notion/Airtable-style)

/**
 * Supported column types for dynamic tables
 */
export type ColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'datetime'
  | 'checkbox'
  | 'user_link'
  | 'table_link'; // Phase 2: Table-to-table links

/**
 * Option for select and multi-select columns
 */
export interface SelectOption {
  id: string;
  label: string;
  color: string;
}

/**
 * Color palette for select options
 */
export const SELECT_OPTION_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
] as const;

/**
 * Number format types
 */
export type NumberFormat = 'number' | 'currency' | 'percent';

/**
 * Type-specific column configuration
 */
export interface ColumnConfig {
  // Select/Multi-select options
  options?: SelectOption[];

  // Number formatting
  format?: NumberFormat;
  decimals?: number;
  prefix?: string;
  suffix?: string;

  // Date formatting
  dateFormat?: string;
  includeTime?: boolean;

  // Table Link (Phase 2)
  linkedTableId?: string;
  displayColumnId?: string;
}

/**
 * Column definition for a dynamic table
 */
export interface Column {
  id: string;
  table_id: string;
  name: string;
  type: ColumnType;
  config: ColumnConfig;
  position: number;
  is_required: boolean;
  default_value?: unknown;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Row data storage type - maps column IDs to values
 */
export type RowData = Record<string, unknown>;

/**
 * Row in a dynamic table
 */
export interface Row {
  id: string;
  table_id: string;
  workspace_id: string;
  position: number;
  data: RowData;
  form_submission_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dynamic table metadata
 */
export interface DynamicTable {
  id: string;
  workspace_id: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  slug: string;
  linked_form_id?: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Dynamic table with related data
 */
export interface DynamicTableWithRelations extends DynamicTable {
  columns?: Column[];
  views?: TableView[];
  rows?: Row[];
  row_count?: number;
}

/**
 * Filter operators for different column types
 */
export type FilterOperator =
  // Universal operators
  | 'equals'
  | 'not_equals'
  | 'is_empty'
  | 'is_not_empty'
  // Text operators
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  // Number operators
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equals'
  | 'less_than_or_equals'
  | 'between'
  // Date operators
  | 'is_before'
  | 'is_after'
  | 'is_on_or_before'
  | 'is_on_or_after'
  | 'is_within';

/**
 * Date range options for is_within filter
 */
export type DateWithinRange =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'past_7_days'
  | 'past_30_days'
  | 'next_7_days'
  | 'next_30_days';

/**
 * Single filter condition
 */
export interface Filter {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: unknown;
}

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort configuration
 */
export interface Sort {
  columnId: string;
  direction: SortDirection;
}

/**
 * Saved view for a table
 */
export interface TableView {
  id: string;
  table_id: string;
  name: string;
  filters: Filter[];
  sorts: Sort[];
  visible_columns: string[];
  column_widths: Record<string, number>;
  is_default: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// =====================================================
// API Request/Response Types
// =====================================================

/**
 * Request to create a new table
 */
export interface CreateTableRequest {
  name: string;
  description?: string;
  icon?: string;
  columns?: CreateColumnRequest[];
}

/**
 * Request to update a table
 */
export interface UpdateTableRequest {
  name?: string;
  description?: string;
  icon?: string;
}

/**
 * Request to create a new column
 */
export interface CreateColumnRequest {
  name: string;
  type: ColumnType;
  config?: ColumnConfig;
  is_required?: boolean;
  default_value?: unknown;
  position?: number;
}

/**
 * Request to update a column
 */
export interface UpdateColumnRequest {
  name?: string;
  type?: ColumnType;
  config?: ColumnConfig;
  is_required?: boolean;
  default_value?: unknown;
  position?: number;
}

/**
 * Request to create a new row
 */
export interface CreateRowRequest {
  data: RowData;
  position?: number;
}

/**
 * Request to update a row
 */
export interface UpdateRowRequest {
  data?: RowData;
  position?: number;
}

/**
 * Request to update a single cell
 */
export interface UpdateCellRequest {
  columnId: string;
  value: unknown;
}

/**
 * Request to create a new view
 */
export interface CreateViewRequest {
  name: string;
  filters?: Filter[];
  sorts?: Sort[];
  visible_columns?: string[];
  column_widths?: Record<string, number>;
  is_default?: boolean;
}

/**
 * Request to update a view
 */
export interface UpdateViewRequest {
  name?: string;
  filters?: Filter[];
  sorts?: Sort[];
  visible_columns?: string[];
  column_widths?: Record<string, number>;
  is_default?: boolean;
}

/**
 * Bulk row operations
 */
export interface BulkRowsRequest {
  create?: CreateRowRequest[];
  update?: { id: string; data: RowData }[];
  delete?: string[];
}

/**
 * Rows query parameters
 */
export interface RowsQueryParams {
  viewId?: string;
  filters?: Filter[];
  sorts?: Sort[];
  search?: string;
  page?: number;
  limit?: number;
}

// =====================================================
// Type Change Validation
// =====================================================

/**
 * Result of type change validation
 */
export interface TypeChangeValidation {
  canChange: boolean;
  invalidRowIds: string[];
  warnings: string[];
  suggestions?: string;
}

// =====================================================
// Form Integration Types
// =====================================================

/**
 * Mapping between form fields and table columns
 */
export interface FormColumnMapping {
  formFieldId: string;
  columnId: string;
}

/**
 * Form link configuration
 */
export interface FormLinkConfig {
  formId: string;
  mappings: FormColumnMapping[];
  autoCreateColumns?: boolean;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get available operators for a column type
 */
export function getOperatorsForType(type: ColumnType): FilterOperator[] {
  const universalOps: FilterOperator[] = ['equals', 'not_equals', 'is_empty', 'is_not_empty'];

  switch (type) {
    case 'text':
      return [...universalOps, 'contains', 'not_contains', 'starts_with', 'ends_with'];
    case 'number':
      return [
        ...universalOps,
        'greater_than',
        'less_than',
        'greater_than_or_equals',
        'less_than_or_equals',
        'between',
      ];
    case 'date':
    case 'datetime':
      return [
        ...universalOps,
        'is_before',
        'is_after',
        'is_on_or_before',
        'is_on_or_after',
        'is_within',
      ];
    case 'select':
    case 'multi_select':
    case 'user_link':
    case 'table_link':
      return universalOps;
    case 'checkbox':
      return ['equals'];
    default:
      return universalOps;
  }
}

/**
 * Get default value for a column type
 */
export function getDefaultValueForType(type: ColumnType): unknown {
  switch (type) {
    case 'text':
      return '';
    case 'number':
      return null;
    case 'select':
      return null;
    case 'multi_select':
      return [];
    case 'date':
    case 'datetime':
      return null;
    case 'checkbox':
      return false;
    case 'user_link':
      return null;
    case 'table_link':
      return null;
    default:
      return null;
  }
}

/**
 * Check if a value is valid for a column type
 */
export function isValueValidForType(value: unknown, type: ColumnType): boolean {
  if (value === null || value === undefined) return true;

  switch (type) {
    case 'text':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'select':
      return typeof value === 'string';
    case 'multi_select':
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
    case 'date':
    case 'datetime':
      return typeof value === 'string' && !isNaN(Date.parse(value));
    case 'checkbox':
      return typeof value === 'boolean';
    case 'user_link':
      return typeof value === 'string';
    case 'table_link':
      return typeof value === 'string';
    default:
      return true;
  }
}

/**
 * Get display name for a column type
 */
export function getColumnTypeLabel(type: ColumnType): string {
  const labels: Record<ColumnType, string> = {
    text: 'Text',
    number: 'Number',
    select: 'Select',
    multi_select: 'Multi-select',
    date: 'Date',
    datetime: 'Date & Time',
    checkbox: 'Checkbox',
    user_link: 'Person',
    table_link: 'Link to Table',
  };
  return labels[type];
}

/**
 * Get icon name for a column type
 */
export function getColumnTypeIcon(type: ColumnType): string {
  const icons: Record<ColumnType, string> = {
    text: 'Type',
    number: 'Hash',
    select: 'ChevronDown',
    multi_select: 'Tags',
    date: 'Calendar',
    datetime: 'Clock',
    checkbox: 'CheckSquare',
    user_link: 'User',
    table_link: 'Link',
  };
  return icons[type];
}
