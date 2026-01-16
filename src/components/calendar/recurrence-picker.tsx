"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RecurrenceType, RecurrenceConfig } from "@/types/database";
import { cn } from "@/lib/utils";

interface RecurrencePickerProps {
  recurrenceType: RecurrenceType;
  recurrenceEndDate: string;
  recurrenceConfig: RecurrenceConfig;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceEndDateChange: (date: string) => void;
  onRecurrenceConfigChange: (config: RecurrenceConfig) => void;
  disabled?: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function RecurrencePicker({
  recurrenceType,
  recurrenceEndDate,
  recurrenceConfig,
  onRecurrenceTypeChange,
  onRecurrenceEndDateChange,
  onRecurrenceConfigChange,
  disabled = false,
}: RecurrencePickerProps) {
  const handleDayToggle = (day: number) => {
    const currentDays = recurrenceConfig.daysOfWeek || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter((d) => d !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    onRecurrenceConfigChange({ ...recurrenceConfig, daysOfWeek: newDays });
  };

  const handleIntervalChange = (value: string) => {
    const interval = parseInt(value, 10);
    if (!isNaN(interval) && interval > 0) {
      onRecurrenceConfigChange({ ...recurrenceConfig, interval });
    }
  };

  return (
    <div className="space-y-4">
      {/* Recurrence Type */}
      <div className="space-y-2">
        <Label htmlFor="recurrence">Repeat</Label>
        <Select
          value={recurrenceType}
          onValueChange={(v) => onRecurrenceTypeChange(v as RecurrenceType)}
          disabled={disabled}
        >
          <SelectTrigger id="recurrence">
            <SelectValue placeholder="Does not repeat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Does not repeat</SelectItem>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="biweekly">Every 2 weeks</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
            <SelectItem value="custom">Custom...</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom recurrence options */}
      {recurrenceType === "custom" && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground">
            Select which days of the week this event repeats:
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = recurrenceConfig.daysOfWeek?.includes(day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  disabled={disabled}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md border transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Interval (for daily, weekly, monthly) */}
      {recurrenceType !== "none" && recurrenceType !== "biweekly" && recurrenceType !== "custom" && (
        <div className="space-y-2">
          <Label htmlFor="interval">Repeat every</Label>
          <div className="flex items-center gap-2">
            <Input
              id="interval"
              type="number"
              min={1}
              max={99}
              value={recurrenceConfig.interval || 1}
              onChange={(e) => handleIntervalChange(e.target.value)}
              disabled={disabled}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {recurrenceType === "daily" && "day(s)"}
              {recurrenceType === "weekly" && "week(s)"}
              {recurrenceType === "monthly" && "month(s)"}
              {recurrenceType === "yearly" && "year(s)"}
            </span>
          </div>
        </div>
      )}

      {/* Recurrence End Date */}
      {recurrenceType !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="recurrenceEnd">End recurrence</Label>
          <Input
            id="recurrenceEnd"
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to continue until the deadline (if set) or indefinitely
          </p>
        </div>
      )}
    </div>
  );
}
