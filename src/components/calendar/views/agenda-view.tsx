"use client";

import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,

} from "date-fns";
import { CalendarEvent, EventSource } from "@/lib/calendar-helpers";
import { cn } from "@/lib/utils";
import { Repeat, MapPin, Calendar } from "lucide-react";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

function getAgendaAccent(source: EventSource): string {
  switch (source) {
    case "announcement":
      return "hsl(var(--chart-4))";
    case "meeting":
      return "hsl(var(--chart-2))";
    case "task":
      return "hsl(var(--chart-5))";
    case "event":
      return "hsl(var(--chart-1))";
    case "external":
      return "hsl(var(--chart-3))";
  }
}

export function AgendaView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: AgendaViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Filter days that have events
  const daysWithEvents = days.filter((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    return (eventsByDate.get(dateKey)?.length || 0) > 0;
  });

  if (daysWithEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-16">
        <Calendar className="h-16 w-16 mb-4 opacity-40" />
        <p className="text-lg font-medium">No events this month</p>
        <p className="text-sm mt-1">
          Click any date in the calendar to add an event
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {daysWithEvents.map((day) => {
        const dateKey = format(day, "yyyy-MM-dd");
        const dayEvents = eventsByDate.get(dateKey) || [];
        const isCurrentDay = isToday(day);

        return (
          <div key={dateKey}>
            <div
              className={cn(
                "flex items-center gap-4 pb-3 mb-3 border-b border-border/50 cursor-pointer group"
              )}
              onClick={() => onDateClick(day)}
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-colors",
                  isCurrentDay
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/30 group-hover:bg-accent"
                )}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">
                  {format(day, "EEE")}
                </span>
                <span className="text-2xl font-bold">{format(day, "d")}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{format(day, "EEEE")}</div>
                <div className="text-sm text-muted-foreground">
                  {format(day, "MMMM yyyy")}
                </div>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/40 px-3 py-1 rounded-full">
                {dayEvents.length} event{dayEvents.length !== 1 ? "s" : ""}
              </div>
            </div>

            <div className="space-y-3 pl-20">
              {dayEvents.map((event) => {
                const accentColor = event.color || getAgendaAccent(event.source);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-4 rounded-lg border-l-[3px] cursor-pointer transition-all duration-150 bg-background/80",
                      "hover:shadow-sm hover:translate-x-0.5 hover:bg-[hsl(var(--table-row-hover))]"
                    )}
                    style={{ borderLeftColor: accentColor }}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {event.isRecurringInstance && (
                            <Repeat className="h-4 w-4 flex-shrink-0 opacity-60" />
                          )}
                          <span className="font-semibold text-base">
                            {event.title}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        {event.location && (
                          <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize border border-border/60 bg-muted/30">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                          {event.source}
                        </span>
                        {event.priority && (
                          <span
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full font-medium capitalize",
                              "border border-border/60 bg-muted/30"
                            )}
                          >
                            {event.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
