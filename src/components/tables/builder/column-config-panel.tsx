"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ColumnType, ColumnConfig, SelectOption, NumberFormat } from "@/types/table-types";
import { SELECT_OPTION_COLORS } from "@/types/table-types";

interface ColumnConfigPanelProps {
  type: ColumnType;
  config: ColumnConfig;
  onChange: (config: ColumnConfig) => void;
}

export function ColumnConfigPanel({
  type,
  config,
  onChange,
}: ColumnConfigPanelProps) {
  switch (type) {
    case "select":
    case "multi_select":
      return (
        <SelectOptionsEditor
          options={config.options || []}
          onChange={(options) => onChange({ ...config, options })}
        />
      );

    case "number":
      return (
        <NumberFormatEditor
          format={config.format || "number"}
          decimals={config.decimals ?? 0}
          prefix={config.prefix}
          suffix={config.suffix}
          onChange={(updates) => onChange({ ...config, ...updates })}
        />
      );

    case "date":
    case "datetime":
      return (
        <DateFormatEditor
          dateFormat={config.dateFormat}
          onChange={(dateFormat) => onChange({ ...config, dateFormat })}
        />
      );

    default:
      return null;
  }
}

// =====================================================
// Select Options Editor
// =====================================================

interface SelectOptionsEditorProps {
  options: SelectOption[];
  onChange: (options: SelectOption[]) => void;
}

function SelectOptionsEditor({ options, onChange }: SelectOptionsEditorProps) {
  const [newOptionLabel, setNewOptionLabel] = useState("");

  const handleAddOption = () => {
    if (!newOptionLabel.trim()) return;

    const newOption: SelectOption = {
      id: crypto.randomUUID(),
      label: newOptionLabel.trim(),
      color: SELECT_OPTION_COLORS[options.length % SELECT_OPTION_COLORS.length],
    };

    onChange([...options, newOption]);
    setNewOptionLabel("");
  };

  const handleRemoveOption = (id: string) => {
    onChange(options.filter((opt) => opt.id !== id));
  };

  const handleUpdateOption = (id: string, updates: Partial<SelectOption>) => {
    onChange(
      options.map((opt) => (opt.id === id ? { ...opt, ...updates } : opt))
    );
  };

  return (
    <div className="space-y-3">
      <Label>Options</Label>

      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center gap-2 p-2 border rounded"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

            <div className="relative">
              <Input
                type="color"
                value={option.color}
                onChange={(e) =>
                  handleUpdateOption(option.id, { color: e.target.value })
                }
                className="w-8 h-8 p-0 border-0 cursor-pointer"
              />
            </div>

            <Input
              value={option.label}
              onChange={(e) =>
                handleUpdateOption(option.id, { label: e.target.value })
              }
              className="flex-1"
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveOption(option.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Add option..."
          value={newOptionLabel}
          onChange={(e) => setNewOptionLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddOption();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={handleAddOption}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// =====================================================
// Number Format Editor
// =====================================================

interface NumberFormatEditorProps {
  format: NumberFormat;
  decimals: number;
  prefix?: string;
  suffix?: string;
  onChange: (updates: Partial<ColumnConfig>) => void;
}

function NumberFormatEditor({
  format,
  decimals,
  prefix,
  suffix,
  onChange,
}: NumberFormatEditorProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Format</Label>
        <Select
          value={format}
          onValueChange={(value) => onChange({ format: value as NumberFormat })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="number">Number</SelectItem>
            <SelectItem value="currency">Currency</SelectItem>
            <SelectItem value="percent">Percent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Decimal Places</Label>
        <Select
          value={String(decimals)}
          onValueChange={(value) => onChange({ decimals: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0</SelectItem>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
            <SelectItem value="4">4</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {format === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Prefix</Label>
            <Input
              value={prefix || ""}
              onChange={(e) => onChange({ prefix: e.target.value })}
              placeholder="e.g., $"
            />
          </div>
          <div className="space-y-2">
            <Label>Suffix</Label>
            <Input
              value={suffix || ""}
              onChange={(e) => onChange({ suffix: e.target.value })}
              placeholder="e.g., kg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Date Format Editor
// =====================================================

interface DateFormatEditorProps {
  dateFormat?: string;
  onChange: (format: string) => void;
}

function DateFormatEditor({ dateFormat, onChange }: DateFormatEditorProps) {
  const formats = [
    { value: "MM/dd/yyyy", label: "MM/DD/YYYY (01/15/2024)" },
    { value: "dd/MM/yyyy", label: "DD/MM/YYYY (15/01/2024)" },
    { value: "yyyy-MM-dd", label: "YYYY-MM-DD (2024-01-15)" },
    { value: "MMM d, yyyy", label: "Jan 15, 2024" },
    { value: "MMMM d, yyyy", label: "January 15, 2024" },
    { value: "d MMM yyyy", label: "15 Jan 2024" },
  ];

  return (
    <div className="space-y-2">
      <Label>Date Format</Label>
      <Select
        value={dateFormat || "MMM d, yyyy"}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {formats.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
