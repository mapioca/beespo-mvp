"use client";

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

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={cn(
        "w-full text-left rounded-md border-l-[3px] transition-all duration-150",
        "shadow-none hover:shadow-sm bg-surface-sunken text-foreground hover:bg-surface-hover",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1.5 text-sm"
      )}
      style={{ borderLeftColor: accentColor }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {event.isRecurringInstance && (
          <Repeat className={cn("flex-shrink-0 opacity-60", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        )}
        <span className={cn("truncate", compact ? "font-medium" : "font-semibold")}>{event.title}</span>
      </div>
      {!compact && event.location && (
        <div className="flex items-center gap-1 mt-0.5 text-xs opacity-70">
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
