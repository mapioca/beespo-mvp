"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ColumnConfig } from "@/types/table-types";

interface NumberCellProps {
  value: number | null;
  config?: ColumnConfig;
  isEditing: boolean;
  onSave: (value: number | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function NumberCell({
  value,
  config,
  isEditing,
  onSave,
  onKeyDown,
}: NumberCellProps) {
  const [inputValue, setInputValue] = useState(value?.toString() ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue === "") {
      onSave(null);
    } else {
      const parsed = parseFloat(newValue.replace(/[,$]/g, ""));
      if (!isNaN(parsed)) {
        onSave(parsed);
      }
    }
  };

  const formatNumber = (num: number | null): string => {
    if (num === null || num === undefined) return "";

    const { format, decimals = 0, prefix = "", suffix = "" } = config || {};

    let formatted: string;

    switch (format) {
      case "currency":
        formatted = num.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${prefix || "$"}${formatted}${suffix}`;

      case "percent":
        formatted = (num * 100).toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${prefix}${formatted}%${suffix}`;

      default:
        formatted = num.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        return `${prefix}${formatted}${suffix}`;
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className="h-full w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1.5 text-right"
        placeholder="0"
      />
    );
  }

  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm min-h-[32px] text-right tabular-nums cursor-text",
        value === null && "text-muted-foreground"
      )}
    >
      {value !== null ? formatNumber(value) : "Empty"}
    </div>
  );
}
