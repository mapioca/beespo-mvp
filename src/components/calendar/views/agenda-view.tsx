"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isToday,
} from "date-fns";
import { CalendarEvent, EventSource } from "@/lib/calendar-helpers";
import { cn } from "@/lib/utils";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function getAccent(source: EventSource, customColor?: string): string {
  if (customColor) return customColor;
  if (source === "external") return "#8b5cf6";
  return "hsl(var(--brand))";
}

export function AgendaView({
  currentDate,
  eventsByDate,
  onEventClick,
}: AgendaViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const daysWithEvents = days.filter((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    return (eventsByDate.get(dateKey)?.length || 0) > 0;
  });

  if (daysWithEvents.length === 0) {
    return (
      <div className="rounded-[10px] border border-border/30 bg-surface-raised px-6 py-20 text-center">
        <p className="text-[14px] text-foreground">Nothing on the books this month.</p>
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">
          Pick a date in the calendar to add an event.
        </p>
      </div>
    );
  }

  // Group days by week (week containing the day)
  const weekMap = new Map<string, Date[]>();
  for (const day of daysWithEvents) {
    const weekKey = format(startOfWeek(day, { weekStartsOn: 0 }), "yyyy-MM-dd");
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
    weekMap.get(weekKey)!.push(day);
  }
  const weeks = Array.from(weekMap.entries());

  return (
    <div className="rounded-[10px] border border-border/30 bg-surface-raised">
      {weeks.map(([weekKey, weekDays], wi) => {
        const weekStart = startOfWeek(weekDays[0], { weekStartsOn: 0 });
        const weekEnd = endOfWeek(weekDays[0], { weekStartsOn: 0 });
        const label =
          format(weekStart, "MMM d") + " – " + format(weekEnd, "MMM d");

        return (
          <div key={weekKey}>
            {/* Week header */}
            <div
              className={cn(
                "border-b border-border/30 bg-surface-sunken/40 px-5 py-2 sm:px-6",
                wi > 0 && "border-t border-border/30"
              )}
            >
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {label}
              </span>
            </div>

            <ol className="divide-y divide-border/30">
              {weekDays.map((day) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(dateKey) || [];
                const isCurrentDay = isToday(day);

                return (
                  <li
                    key={dateKey}
                    className="grid grid-cols-[100px_minmax(0,1fr)] gap-6 px-5 py-4 sm:px-6"
                  >
                    <div className="pt-0.5">
                      <div
                        className={cn(
                          "text-[10px] font-semibold uppercase tracking-[0.18em]",
                          isCurrentDay ? "text-brand" : "text-muted-foreground/80"
                        )}
                      >
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "mt-1 text-[22px] leading-none tabular-nums",
                          isCurrentDay ? "font-semibold text-brand" : "font-medium text-foreground"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="mt-1 text-[10.5px] text-muted-foreground/70">
                        {format(day, "MMM")}
                      </div>
                    </div>

                    <ul className="space-y-px">
                      {dayEvents.map((event) => {
                        const accent = getAccent(event.source, event.color);
                        return (
                          <li key={event.id}>
                            <button
                              type="button"
                              onClick={() => onEventClick(event)}
                              className="group grid w-full grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-[6px] px-2 py-1.5 text-left transition-colors hover:bg-surface-hover/50"
                            >
                              <span className="text-[11.5px] tabular-nums text-muted-foreground">
                                {event.isAllDay
                                  ? "All day"
                                  : format(event.startDate, "h:mm a").toLowerCase()}
                              </span>
                              <span className="flex min-w-0 items-center gap-2">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: accent }}
                                />
                                <span className="truncate text-[13px] font-medium text-foreground">
                                  {event.title}
                                </span>
                              </span>
                              {event.location ? (
                                <span className="max-w-[180px] truncate text-[11.5px] text-muted-foreground">
                                  {event.location}
                                </span>
                              ) : (
                                <span />
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
