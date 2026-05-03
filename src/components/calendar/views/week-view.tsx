"use client";

import { useEffect, useRef } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isToday,
  isSameDay,
  getHours,
  getMinutes,
  setHours,
} from "date-fns";
import { CalendarEvent } from "@/lib/calendar-helpers";
import { CalendarEventChip } from "../calendar-event-chip";
import { cn } from "@/lib/utils";

function getAccentColor(event: CalendarEvent): string {
  if (event.color) return event.color;
  if (event.source === "external") return "#8b5cf6";
  return "hsl(var(--brand))";
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOUR_HEIGHT = 72;
const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);
const SCROLL_TO_HOUR = 7;

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  col: number;
  cols: number;
}

function layoutDayEvents(
  events: CalendarEvent[],
  firstHour: number,
  lastHour: number,
  hourHeight: number
): PositionedEvent[] {
  const items = events
    .filter((e) => {
      const h = getHours(e.startDate);
      return h >= firstHour && h <= lastHour;
    })
    .map((event) => {
      const startMin = getHours(event.startDate) * 60 + getMinutes(event.startDate);
      const durationMins = event.endDate
        ? Math.max(30, (event.endDate.getTime() - event.startDate.getTime()) / 60000)
        : 60;
      return { event, start: startMin, end: startMin + durationMins };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: PositionedEvent[] = [];
  let cluster: typeof items = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    const cols: (typeof items)[] = [];
    const placement = new Map<typeof items[number], number>();
    for (const it of cluster) {
      let placed = false;
      for (let i = 0; i < cols.length; i++) {
        const last = cols[i][cols[i].length - 1];
        if (last.end <= it.start) {
          cols[i].push(it);
          placement.set(it, i);
          placed = true;
          break;
        }
      }
      if (!placed) {
        cols.push([it]);
        placement.set(it, cols.length - 1);
      }
    }
    const total = cols.length;
    for (const it of cluster) {
      const top = ((it.start - firstHour * 60) / 60) * hourHeight;
      const height = Math.max(32, ((it.end - it.start) / 60) * hourHeight - 2);
      result.push({
        event: it.event,
        top,
        height,
        col: placement.get(it) ?? 0,
        cols: total,
      });
    }
  };

  for (const it of items) {
    if (cluster.length === 0 || it.start < clusterEnd) {
      cluster.push(it);
      clusterEnd = Math.max(clusterEnd, it.end);
    } else {
      flush();
      cluster = [it];
      clusterEnd = it.end;
    }
  }
  if (cluster.length) flush();

  return result;
}

export function WeekView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: WeekViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = ALL_HOURS;
  const firstHour = 0;
  const lastHour = 23;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_HEIGHT;
    }
  }, []);

  const getAllDayEvents = (date: Date) =>
    (eventsByDate.get(format(date, "yyyy-MM-dd")) || []).filter((e) => e.isAllDay);
  const getTimedEvents = (date: Date) =>
    (eventsByDate.get(format(date, "yyyy-MM-dd")) || []).filter((e) => !e.isAllDay);
  const hasAnyAllDay = days.some((day) => getAllDayEvents(day).length > 0);

  const now = new Date();
  const todayInWeek = days.some((day) => isSameDay(day, now));
  const nowHour = getHours(now);
  const nowMinute = getMinutes(now);
  const nowVisible = todayInWeek;
  const nowTop = (nowHour + nowMinute / 60) * HOUR_HEIGHT;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border/60 bg-surface-raised">
      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border/60">
        <div />
        {days.map((day, i) => {
          const isCurrentDay = isToday(day);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDateClick(day)}
              className={cn(
                "group relative flex h-14 flex-col items-start justify-center border-l border-border/50 px-3 text-left transition-colors hover:bg-surface-hover/50",
                i === 0 && "border-l-0"
              )}
            >
              {isCurrentDay && (
                <span className="absolute inset-x-0 top-0 h-[2px] bg-brand" />
              )}
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-[0.18em]",
                  isCurrentDay ? "text-brand" : "text-muted-foreground/80"
                )}
              >
                {format(day, "EEE")}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-[18px] tabular-nums leading-none",
                  isCurrentDay ? "font-semibold text-brand" : "font-medium text-foreground"
                )}
              >
                {format(day, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* All-day strip */}
      {hasAnyAllDay && (
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-border/50">
          <div className="flex items-start justify-end px-2 pt-2 text-[9.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground/60">
            All day
          </div>
          {days.map((day, i) => {
            const items = getAllDayEvents(day);
            return (
              <div
                key={`allday-${day.toISOString()}`}
                className={cn(
                  "min-h-[28px] space-y-0.5 border-l border-border/40 px-1 py-1",
                  i === 0 && "border-l-0"
                )}
              >
                {items.slice(0, 2).map((event) => (
                  <CalendarEventChip key={event.id} event={event} onClick={onEventClick} compact />
                ))}
                {items.length > 2 && (
                  <div className="px-1 text-[10px] font-medium text-muted-foreground">
                    +{items.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Time grid */}
      <div ref={scrollRef} className="relative overflow-y-auto" style={{ height: 600 }}>
        <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
        {/* Hour labels */}
        <div className="relative">
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="relative flex justify-end pr-2 text-[10.5px] font-medium tabular-nums text-muted-foreground/70"
              style={{ height: HOUR_HEIGHT }}
            >
              {i === 0 ? null : (
                <span className="-translate-y-1.5 leading-none">
                  {format(setHours(new Date(), hour), "h a").toLowerCase()}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIndex) => {
          const isCurrentDay = isToday(day);
          const timed = getTimedEvents(day);
          return (
            <div
              key={`col-${day.toISOString()}`}
              className={cn(
                "relative border-l border-border/40",
                dayIndex === 0 && "border-l-0"
              )}
            >
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="relative cursor-pointer border-b border-border/30 transition-colors hover:bg-surface-hover/40"
                  style={{ height: HOUR_HEIGHT }}
                  onClick={() => onDateClick(setHours(day, hour))}
                />
              ))}

              {/* Positioned events with overlap-aware columns */}
              <div className="pointer-events-none absolute inset-0 px-[3px]">
                {layoutDayEvents(timed, firstHour, lastHour, HOUR_HEIGHT).map((p) => {
                  const widthPct = 100 / p.cols;
                  const leftPct = p.col * widthPct;
                  const accent = getAccentColor(p.event);
                  const timeLabel = p.event.endDate
                    ? `${format(p.event.startDate, "h:mm")}–${format(p.event.endDate, "h:mm a").toLowerCase()}`
                    : format(p.event.startDate, "h:mm a").toLowerCase();
                  return (
                    <button
                      key={p.event.id}
                      type="button"
                      onClick={() => onEventClick(p.event)}
                      className="pointer-events-auto absolute flex flex-col items-start overflow-hidden rounded-[5px] px-2 py-1 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/50"
                      style={{
                        top: p.top,
                        height: p.height,
                        left: `${leftPct}%`,
                        width: `calc(${widthPct}% - 2px)`,
                        backgroundColor: `color-mix(in srgb, ${accent} 14%, transparent)`,
                        boxShadow: `inset 2px 0 0 ${accent}`,
                      }}
                    >
                      <p className="truncate text-[11.5px] font-semibold leading-tight text-foreground">
                        {p.event.title}
                      </p>
                      {p.event.location && p.height >= 52 && (
                        <p className="truncate text-[10.5px] leading-tight text-muted-foreground">
                          {p.event.location}
                        </p>
                      )}
                      {p.height >= 36 && (
                        <p className="mt-0.5 truncate text-[10.5px] tabular-nums text-muted-foreground">
                          {timeLabel}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Now line */}
              {isCurrentDay && nowVisible && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="-ml-[3px] h-1.5 w-1.5 rounded-full bg-brand" />
                  <span className="h-px flex-1 bg-brand" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
