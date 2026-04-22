"use client";

import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { formatMonthYear, formatDayOfWeek, formatShortDate } from "@/lib/calendar-helpers";
import type { CalendarViewType, CalendarVisibility } from "./calendar-types";
import { cn } from "@/lib/utils";
import { CalendarFilterPopover } from "./calendar-filter-popover";
import type { UserRole } from "@/types/database";

interface CalendarToolbarProps {
  currentDate: Date;
  view: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  canCreateEvents: boolean;
  onCreateEvent: () => void;
  visibility: CalendarVisibility;
  onToggleVisibility: (key: keyof CalendarVisibility) => void;
  onToggleExternalSubscription: (subscriptionId: string) => void;
  userRole: UserRole;
  onSyncComplete?: () => void;
}

export function CalendarToolbar({
  currentDate,
  view,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  canCreateEvents,
  onCreateEvent,
  visibility,
  onToggleVisibility,
  onToggleExternalSubscription,
  userRole,
  onSyncComplete,
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
    <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-transparent">
      {/* Left section: filter, navigation */}
      <div className="flex items-center gap-2">
        <CalendarFilterPopover
          visibility={visibility}
          onToggleVisibility={onToggleVisibility}
          onToggleExternalSubscription={onToggleExternalSubscription}
          userRole={userRole}
          onSyncComplete={onSyncComplete}
        />

        <Button variant="outline" size="sm" onClick={onToday} className="border-border/60 hover:bg-accent shadow-none">
          Today
        </Button>

        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={onPrevious} className="hover:bg-accent">
            <ChevronLeft className="h-5 w-5 stroke-[1.6]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} className="hover:bg-accent">
            <ChevronRight className="h-5 w-5 stroke-[1.6]" />
          </Button>
        </div>

        <h2 className="text-lg font-semibold ml-2">{getDateLabel()}</h2>
      </div>

      {/* Right section: view switcher, create button */}
      <div className="flex items-center gap-2">
        {/* View switcher */}
        <div className="hidden sm:flex items-center border border-border/60 bg-background/80 rounded-full">
          {(["month", "week", "day", "agenda"] as CalendarViewType[]).map(
            (viewType) => (
              <Button
                key={viewType}
                variant="ghost"
                size="sm"
                onClick={() => onViewChange(viewType)}
                className={cn(
                  "rounded-none first:rounded-l-full last:rounded-r-full capitalize px-3",
                  view === viewType
                    ? "bg-surface-active text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
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
          className="sm:hidden h-9 px-3 border border-border/60 rounded-md text-sm bg-background/80"
        >
          <option value="month">Month</option>
          <option value="week">Week</option>
          <option value="day">Day</option>
          <option value="agenda">Agenda</option>
        </select>

        {/* Create event button */}
        {canCreateEvents && (
          <Button onClick={onCreateEvent} size="sm" className="shadow-none">
            <Plus className="h-4 w-4 mr-1 stroke-[1.6]" />
            <span className="hidden sm:inline">New Event</span>
          </Button>
        )}
      </div>
    </div>
  );
}
