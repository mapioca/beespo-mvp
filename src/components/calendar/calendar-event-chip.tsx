"use client";

import type React from "react";
import { format } from "date-fns";
import { CalendarEvent, EventSource } from "@/lib/calendar-helpers";
import { cn } from "@/lib/utils";

interface CalendarEventChipProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  compact?: boolean;
  showTime?: boolean;
}

function getSourceAccent(source: EventSource, customColor?: string): string {
  if (customColor) return customColor;
  // Internal sources (meeting + event) all roll up to brand — they are "My Calendar"
  if (source === "external") return "#8b5cf6";
  return "hsl(var(--brand))";
}

export function CalendarEventChip({
  event,
  onClick,
  compact = false,
  showTime = false,
}: CalendarEventChipProps) {
  const accent = getSourceAccent(event.source, event.color);
  const style = {
    "--accent": accent,
    backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
  } as React.CSSProperties;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      style={style}
      className={cn(
        "group flex w-full min-w-0 items-center gap-1 overflow-hidden text-left text-foreground transition-colors",
        "hover:[background-color:color-mix(in_srgb,var(--accent)_18%,transparent)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand/50",
        compact
          ? "rounded-full px-1.5 py-px text-[10.5px] leading-[1.6]"
          : "rounded-full px-2 py-1 text-[12px] leading-snug"
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: accent }}
      />
      <div className="flex min-w-0 items-baseline gap-1">
        {showTime && !event.isAllDay && (
          <span className="shrink-0 text-[10px] font-medium tabular-nums text-muted-foreground">
            {format(event.startDate, "h:mm").toLowerCase()}
          </span>
        )}
        <span className="truncate font-medium">{event.title}</span>
      </div>
    </button>
  );
}

interface CalendarEventListProps {
  events: CalendarEvent[];
  onClick: (event: CalendarEvent) => void;
  maxVisible?: number;
  compact?: boolean;
  showTime?: boolean;
}

export function CalendarEventList({
  events,
  onClick,
  maxVisible = 3,
  compact = false,
  showTime = false,
}: CalendarEventListProps) {
  const visibleEvents = events.slice(0, maxVisible);
  const hiddenCount = events.length - maxVisible;

  return (
    <div className={cn("space-y-0.5", !compact && "space-y-1")}>
      {visibleEvents.map((event) => (
        <CalendarEventChip
          key={event.id}
          event={event}
          onClick={onClick}
          compact={compact}
          showTime={showTime}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="px-1 pt-0.5 text-[10.5px] font-medium text-muted-foreground">
          +{hiddenCount} more
        </div>
      )}
    </div>
  );
}
