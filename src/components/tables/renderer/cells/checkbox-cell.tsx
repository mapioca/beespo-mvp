"use client";

import { Checkbox } from "@/components/ui/checkbox";

interface CheckboxCellProps {
  value: boolean | null;
  onSave: (value: boolean) => void;
}

export function CheckboxCell({ value, onSave }: CheckboxCellProps) {
  const handleChange = (checked: boolean) => {
    onSave(checked);
  };

  return (
    <div className="flex items-center justify-center min-h-[32px]">
      <Checkbox
        checked={value === true}
        onCheckedChange={handleChange}
        aria-label="Toggle checkbox"
      />
    </div>
  );
}
