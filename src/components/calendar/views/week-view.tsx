"use client";

import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  getHours,
  setHours,

} from "date-fns";
import { CalendarEvent } from "@/lib/calendar-helpers";
import { CalendarEventChip } from "../calendar-event-chip";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({
  currentDate, eventsByDate,
  onDateClick,
  onEventClick,
}: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Get all-day events (announcements, tasks without specific time)
  const getAllDayEvents = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayEvents = eventsByDate.get(dateKey) || [];
    return dayEvents.filter((e) => e.isAllDay);
  };

  // Get timed events (meetings with specific times)
  const getTimedEvents = (date: Date): CalendarEvent[] => {
    const dateKey = format(date, "yyyy-MM-dd");
    const dayEvents = eventsByDate.get(dateKey) || [];
    return dayEvents.filter((e) => !e.isAllDay);
  };

  // Get events for a specific hour
  const getEventsAtHour = (date: Date, hour: number): CalendarEvent[] => {
    const timedEvents = getTimedEvents(date);
    return timedEvents.filter((e) => getHours(e.startDate) === hour);
  };

  // Calculate max all-day events for dynamic row height
  const maxAllDayEvents = Math.max(
    ...days.map((day) => getAllDayEvents(day).length),
    0
  );
  const allDayRowHeight = maxAllDayEvents > 0
    ? Math.max(40, Math.min(maxAllDayEvents * 22 + 12, 92))
    : 40;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#141516] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-white/[0.08] bg-[#151617]">
        {/* Time column header */}
        <div className="border-r border-white/[0.08]">

        </div>
        {/* Day headers */}
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={cn(
                "min-h-[56px] cursor-pointer border-r border-white/[0.08] px-2 py-2.5 text-center transition-colors last:border-r-0 hover:bg-white/[0.025]",
                isCurrentDay && "bg-brand/[0.04]"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className="text-[9px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "mt-1.5 text-[20px] font-semibold leading-none tracking-tight",
                  isCurrentDay
                    ? "mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground"
                    : "text-zinc-200"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row - only shows if there are all-day events */}
      <div
        className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-white/[0.08] bg-[#141516]"
        style={{ minHeight: `${allDayRowHeight}px` }}
      >
        <div className="flex items-start justify-end border-r border-white/[0.08] px-3 pt-2.5 text-[10px] font-medium text-zinc-600">
          All day
        </div>
        {days.map((day) => {
          const allDayEvents = getAllDayEvents(day);
          const isCurrentDay = isToday(day);
          return (
            <div
              key={`allday-${format(day, "yyyy-MM-dd")}`}
              className={cn(
                "cursor-pointer space-y-1 overflow-y-auto border-r border-white/[0.08] p-1.5 transition-colors last:border-r-0 hover:bg-white/[0.025]",
                isCurrentDay && "bg-brand/[0.025]"
              )}
              onClick={() => onDateClick(day)}
            >
              {allDayEvents.slice(0, 3).map((event) => (
                <CalendarEventChip
                  key={event.id}
                  event={event}
                  onClick={onEventClick}
                  compact
                />
              ))}
              {allDayEvents.length > 3 && (
                <div className="px-2 text-[11px] text-zinc-600">
                  +{allDayEvents.length - 3} more
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))]">
          {/* Hours */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="h-12 border-r border-b border-white/[0.08] px-3 py-2 text-right text-[10px] font-medium text-zinc-600">
                {format(setHours(new Date(), hour), "h a").toLowerCase()}
              </div>
              {/* Day cells for this hour */}
              {days.map((day) => {
                const isCurrentDay = isToday(day);
                const hourEvents = getEventsAtHour(day, hour);
                return (
                  <div
                    key={`${format(day, "yyyy-MM-dd")}-${hour}`}
                    className={cn(
                      "h-12 cursor-pointer overflow-hidden border-r border-b border-white/[0.08] p-1 transition-colors last:border-r-0 hover:bg-white/[0.025]",
                      isCurrentDay && "bg-brand/[0.02]"
                    )}
                    onClick={() => onDateClick(setHours(day, hour))}
                  >
                    {hourEvents.map((event) => (
                      <CalendarEventChip
                        key={event.id}
                        event={event}
                        onClick={onEventClick}
                        compact
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
