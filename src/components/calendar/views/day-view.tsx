"use client";

import { useEffect, useRef } from "react";
import {
  format,
  setHours,
  isToday,
  getHours,
  getMinutes,
} from "date-fns";
import { CalendarEvent } from "@/lib/calendar-helpers";
import { CalendarEventChip } from "../calendar-event-chip";

interface DayViewProps {
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
        ? Math.max(20, (event.endDate.getTime() - event.startDate.getTime()) / 60000)
        : 45;
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
      const height = Math.max(28, ((it.end - it.start) / 60) * hourHeight - 2);
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

export function DayView({
  currentDate,
  eventsByDate,
  onDateClick,
  onEventClick,
}: DayViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const dateKey = format(currentDate, "yyyy-MM-dd");
  const dayEvents = eventsByDate.get(dateKey) || [];
  const allDay = dayEvents.filter((e) => e.isAllDay);
  const timed = dayEvents.filter((e) => !e.isAllDay);
  const isCurrentDay = isToday(currentDate);
  const hours = ALL_HOURS;
  const firstHour = 0;
  const lastHour = 23;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SCROLL_TO_HOUR * HOUR_HEIGHT;
    }
  }, []);

  const now = new Date();
  const nowHour = getHours(now);
  const nowMinute = getMinutes(now);
  const nowVisible = isCurrentDay;
  const nowTop = (nowHour + nowMinute / 60) * HOUR_HEIGHT;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border/60 bg-surface-raised">
      {allDay.length > 0 && (
        <div className="border-b border-border/50 px-4 py-2.5">
          <div className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
            All day
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allDay.map((event) => (
              <div key={event.id} className="max-w-[280px]">
                <CalendarEventChip event={event} onClick={onEventClick} compact />
              </div>
            ))}
          </div>
        </div>
      )}

      <div ref={scrollRef} className="overflow-y-auto" style={{ height: 600 }}>
        <div className="relative grid grid-cols-[72px_minmax(0,1fr)]">
        <div className="relative">
          {hours.map((hour, i) => (
            <div
              key={hour}
              className="flex justify-end pr-3 text-[10.5px] font-medium tabular-nums text-muted-foreground/70"
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

        <div className="relative border-l border-border/40">
          {hours.map((hour) => (
            <div
              key={hour}
              className="relative cursor-pointer border-b border-border/30 transition-colors hover:bg-surface-hover/40"
              style={{ height: HOUR_HEIGHT }}
              onClick={() => onDateClick(setHours(currentDate, hour))}
            />
          ))}

          <div className="pointer-events-none absolute inset-0 px-2">
            {layoutDayEvents(timed, firstHour, lastHour, HOUR_HEIGHT).map((p) => {
              const widthPct = 100 / p.cols;
              const leftPct = p.col * widthPct;
              return (
                <div
                  key={p.event.id}
                  className="pointer-events-auto absolute"
                  style={{
                    top: p.top,
                    height: p.height,
                    left: `${leftPct}%`,
                    width: `calc(${widthPct}% - 3px)`,
                  }}
                >
                  <CalendarEventChip event={p.event} onClick={onEventClick} showTime />
                </div>
              );
            })}
          </div>

          {nowVisible && (
            <div
              className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
              style={{ top: nowTop }}
            >
              <span className="-ml-[3px] h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="h-px flex-1 bg-brand" />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
