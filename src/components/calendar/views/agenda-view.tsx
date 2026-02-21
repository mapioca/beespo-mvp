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

import { useTranslations, useLocale } from "next-intl";
import { es, enUS } from "date-fns/locale";

interface AgendaViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

// Notion-inspired color schemes
function getNotionAgendaColors(source: EventSource): {
  border: string;
  bg: string;
  text: string;
} {
  switch (source) {
    case "announcement":
      return {
        border: "border-l-amber-400",
        bg: "bg-amber-50/80 dark:bg-amber-950/30",
        text: "text-amber-900 dark:text-amber-100",
      };
    case "meeting":
      return {
        border: "border-l-blue-400",
        bg: "bg-blue-50/80 dark:bg-blue-950/30",
        text: "text-blue-900 dark:text-blue-100",
      };
    case "task":
      return {
        border: "border-l-green-400",
        bg: "bg-green-50/80 dark:bg-green-950/30",
        text: "text-green-900 dark:text-green-100",
      };
    case "event":
      return {
        border: "border-l-indigo-400",
        bg: "bg-indigo-50/80 dark:bg-indigo-950/30",
        text: "text-indigo-900 dark:text-indigo-100",
      };
    case "external":
      return {
        border: "border-l-purple-400",
        bg: "bg-purple-50/80 dark:bg-purple-950/30",
        text: "text-purple-900 dark:text-purple-100",
      };
  }
}

export function AgendaView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: AgendaViewProps) {
  const t = useTranslations("Calendar");
  const tSource = useTranslations("Calendar.Sources");
  const tPriority = useTranslations("Calendar.Priorities");
  const locale = useLocale();
  const dateLocale = locale === "es" ? es : enUS;

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
        <p className="text-lg font-medium">{t("noEvents")}</p>
        <p className="text-sm mt-1">
          {t("clickToAdd")}
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
            {/* Date header - Notion style */}
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
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-muted/50 group-hover:bg-muted"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {format(day, "EEE", { locale: dateLocale })}
                </span>
                <span className="text-2xl font-bold">{format(day, "d")}</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-lg">{format(day, "EEEE", { locale: dateLocale })}</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wide">
                  {format(day, "MMMM yyyy", { locale: dateLocale })}
                </div>
              </div>
              <div className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                {t("eventsCount", { count: dayEvents.length })}
              </div>
            </div>

            {/* Events list - Notion style cards */}
            <div className="space-y-3 pl-20">
              {dayEvents.map((event) => {
                const colors = getNotionAgendaColors(event.source);
                return (
                  <div
                    key={event.id}
                    className={cn(
                      "p-4 rounded-lg border-l-[3px] cursor-pointer transition-all duration-150",
                      "hover:shadow-md hover:translate-x-1",
                      colors.border,
                      colors.bg
                    )}
                    style={event.color ? { borderLeftColor: event.color } : undefined}
                    onClick={() => onEventClick(event)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {event.isRecurringInstance && (
                            <Repeat className="h-4 w-4 flex-shrink-0 opacity-60" />
                          )}
                          <span className={cn("font-semibold text-base", colors.text)}>
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
                        <span className={cn(
                          "text-xs px-2.5 py-1 rounded-full font-medium capitalize",
                          colors.bg,
                          colors.text
                        )}>
                          {tSource(event.source)}
                        </span>
                        {event.priority && (
                          <span
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full font-medium capitalize",
                              event.priority === "high" &&
                              "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
                              event.priority === "medium" &&
                              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200",
                              event.priority === "low" &&
                              "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                            )}
                          >
                            {tPriority(event.priority)}
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

