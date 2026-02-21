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

import { useTranslations } from "next-intl";

interface RecurrencePickerProps {
  recurrenceType: RecurrenceType;
  recurrenceEndDate: string;
  recurrenceConfig: RecurrenceConfig;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceEndDateChange: (date: string) => void;
  onRecurrenceConfigChange: (config: RecurrenceConfig) => void;
  disabled?: boolean;
}

export function RecurrencePicker({
  recurrenceType,
  recurrenceEndDate,
  recurrenceConfig,
  onRecurrenceTypeChange,
  onRecurrenceEndDateChange,
  onRecurrenceConfigChange,
  disabled = false,
}: RecurrencePickerProps) {
  const t = useTranslations("Calendar.Recurrence");

  const daysOfWeek = [
    { value: 0, label: t("daySun") },
    { value: 1, label: t("dayMon") },
    { value: 2, label: t("dayTue") },
    { value: 3, label: t("dayWed") },
    { value: 4, label: t("dayThu") },
    { value: 5, label: t("dayFri") },
    { value: 6, label: t("daySat") },
  ];

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
        <Label htmlFor="recurrence">{t("label")}</Label>
        <Select
          value={recurrenceType}
          onValueChange={(v) => onRecurrenceTypeChange(v as RecurrenceType)}
          disabled={disabled}
        >
          <SelectTrigger id="recurrence">
            <SelectValue placeholder={t("none")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("none")}</SelectItem>
            <SelectItem value="daily">{t("daily")}</SelectItem>
            <SelectItem value="weekly">{t("weekly")}</SelectItem>
            <SelectItem value="biweekly">{t("biweekly")}</SelectItem>
            <SelectItem value="monthly">{t("monthly")}</SelectItem>
            <SelectItem value="yearly">{t("yearly")}</SelectItem>
            <SelectItem value="custom">{t("custom")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Custom recurrence options */}
      {recurrenceType === "custom" && (
        <div className="space-y-4 p-4 border rounded-md bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {t("customDaysLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => {
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
          <Label htmlFor="interval">{t("repeatEvery")}</Label>
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
              {recurrenceType === "daily" && t("days")}
              {recurrenceType === "weekly" && t("weeks")}
              {recurrenceType === "monthly" && t("months")}
              {recurrenceType === "yearly" && t("years")}
            </span>
          </div>
        </div>
      )}

      {/* Recurrence End Date */}
      {recurrenceType !== "none" && (
        <div className="space-y-2">
          <Label htmlFor="recurrenceEnd">{t("endLabel")}</Label>
          <Input
            id="recurrenceEnd"
            type="date"
            value={recurrenceEndDate}
            onChange={(e) => onRecurrenceEndDateChange(e.target.value)}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            {t("noEndHint")}
          </p>
        </div>
      )}
    </div>
  );
}

