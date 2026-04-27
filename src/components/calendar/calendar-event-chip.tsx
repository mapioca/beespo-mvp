"use client";

import type React from "react";
import { CalendarEvent, EventSource } from "@/lib/calendar-helpers";
import { cn } from "@/lib/utils";
import { Repeat, MapPin } from "lucide-react";

interface CalendarEventChipProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  compact?: boolean;
}

function getSourceAccent(source: EventSource, customColor?: string): string {
  if (customColor) return customColor;
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

export function CalendarEventChip({
  event,
  onClick,
  compact = false,
}: CalendarEventChipProps) {
  const accentColor = getSourceAccent(event.source, event.color);
  const chipStyle = {
    "--calendar-event-accent": accentColor,
    borderColor: `color-mix(in srgb, ${accentColor} 36%, transparent)`,
    backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
  } as React.CSSProperties;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={cn(
        "group w-full text-left transition-all duration-150",
        "border text-foreground shadow-none hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35",
        compact
          ? "h-5 rounded-full px-1.5 text-[10.5px]"
          : "rounded-[8px] px-2.5 py-2 text-sm"
      )}
      style={chipStyle}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={cn("shrink-0 rounded-full", compact ? "h-1.5 w-1.5" : "h-2 w-2")}
          style={{ backgroundColor: accentColor }}
        />
        {event.isRecurringInstance && (
          <Repeat className={cn("flex-shrink-0 opacity-60", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        )}
        <span className={cn("truncate text-zinc-200", compact ? "font-medium" : "font-semibold")}>{event.title}</span>
      </div>
      {!compact && event.location && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 stroke-[1.6]" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
    </button>
  );
}

interface CalendarEventListProps {
  events: CalendarEvent[];
  onClick: (event: CalendarEvent) => void;
  maxVisible?: number;
  compact?: boolean;
}

export function CalendarEventList({
  events,
  onClick,
  maxVisible = 3,
  compact = false,
}: CalendarEventListProps) {
  const visibleEvents = events.slice(0, maxVisible);
  const hiddenCount = events.length - maxVisible;

  return (
    <div className={cn("space-y-0.5", compact ? "space-y-px" : "space-y-1")}>
      {visibleEvents.map((event) => (
        <CalendarEventChip
          key={event.id}
          event={event}
          onClick={onClick}
          compact={compact}
        />
      ))}
      {hiddenCount > 0 && (
        <div
          className={cn(
            "text-muted-foreground text-center cursor-pointer hover:text-foreground",
            compact ? "text-xs py-0.5" : "text-sm py-1"
          )}
        >
          +{hiddenCount} more
        </div>
      )}
    </div>
  );
}
