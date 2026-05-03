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
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-border/30 bg-surface-raised">
      <div className="grid grid-cols-7 border-b border-border/30">
        {WEEKDAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80"
          >
            {name}
          </div>
        ))}
      </div>

      <div
        className="grid"
        style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(96px, 1fr))` }}
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
                    "group relative cursor-pointer overflow-hidden p-1.5 transition-colors",
                    "hover:bg-surface-hover/50",
                    !isCurrentMonth && "bg-surface-sunken/30",
                    dayIndex !== 6 && "border-r border-border/30"
                  )}
                  onClick={() => onDateClick(day)}
                >
                  {isCurrentDay && (
                    <span className="absolute inset-x-0 top-0 h-[2px] bg-brand" />
                  )}
                  <div className="mb-1.5 flex items-baseline gap-1.5">
                    <span
                      className={cn(
                        "text-[12px] tabular-nums leading-none",
                        isCurrentDay && "font-semibold text-brand",
                        !isCurrentDay && isCurrentMonth && "font-medium text-foreground",
                        !isCurrentMonth && "text-muted-foreground/50"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayIndex === 0 && (
                      <span className="text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/50">
                        {format(day, "MMM")}
                      </span>
                    )}
                  </div>

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
