"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO } from "date-fns";
import {
  CalendarEvent,
  CalendarAnnouncement,
  CalendarMeeting,
  CalendarTask,
  expandRecurringEvents,
  meetingsToEvents,
  tasksToEvents,
  getVisibleDateRange,
  groupEventsByDate,
  EventSource,
} from "@/lib/calendar-helpers";
import { CalendarToolbar } from "./calendar-toolbar";
import { CalendarSidebar } from "./calendar-sidebar";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { DayView } from "./views/day-view";
import { AgendaView } from "./views/agenda-view";
import { CreateEventDialog } from "./create-event-dialog";
import { UserRole, ExternalCalendarEvent } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

export type CalendarViewType = "month" | "week" | "day" | "agenda";

interface CalendarVisibility {
  announcements: boolean;
  meetings: boolean;
  tasks: boolean;
  external: boolean;
}

interface ExternalEventWithColor extends ExternalCalendarEvent {
  color?: string;
}

interface CalendarClientProps {
  initialAnnouncements: CalendarAnnouncement[];
  initialMeetings: CalendarMeeting[];
  initialTasks: CalendarTask[];
  userRole: UserRole;
}

export function CalendarClient({
  initialAnnouncements,
  initialMeetings,
  initialTasks,
  userRole,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [visibility, setVisibility] = useState<CalendarVisibility>({
    announcements: true,
    meetings: true,
    tasks: true,
    external: true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Local state for data (can be updated after creating events)
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [meetings] = useState(initialMeetings);
  const [tasks] = useState(initialTasks);

  // External events state
  const [externalEvents, setExternalEvents] = useState<ExternalEventWithColor[]>([]);
  const [linkedEventIds, setLinkedEventIds] = useState<Set<string>>(new Set());

  // Fetch external events and links
  useEffect(() => {
    const fetchExternalEvents = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (!profile?.workspace_id) return;

      // Fetch external events with subscription info
      const { data: events } = await (supabase
        .from("external_calendar_events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
          *,
          calendar_subscriptions!inner (
            workspace_id,
            color,
            is_enabled
          )
        `)
        .eq("calendar_subscriptions.workspace_id", profile.workspace_id)
        .eq("calendar_subscriptions.is_enabled", true);

      // Fetch linked events (for de-duplication)
      const { data: links } = await (supabase
        .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("external_event_id");

      const linkedIds = new Set<string>(links?.map((l: any) => l.external_event_id) || []);
      setLinkedEventIds(linkedIds);

      // Add color from subscription to events
      const eventsWithColor = (events || []).map((e: any) => ({
        ...e,
        color: e.calendar_subscriptions?.color,
      }));

      setExternalEvents(eventsWithColor);
    };

    fetchExternalEvents();
  }, []);

  // Check if user can create events
  const canCreateEvents = userRole === "admin" || userRole === "leader";

  // Get visible date range
  const dateRange = useMemo(
    () => getVisibleDateRange(currentDate, view === "agenda" ? "month" : view),
    [currentDate, view]
  );

  // Convert external events to calendar events
  const externalToCalendarEvents = useCallback(
    (events: ExternalEventWithColor[]): CalendarEvent[] => {
      return events
        .filter((e) => !linkedEventIds.has(e.id)) // De-duplicate: exclude linked events
        .map((event) => ({
          id: event.id,
          title: event.title,
          description: event.description,
          startDate: parseISO(event.start_date),
          endDate: event.end_date ? parseISO(event.end_date) : undefined,
          isAllDay: event.is_all_day,
          source: "external" as EventSource,
          sourceId: event.id,
          location: event.location || undefined,
          color: event.color,
        }));
    },
    [linkedEventIds]
  );

  // Expand recurring announcements and create calendar events
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    if (visibility.announcements) {
      const announcementEvents = expandRecurringEvents(
        announcements,
        dateRange.start,
        dateRange.end
      );
      events.push(...announcementEvents);
    }

    if (visibility.meetings) {
      events.push(...meetingsToEvents(meetings));
    }

    if (visibility.tasks) {
      events.push(...tasksToEvents(tasks));
    }

    if (visibility.external) {
      events.push(...externalToCalendarEvents(externalEvents));
    }

    return events;
  }, [announcements, meetings, tasks, externalEvents, visibility, dateRange, externalToCalendarEvents]);

  // Group events by date for display
  const eventsByDate = useMemo(
    () => groupEventsByDate(allEvents),
    [allEvents]
  );

  // Navigation handlers
  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToPrevious = useCallback(() => {
    switch (view) {
      case "month":
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => subDays(d, 1));
        break;
      case "agenda":
        setCurrentDate((d) => subMonths(d, 1));
        break;
    }
  }, [view]);

  const goToNext = useCallback(() => {
    switch (view) {
      case "month":
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => addDays(d, 1));
        break;
      case "agenda":
        setCurrentDate((d) => addMonths(d, 1));
        break;
    }
  }, [view]);

  // Handle date click (for creating new events)
  const handleDateClick = useCallback(
    (date: Date) => {
      if (canCreateEvents) {
        setSelectedDate(date);
        setCreateDialogOpen(true);
      }
    },
    [canCreateEvents]
  );

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // External events don't have a detail page yet
    if (event.source === "external") {
      // Could show a popover or modal with event details in the future
      return;
    }
    // Navigate to the source entity
    const basePath = `/${event.source === "announcement" ? "announcements" : event.source === "meeting" ? "meetings" : "tasks"}`;
    window.location.href = `${basePath}/${event.sourceId}`;
  }, []);

  // Toggle calendar visibility
  const toggleVisibility = useCallback(
    (key: keyof CalendarVisibility) => {
      setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  // Handle new announcement created
  const handleAnnouncementCreated = useCallback(
    (newAnnouncement: CalendarAnnouncement) => {
      setAnnouncements((prev) => [...prev, newAnnouncement]);
      setCreateDialogOpen(false);
    },
    []
  );

  // Render the appropriate view
  const renderView = () => {
    const commonProps = {
      currentDate,
      events: allEvents,
      eventsByDate,
      onDateClick: handleDateClick,
      onEventClick: handleEventClick,
    };

    switch (view) {
      case "month":
        return <MonthView {...commonProps} />;
      case "week":
        return <WeekView {...commonProps} />;
      case "day":
        return <DayView {...commonProps} />;
      case "agenda":
        return <AgendaView {...commonProps} />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <CalendarSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        visibility={visibility}
        onToggleVisibility={toggleVisibility}
        userRole={userRole}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <CalendarToolbar
          currentDate={currentDate}
          view={view}
          onViewChange={setView}
          onToday={goToToday}
          onPrevious={goToPrevious}
          onNext={goToNext}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          canCreateEvents={canCreateEvents}
          onCreateEvent={() => {
            setSelectedDate(new Date());
            setCreateDialogOpen(true);
          }}
        />

        <div className="flex-1 overflow-auto p-4">{renderView()}</div>
      </main>

      {/* Create event dialog */}
      {canCreateEvents && (
        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          selectedDate={selectedDate}
          onCreated={handleAnnouncementCreated}
        />
      )}
    </div>
  );
}
