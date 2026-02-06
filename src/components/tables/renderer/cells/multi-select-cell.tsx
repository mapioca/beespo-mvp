"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { SelectOption } from "@/types/table-types";

interface MultiSelectCellProps {
  value: string[] | null;
  options: SelectOption[];
  isEditing: boolean;
  onSave: (value: string[]) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function MultiSelectCell({
  value,
  options,
  isEditing,
  onSave,
  onKeyDown,
}: MultiSelectCellProps) {
  const [open, setOpen] = useState(false);
  const selectedIds = value || [];

  useEffect(() => {
    if (isEditing) {
      setOpen(true);
    }
  }, [isEditing]);

  const handleToggle = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onSave(selectedIds.filter((id) => id !== optionId));
    } else {
      onSave([...selectedIds, optionId]);
    }
  };

  const selectedOptions = options.filter((opt) => selectedIds.includes(opt.id));

  const content = (
    <div
      className={cn(
        "flex flex-wrap gap-1 px-2 py-1.5 min-h-[32px] cursor-text",
        selectedOptions.length === 0 && "text-muted-foreground text-sm"
      )}
    >
      {selectedOptions.length === 0 && "Empty"}
      {selectedOptions.map((option) => (
        <Badge
          key={option.id}
          variant="secondary"
          className="font-normal text-xs"
          style={{
            backgroundColor: `${option.color}20`,
            color: option.color,
            borderColor: option.color,
          }}
        >
          {option.label}
        </Badge>
      ))}
    </div>
  );

  if (isEditing) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="w-full" onKeyDown={onKeyDown}>
            {content}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {options.map((option) => (
              <div
                key={option.id}
                className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => handleToggle(option.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(option.id)}
                  onCheckedChange={() => handleToggle(option.id)}
                />
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
                <span className="text-sm">{option.label}</span>
              </div>
            ))}
            {options.length === 0 && (
              <p className="text-sm text-muted-foreground p-2">
                No options defined
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return content;
}
