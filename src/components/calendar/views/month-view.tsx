"use client";

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { CalendarEvent } from "@/lib/calendar-helpers";
import { CalendarEventList } from "../calendar-event-chip";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: MonthViewProps) {
  // Get all days to display (including days from adjacent months)
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Calculate number of rows needed (typically 5 or 6)
  const numWeeks = weeks.length;

  return (
    <div className="flex flex-col h-full rounded-lg border border-border/50 overflow-hidden">
      {/* Weekday header - Notion style */}
      <div className="grid grid-cols-7 border-b border-border/50 bg-muted/30">
        {WEEKDAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid - Clean Notion aesthetic */}
      <div
        className="flex-1 grid"
        style={{
          gridTemplateRows: `repeat(${numWeeks}, minmax(100px, 1fr))`,
        }}
      >
        {weeks.map((week, weekIndex) => (
          <div
            key={weekIndex}
            className={cn(
              "grid grid-cols-7",
              weekIndex !== weeks.length - 1 && "border-b border-border/30"
            )}
          >
            {week.map((day, dayIndex) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "p-2 cursor-pointer transition-colors overflow-hidden",
                    "hover:bg-muted/40",
                    !isCurrentMonth && "bg-muted/10",
                    dayIndex !== 6 && "border-r border-border/30"
                  )}
                  onClick={() => onDateClick(day)}
                >
                  {/* Day number - Notion style */}
                  <div className="flex items-center justify-start mb-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-7 h-7 text-sm rounded-full transition-colors",
                        isCurrentDay
                          ? "bg-primary text-primary-foreground font-bold"
                          : isCurrentMonth
                            ? "font-medium text-foreground hover:bg-muted"
                            : "text-muted-foreground/60"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  {/* Events */}
                  <CalendarEventList
                    events={dayEvents}
                    onClick={onEventClick}
                    maxVisible={3}
                    compact
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
