"use client";

import { CalendarEvent, EventSource } from "@/lib/calendar-helpers";
import { cn } from "@/lib/utils";
import { Repeat, MapPin } from "lucide-react";

interface CalendarEventChipProps {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
  compact?: boolean;
}

// Notion-inspired color schemes for events
function getNotionColors(source: EventSource, customColor?: string): {
  border: string;
  bg: string;
  text: string;
  hoverBg: string;
} {
  // If custom color provided (for external events), use it
  if (customColor) {
    return {
      border: `border-l-[${customColor}]`,
      bg: "bg-purple-50 dark:bg-purple-950/30",
      text: "text-purple-900 dark:text-purple-100",
      hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/40",
    };
  }

  switch (source) {
    case "announcement":
      return {
        border: "border-l-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        text: "text-amber-900 dark:text-amber-100",
        hoverBg: "hover:bg-amber-100 dark:hover:bg-amber-900/40",
      };
    case "meeting":
      return {
        border: "border-l-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        text: "text-blue-900 dark:text-blue-100",
        hoverBg: "hover:bg-blue-100 dark:hover:bg-blue-900/40",
      };
    case "task":
      return {
        border: "border-l-green-400",
        bg: "bg-green-50 dark:bg-green-950/30",
        text: "text-green-900 dark:text-green-100",
        hoverBg: "hover:bg-green-100 dark:hover:bg-green-900/40",
      };
    case "event":
      return {
        border: "border-l-indigo-400",
        bg: "bg-indigo-50 dark:bg-indigo-950/30",
        text: "text-indigo-900 dark:text-indigo-100",
        hoverBg: "hover:bg-indigo-100 dark:hover:bg-indigo-900/40",
      };
    case "external":
      return {
        border: "border-l-purple-400",
        bg: "bg-purple-50 dark:bg-purple-950/30",
        text: "text-purple-900 dark:text-purple-100",
        hoverBg: "hover:bg-purple-100 dark:hover:bg-purple-900/40",
      };
  }
}

export function CalendarEventChip({
  event,
  onClick,
  compact = false,
}: CalendarEventChipProps) {
  const colors = getNotionColors(event.source, event.color);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={cn(
        "w-full text-left rounded-md border-l-[3px] transition-all duration-150",
        "shadow-sm hover:shadow",
        colors.border,
        colors.bg,
        colors.text,
        colors.hoverBg,
        compact ? "px-1.5 py-0.5 text-xs" : "px-2 py-1.5 text-sm"
      )}
      style={event.color ? { borderLeftColor: event.color } : undefined}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {event.isRecurringInstance && (
          <Repeat className={cn("flex-shrink-0 opacity-60", compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
        )}
        <span className={cn("truncate", compact ? "font-medium" : "font-semibold")}>{event.title}</span>
      </div>
      {!compact && event.location && (
        <div className="flex items-center gap-1 mt-0.5 text-xs opacity-70">
          <MapPin className="h-3 w-3" />
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
