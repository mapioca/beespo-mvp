"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TextCellProps {
  value: string | null;
  isEditing: boolean;
  onSave: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  placeholder?: string;
}

export function TextCell({
  value,
  isEditing,
  onSave,
  onKeyDown,
  placeholder = "Empty",
}: TextCellProps) {
  const [inputValue, setInputValue] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value ?? "");
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
    onSave(newValue);
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleChange}
        onKeyDown={onKeyDown}
        className="h-full w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-1.5"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      className={cn(
        "px-2 py-1.5 text-sm min-h-[32px] truncate cursor-text",
        !value && "text-muted-foreground"
      )}
    >
      {value || placeholder}
    </div>
  );
}
