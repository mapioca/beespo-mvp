import type { Column, ColumnType } from "@/types/table-types";

/**
 * Result of cell value validation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  coerced?: unknown;
}

/**
 * Validate a cell value against its column type
 */
export function validateCellValue(
  value: unknown,
  column: Column
): ValidationResult {
  // Null/undefined is always valid (unless required)
  if (value === null || value === undefined || value === "") {
    if (column.is_required) {
      return { valid: false, error: `${column.name} is required` };
    }
    return { valid: true, coerced: null };
  }

  switch (column.type) {
    case "text":
      return validateText(value);
    case "number":
      return validateNumber(value);
    case "select":
      return validateSelect(value, column);
    case "multi_select":
      return validateMultiSelect(value, column);
    case "date":
      return validateDate(value);
    case "datetime":
      return validateDateTime(value);
    case "checkbox":
      return validateCheckbox(value);
    case "user_link":
      return validateUserLink(value);
    case "table_link":
      return validateTableLink(value);
    default:
      return { valid: true, coerced: value };
  }
}

/**
 * Validate text value
 */
function validateText(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    // Try to coerce
    const coerced = String(value);
    return { valid: true, coerced };
  }
  return { valid: true, coerced: value };
}

/**
 * Validate number value
 */
function validateNumber(value: unknown): ValidationResult {
  if (typeof value === "number") {
    if (isNaN(value)) {
      return { valid: false, error: "Invalid number" };
    }
    return { valid: true, coerced: value };
  }

  if (typeof value === "string") {
    // Try to parse
    const parsed = parseFloat(value.replace(/[,$]/g, ""));
    if (isNaN(parsed)) {
      return { valid: false, error: "Invalid number format" };
    }
    return { valid: true, coerced: parsed };
  }

  return { valid: false, error: "Value must be a number" };
}

/**
 * Validate select value
 */
function validateSelect(value: unknown, column: Column): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Select value must be a string" };
  }

  const options = column.config?.options || [];
  const validOption = options.find((opt) => opt.id === value);

  if (!validOption && options.length > 0) {
    return { valid: false, error: "Invalid option selected" };
  }

  return { valid: true, coerced: value };
}

/**
 * Validate multi-select value
 */
function validateMultiSelect(value: unknown, column: Column): ValidationResult {
  if (!Array.isArray(value)) {
    // Try to coerce single value to array
    if (typeof value === "string") {
      return { valid: true, coerced: [value] };
    }
    return { valid: false, error: "Multi-select value must be an array" };
  }

  // Validate all values are strings
  if (!value.every((v) => typeof v === "string")) {
    return { valid: false, error: "All multi-select values must be strings" };
  }

  // Validate all values are valid options
  const options = column.config?.options || [];
  if (options.length > 0) {
    const validIds = new Set(options.map((opt) => opt.id));
    const invalidValues = value.filter((v) => !validIds.has(v));
    if (invalidValues.length > 0) {
      return { valid: false, error: "Some selected options are invalid" };
    }
  }

  return { valid: true, coerced: value };
}

/**
 * Validate date value
 */
function validateDate(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Date must be a string" };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid date format" };
  }

  // Return ISO date string (without time)
  const isoDate = date.toISOString().split("T")[0];
  return { valid: true, coerced: isoDate };
}

/**
 * Validate datetime value
 */
function validateDateTime(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "DateTime must be a string" };
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid datetime format" };
  }

  return { valid: true, coerced: date.toISOString() };
}

/**
 * Validate checkbox value
 */
function validateCheckbox(value: unknown): ValidationResult {
  if (typeof value === "boolean") {
    return { valid: true, coerced: value };
  }

  // Coerce string/number to boolean
  if (value === "true" || value === 1 || value === "1" || value === "yes") {
    return { valid: true, coerced: true };
  }
  if (value === "false" || value === 0 || value === "0" || value === "no") {
    return { valid: true, coerced: false };
  }

  return { valid: false, error: "Checkbox value must be true or false" };
}

/**
 * Validate user link value (UUID)
 */
function validateUserLink(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "User link must be a string" };
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: "Invalid user ID format" };
  }

  return { valid: true, coerced: value };
}

