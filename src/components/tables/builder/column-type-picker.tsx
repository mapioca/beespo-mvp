"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Hash,
  ChevronDown,
  Tags,
  Calendar,
  Clock,
  CheckSquare,
  User,
} from "lucide-react";
import type { ColumnType } from "@/types/table-types";

interface ColumnTypePickerProps {
  value: ColumnType;
  onChange: (type: ColumnType) => void;
  disabled?: boolean;
}

const columnTypes: { value: ColumnType; label: string; icon: React.ReactNode }[] = [
  { value: "text", label: "Text", icon: <Type className="h-4 w-4" /> },
  { value: "number", label: "Number", icon: <Hash className="h-4 w-4" /> },
  { value: "select", label: "Select", icon: <ChevronDown className="h-4 w-4" /> },
  { value: "multi_select", label: "Multi-select", icon: <Tags className="h-4 w-4" /> },
  { value: "date", label: "Date", icon: <Calendar className="h-4 w-4" /> },
  { value: "datetime", label: "Date & Time", icon: <Clock className="h-4 w-4" /> },
  { value: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-4 w-4" /> },
  { value: "user_link", label: "Person", icon: <User className="h-4 w-4" /> },
  // { value: "table_link", label: "Link to Table", icon: <Link className="h-4 w-4" /> }, // Phase 2
];

export function ColumnTypePicker({
  value,
  onChange,
  disabled,
}: ColumnTypePickerProps) {
  const selectedType = columnTypes.find((t) => t.value === value);

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[160px]">
        <SelectValue>
          <div className="flex items-center gap-2">
            {selectedType?.icon}
            <span>{selectedType?.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {columnTypes.map((type) => (
          <SelectItem key={type.value} value={type.value}>
            <div className="flex items-center gap-2">
              {type.icon}
              <span>{type.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
