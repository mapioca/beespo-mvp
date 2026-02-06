"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { SelectOption } from "@/types/table-types";

interface SelectCellProps {
  value: string | null;
  options: SelectOption[];
  isEditing: boolean;
  onSave: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function SelectCell({
  value,
  options,
  isEditing,
  onSave,
  onKeyDown,
}: SelectCellProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setOpen(true);
    }
  }, [isEditing]);

  const handleValueChange = (newValue: string) => {
    if (newValue === "__clear__") {
      onSave(null);
    } else {
      onSave(newValue);
    }
    setOpen(false);
  };

  const selectedOption = options.find((opt) => opt.id === value);

  if (isEditing) {
    return (
      <Select
        value={value ?? ""}
        onValueChange={handleValueChange}
        open={open}
        onOpenChange={setOpen}
      >
        <SelectTrigger
          className="h-full w-full border-0 rounded-none focus:ring-0 focus:ring-offset-0"
          onKeyDown={onKeyDown}
        >
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__clear__" className="text-muted-foreground">
            Clear selection
          </SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                {option.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (!selectedOption) {
    return (
      <div className="px-2 py-1.5 text-sm text-muted-foreground min-h-[32px] cursor-text">
        Empty
      </div>
    );
  }

  return (
    <div className="px-2 py-1.5 min-h-[32px] cursor-text">
      <Badge
        variant="secondary"
        className="font-normal"
        style={{
          backgroundColor: `${selectedOption.color}20`,
          color: selectedOption.color,
          borderColor: selectedOption.color,
        }}
      >
        {selectedOption.label}
      </Badge>
    </div>
  );
}
