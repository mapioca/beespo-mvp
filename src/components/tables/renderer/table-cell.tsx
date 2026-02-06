"use client";

import type { Column } from "@/types/table-types";
import { TextCell } from "./cells/text-cell";
import { NumberCell } from "./cells/number-cell";
import { SelectCell } from "./cells/select-cell";
import { MultiSelectCell } from "@/components/tables";
import { DateCell } from "./cells/date-cell";
import { CheckboxCell } from "@/components/tables";
import { UserLinkCell } from "@/components/tables";

interface TableCellRendererProps {
  column: Column;
  value: unknown;
  isEditing: boolean;
  onSave: (value: unknown) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function TableCellRenderer({
  column,
  value,
  isEditing,
  onSave,
  onKeyDown,
}: TableCellRendererProps) {
  switch (column.type) {
    case "text":
      return (
        <TextCell
          value={value as string | null}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "number":
      return (
        <NumberCell
          value={value as number | null}
          config={column.config}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "select":
      return (
        <SelectCell
          value={value as string | null}
          options={column.config?.options || []}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "multi_select":
      return (
        <MultiSelectCell
          value={value as string[] | null}
          options={column.config?.options || []}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "date":
      return (
        <DateCell
          value={value as string | null}
          includeTime={false}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "datetime":
      return (
        <DateCell
          value={value as string | null}
          includeTime={true}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "checkbox":
      return (
        <CheckboxCell
          value={value as boolean | null}
          onSave={onSave}
        />
      );

    case "user_link":
      return (
        <UserLinkCell
          value={value as string | null}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    case "table_link":
      // Phase 2 - for now show as text
      return (
        <TextCell
          value={value as string | null}
          isEditing={isEditing}
          onSave={onSave}
          onKeyDown={onKeyDown}
        />
      );

    default:
      return (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">
          {String(value ?? "")}
        </div>
      );
  }
}
