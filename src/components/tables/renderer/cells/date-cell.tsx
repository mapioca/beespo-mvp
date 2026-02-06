"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateCellProps {
  value: string | null;
  includeTime: boolean;
  isEditing: boolean;
  onSave: (value: string | null) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function DateCell({
  value,
  includeTime,
  isEditing,
  onSave,
  onKeyDown,
}: DateCellProps) {
  const [open, setOpen] = useState(false);
  const [timeValue, setTimeValue] = useState("12:00");

  useEffect(() => {
    if (isEditing) {
      setOpen(true);
    }
  }, [isEditing]);

  useEffect(() => {
    if (value && includeTime) {
      try {
        const date = parseISO(value);
        setTimeValue(format(date, "HH:mm"));
      } catch {
        // Invalid date
      }
    }
  }, [value, includeTime]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onSave(null);
      setOpen(false);
      return;
    }

    if (includeTime) {
      const [hours, minutes] = timeValue.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      onSave(date.toISOString());
    } else {
      onSave(date.toISOString().split("T")[0]);
    }
    setOpen(false);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTimeValue(e.target.value);
    if (value) {
      const date = parseISO(value);
      const [hours, minutes] = e.target.value.split(":").map(Number);
      date.setHours(hours, minutes, 0, 0);
      onSave(date.toISOString());
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(null);
    setOpen(false);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "";
    try {
      const date = parseISO(dateStr);
      if (includeTime) {
        return format(date, "MMM d, yyyy h:mm a");
      }
      return format(date, "MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const parsedDate = value ? parseISO(value) : undefined;

  const content = (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 min-h-[32px] cursor-text text-sm",
        !value && "text-muted-foreground"
      )}
    >
      <span>{value ? formatDate(value) : "Empty"}</span>
      {value && isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
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
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
          {includeTime && (
            <div className="p-3 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Time:</span>
                <Input
                  type="time"
                  value={timeValue}
                  onChange={handleTimeChange}
                  className="w-auto"
                />
              </div>
            </div>
          )}
          <div className="p-3 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={handleClear}
            >
              <X className="h-4 w-4 mr-2" />
              Clear date
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return content;
}