/**
 * Validate table link value (UUID)
 */
function validateTableLink(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: "Table link must be a string" };
  }

  // Basic UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    return { valid: false, error: "Invalid linked row ID format" };
  }

  return { valid: true, coerced: value };
}

/**
 * Validate an entire row of data
 */
export function validateRowData(
  data: Record<string, unknown>,
  columns: Column[]
): { valid: boolean; errors: Record<string, string>; coerced: Record<string, unknown> } {
  const errors: Record<string, string> = {};
  const coerced: Record<string, unknown> = {};

  for (const column of columns) {
    const value = data[column.id];
    const result = validateCellValue(value, column);

    if (!result.valid && result.error) {
      errors[column.id] = result.error;
    } else {
      coerced[column.id] = result.coerced;
    }
  }

  // Check for required columns that are missing
  for (const column of columns) {
    if (column.is_required && !(column.id in data)) {
      errors[column.id] = `${column.name} is required`;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    coerced,
  };
}

/**
 * Check if a value can be converted to a different column type
 */
export function canConvertValue(
  value: unknown,
  fromType: ColumnType,
  toType: ColumnType
): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (fromType === toType) return true;

  // Text can convert to most types
  if (fromType === "text") {
    switch (toType) {
      case "number":
        return !isNaN(Number(value));
      case "date":
      case "datetime":
        return !isNaN(Date.parse(String(value)));
      case "checkbox":
        return ["true", "false", "1", "0", "yes", "no"].includes(
          String(value).toLowerCase()
        );
      case "select":
        return true; // Value becomes an option ID
      default:
        return true;
    }
  }

  // Number conversions
  if (fromType === "number") {
    switch (toType) {
      case "text":
        return true;
      case "checkbox":
        return value === 0 || value === 1;
      default:
        return false;
    }
  }

  // Checkbox conversions
  if (fromType === "checkbox") {
    return toType === "text" || toType === "number";
  }

  // Date conversions
  if (fromType === "date" || fromType === "datetime") {
    return toType === "text" || toType === "date" || toType === "datetime";
  }

  // Select conversions
  if (fromType === "select") {
    return toType === "text" || toType === "multi_select";
  }

  // Multi-select conversions
  if (fromType === "multi_select") {
    return toType === "text";
  }

  return false;
}

/**
 * Convert a value from one type to another
 */
export function convertValue(
  value: unknown,
  fromType: ColumnType,
  toType: ColumnType
): unknown {
  if (value === null || value === undefined || value === "") return null;
  if (fromType === toType) return value;

  // Text to other types
  if (fromType === "text") {
    switch (toType) {
      case "number":
        return parseFloat(String(value).replace(/[,$]/g, ""));
      case "date":
        return new Date(String(value)).toISOString().split("T")[0];
      case "datetime":
        return new Date(String(value)).toISOString();
      case "checkbox":
        return ["true", "1", "yes"].includes(String(value).toLowerCase());
      default:
        return value;
    }
  }

  // Number to other types
  if (fromType === "number") {
    switch (toType) {
      case "text":
        return String(value);
      case "checkbox":
        return value === 1;
      default:
        return null;
    }
  }

  // Checkbox to other types
  if (fromType === "checkbox") {
    switch (toType) {
      case "text":
        return value ? "Yes" : "No";
      case "number":
        return value ? 1 : 0;
      default:
        return null;
    }
  }

  // Date/datetime conversions
  if (fromType === "date" || fromType === "datetime") {
    switch (toType) {
      case "text":
        return String(value);
      case "date":
        return new Date(String(value)).toISOString().split("T")[0];
      case "datetime":
        return new Date(String(value)).toISOString();
      default:
        return null;
    }
  }

  // Select to other types
  if (fromType === "select") {
    switch (toType) {
      case "text":
        return String(value);
      case "multi_select":
        return [value];
      default:
        return null;
    }
  }

  // Multi-select to text
  if (fromType === "multi_select") {
    if (toType === "text" && Array.isArray(value)) {
      return value.join(", ");
    }
    return null;
  }

  return null;
}
