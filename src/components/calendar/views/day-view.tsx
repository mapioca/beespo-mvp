"use client";

import {
  format,
  setHours,
  isToday,
  getHours,
  getMinutes,
} from "date-fns";
import { CalendarEvent } from "@/lib/calendar-helpers";
import { CalendarEventChip } from "../calendar-event-chip";
import { cn } from "@/lib/utils";

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: DayViewProps) {
  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayEvents = eventsByDate.get(dateKey) || [];
  const allDayEvents = dayEvents.filter((e) => e.isAllDay);
    dayEvents.filter((e) => !e.isAllDay);
    const isCurrentDay = isToday(currentDate);

  // Calculate current time indicator position
  const now = new Date();
  const currentHour = getHours(now);
  const currentMinute = getMinutes(now);
  const timeIndicatorTop = isCurrentDay
    ? (currentHour * 60 + currentMinute) / (24 * 60) * 100
    : -1;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={cn("p-4 border-b", isCurrentDay && "bg-primary/5")}>
        <div className="text-sm text-muted-foreground">
          {format(currentDate, "EEEE")}
        </div>
        <div className={cn("text-2xl font-bold", isCurrentDay && "text-primary")}>
          {format(currentDate, "MMMM d, yyyy")}
        </div>
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="p-3 border-b bg-muted/30">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            All-day events
          </div>
          <div className="space-y-1">
            {allDayEvents.map((event) => (
              <CalendarEventChip
                key={event.id}
                event={event}
                onClick={onEventClick}
              />
            ))}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto relative">
        {/* Current time indicator */}
        {timeIndicatorTop >= 0 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-red-500 z-10 pointer-events-none"
            style={{ top: `${timeIndicatorTop}%` }}
          >
            <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
          </div>
        )}

        {/* Hours */}
        <div className="divide-y">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="flex h-20 hover:bg-muted/30 cursor-pointer"
              onClick={() => onDateClick(setHours(currentDate, hour))}
            >
              {/* Time label */}
              <div className="w-20 p-2 text-sm text-muted-foreground text-right border-r flex-shrink-0">
                {format(setHours(new Date(), hour), "h a")}
              </div>
              {/* Event area */}
              <div className="flex-1 p-1">
                {/* We'd position timed events here based on their start time */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
