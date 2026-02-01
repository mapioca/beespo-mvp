"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Plus,
} from "lucide-react";
import { formatMonthYear, formatDayOfWeek, formatShortDate } from "@/lib/calendar-helpers";
import type { CalendarViewType } from "./calendar-types";
import { cn } from "@/lib/utils";

interface CalendarToolbarProps {
  currentDate: Date;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleSidebar: () => void;
  canCreateEvents: boolean;
  onCreateEvent: () => void;
}

export function CalendarToolbar({
  currentDate,
  view,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  onToggleSidebar,
  canCreateEvents,
  onCreateEvent,
}: CalendarToolbarProps) {
  // Format the date label based on current view
  const getDateLabel = () => {
    switch (view) {
      case "month":
      case "agenda":
        return formatMonthYear(currentDate);
      case "week":
        return formatMonthYear(currentDate);
      case "day":
        return `${formatDayOfWeek(currentDate)}, ${formatShortDate(currentDate)}`;
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
      {/* Left section: sidebar toggle, navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Button variant="outline" size="sm" onClick={onToday}>
          Today
        </Button>

        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onPrevious}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold ml-2">{getDateLabel()}</h2>
      </div>

      {/* Right section: view switcher, create button */}
      <div className="flex items-center gap-2">
        {/* View switcher */}
        <div className="hidden sm:flex items-center border rounded-md">
          {(["month", "week", "day", "agenda"] as CalendarViewType[]).map(
            (viewType) => (
              <Button
                key={viewType}
                variant="ghost"
                size="sm"
                onClick={() => onViewChange(viewType)}
                className={cn(
                  "rounded-none first:rounded-l-md last:rounded-r-md capitalize",
                  view === viewType && "bg-muted"
                )}
              >
                {viewType}
              </Button>
            )
          )}
        </div>

        {/* Mobile view dropdown - simplified to just show current */}
        <select
          value={view}
          onChange={(e) => onViewChange(e.target.value as CalendarViewType)}
          className="sm:hidden h-9 px-3 border rounded-md text-sm bg-background"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
          <option value="agenda">Agenda</option>
        </select>

        {/* Create event button */}
        {canCreateEvents && (
          <Button onClick={onCreateEvent} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">New Event</span>
          </Button>
        )}
      </div>
    </div>
  );
}
