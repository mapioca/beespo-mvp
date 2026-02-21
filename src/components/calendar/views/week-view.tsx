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

import { useTranslations, useLocale } from "next-intl";
import { es, enUS } from "date-fns/locale";

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
  const t = useTranslations("Calendar");
  const locale = useLocale();
  const dateLocale = locale === "es" ? es : enUS;

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
    ? Math.max(50, Math.min(maxAllDayEvents * 28 + 16, 120))
    : 0;

  return (
    <div className="flex flex-col h-full rounded-lg border border-border/50 overflow-hidden">
      {/* Header with day names and dates */}
      <div className="grid grid-cols-8 border-b border-border/50 bg-muted/30">
        {/* Time column header */}
        <div className="p-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-r border-border/50">

        </div>
        {/* Day headers */}
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          return (
            <div
              key={format(day, "yyyy-MM-dd")}
              className={cn(
                "p-2 text-center border-r border-border/50 last:border-r-0 cursor-pointer hover:bg-muted/50",
                isCurrentDay && "bg-primary/5"
              )}
              onClick={() => onDateClick(day)}
            >
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {format(day, "EEE", { locale: dateLocale })}
              </div>
              <div
                className={cn(
                  "text-xl font-bold mt-0.5",
                  isCurrentDay
                    ? "w-8 h-8 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day events row - only shows if there are all-day events */}
      {allDayRowHeight > 0 && (
        <div
          className="grid grid-cols-8 border-b border-border/50"
          style={{ minHeight: `${allDayRowHeight}px` }}
        >
          <div className="p-2 text-xs text-muted-foreground border-r border-border/50 flex items-start justify-center pt-2">
            {t("allDay")}
          </div>
          {days.map((day) => {
            const allDayEvents = getAllDayEvents(day);
            const isCurrentDay = isToday(day);
            return (
              <div
                key={`allday-${format(day, "yyyy-MM-dd")}`}
                className={cn(
                  "p-1 border-r border-border/50 last:border-r-0 space-y-0.5 cursor-pointer hover:bg-muted/40 overflow-y-auto",
                  isCurrentDay && "bg-primary/5"
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
                  <div className="text-xs text-muted-foreground text-center py-0.5">
                    {t("more", { count: allDayEvents.length - 3 })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-8">
          {/* Hours */}
          {HOURS.map((hour) => (
            <div key={hour} className="contents">
              {/* Time label */}
              <div className="p-2 text-xs text-muted-foreground text-right border-r border-b border-border/30 h-14">
                {format(setHours(new Date(), hour), "h a", { locale: dateLocale })}
              </div>
              {/* Day cells for this hour */}
              {days.map((day) => {
                const isCurrentDay = isToday(day);
                const hourEvents = getEventsAtHour(day, hour);
                return (
                  <div
                    key={`${format(day, "yyyy-MM-dd")}-${hour}`}
                    className={cn(
                      "border-r border-b border-border/30 last:border-r-0 h-14 cursor-pointer hover:bg-muted/30 p-0.5 overflow-hidden",
                      isCurrentDay && "bg-primary/5"
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

