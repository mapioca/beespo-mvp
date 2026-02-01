"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, parseISO } from "date-fns";
import {
  CalendarEvent,
  expandRecurringEvents,
  meetingsToEvents,
  tasksToEvents,
  internalEventsToCalendarEvents,
  getVisibleDateRange,
  groupEventsByDate,
  getClaimedExternalIds,
  applyExternalEventShadowing,
  EventSource,
} from "@/lib/calendar-helpers";
import { CalendarToolbar } from "./calendar-toolbar";
import { CalendarSidebar } from "./calendar-sidebar";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { DayView } from "./views/day-view";
import { AgendaView } from "./views/agenda-view";
import { CreateEventDialog, CalendarEventData } from "./create-event-dialog";
import { ExternalEventPreview, ExternalEventData } from "./external-event-preview";
import {
  CalendarViewType,
  CalendarVisibility,
  ExternalEventWithColor,
  CalendarClientProps
} from "./calendar-types";
import { createClient } from "@/lib/supabase/client";

export function CalendarClient({
  initialAnnouncements,
  initialMeetings,
  initialTasks,
  initialEvents = [],
  userRole,
}: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [visibility, setVisibility] = useState<CalendarVisibility>({
    announcements: true,
    meetings: true,
    tasks: true,
    events: true,
    external: true,
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Local state for data (can be updated after creating events)
  const [announcements] = useState(initialAnnouncements);
  const [meetings] = useState(initialMeetings);
  const [tasks] = useState(initialTasks);
  const [internalEvents, setInternalEvents] = useState(initialEvents);

  // External events state
  const [externalEvents, setExternalEvents] = useState<ExternalEventWithColor[]>([]);
  const [linkedEventIds, setLinkedEventIds] = useState<Set<string>>(new Set());

  // External event preview state
  const [previewEvent, setPreviewEvent] = useState<ExternalEventData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Import mode - when importing from external event
  const [importingEvent, setImportingEvent] = useState<ExternalEventData | null>(null);

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
            name,
            is_enabled
          )
        `)
        .eq("calendar_subscriptions.workspace_id", profile.workspace_id)
        .eq("calendar_subscriptions.is_enabled", true);

      // Fetch linked events (for legacy de-duplication)
      const { data: links } = await (supabase
        .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("external_event_id");

      const linkedIds = new Set<string>(links?.map((l: { external_event_id: string }) => l.external_event_id) || []);
      setLinkedEventIds(linkedIds);

      // Add color and name from subscription to events
      const eventsWithColor = (events || []).map((e: {
        calendar_subscriptions?: { color: string; name: string };
        external_uid?: string;
      }) => ({
        ...e,
        color: e.calendar_subscriptions?.color,
        subscription_name: e.calendar_subscriptions?.name,
      }));

      setExternalEvents(eventsWithColor);
    };

    fetchExternalEvents();
  }, []);

  // Fetch internal events
  useEffect(() => {
    const fetchInternalEvents = async () => {
      const supabase = createClient();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

      if (!profile?.workspace_id) return;

      const { data: events } = await (supabase
        .from("events") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
          id,
          title,
          description,
          location,
          start_at,
          end_at,
          is_all_day,
          workspace_event_id,
          external_source_id,
          external_source_type,
          announcements (
            id,
            title,
            status
          )
        `)
        .eq("workspace_id", profile.workspace_id);

      if (events) {
        setInternalEvents(events);
      }
    };

    fetchInternalEvents();
  }, []);

  // Check if user can create events
  const canCreateEvents = userRole === "admin" || userRole === "leader";

  // Get visible date range
  const dateRange = useMemo(
    () => getVisibleDateRange(currentDate, view === "agenda" ? "month" : view),
    [currentDate, view]
  );

  // Get claimed external IDs from internal events (for shadowing)
  const claimedExternalIds = useMemo(
    () => getClaimedExternalIds(internalEvents),
    [internalEvents]
  );

  // Convert external events to calendar events with shadowing applied
  const externalToCalendarEvents = useCallback(
    (events: ExternalEventWithColor[]): CalendarEvent[] => {
      // First filter by legacy linked event IDs
      const legacyFiltered = events.filter((e) => !linkedEventIds.has(e.id));

      // Then apply new shadowing logic (filter by claimed external source IDs)
      const shadowed = applyExternalEventShadowing(
        legacyFiltered.map((e) => ({
          ...e,
          external_uid: e.external_uid || e.id,
        })),
        claimedExternalIds
      );

      return shadowed.map((event) => ({
        id: event.id,
        title: event.title,
        description: event.description,
        startDate: parseISO(event.start_date),
        endDate: event.end_date ? parseISO(event.end_date) : undefined,
        isAllDay: event.is_all_day ?? false,
        source: "external" as EventSource,
        sourceId: event.id,
        location: event.location || undefined,
        color: event.color,
      }));
    },
    [linkedEventIds, claimedExternalIds]
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

    if (visibility.events) {
      events.push(...internalEventsToCalendarEvents(internalEvents));
    }

    if (visibility.external) {
      events.push(...externalToCalendarEvents(externalEvents));
    }

    return events;
  }, [announcements, meetings, tasks, internalEvents, externalEvents, visibility, dateRange, externalToCalendarEvents]);

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
        setImportingEvent(null);
        setCreateDialogOpen(true);
      }
    },
    [canCreateEvents]
  );

  // Handle event click
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // External events show preview modal
    if (event.source === "external") {
      const extEvent = externalEvents.find((e) => e.id === event.sourceId);
      if (extEvent) {
        setPreviewEvent({
          id: extEvent.id,
          title: extEvent.title,
          description: extEvent.description,
          location: extEvent.location,
          start_date: extEvent.start_date,
          end_date: extEvent.end_date,
          is_all_day: extEvent.is_all_day ?? false,
          external_uid: extEvent.external_uid || extEvent.id,
          subscription_name: extEvent.subscription_name,
          subscription_color: extEvent.color,
        });
        setPreviewOpen(true);
      }
      return;
    }

    // Internal events from events table navigate to events page
    if (event.source === "event") {
      window.location.href = `/events`;
      return;
    }

    // Navigate to the source entity
    const basePath = `/${event.source === "announcement" ? "announcements" : event.source === "meeting" ? "meetings" : "tasks"}`;
    window.location.href = `${basePath}/${event.sourceId}`;
  }, [externalEvents]);

  // Toggle calendar visibility
  const toggleVisibility = useCallback(
    (key: keyof CalendarVisibility) => {
      setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
    },
    []
  );

  // Handle new event created from dialog
  const handleEventCreated = useCallback(
    (newEvent: CalendarEventData) => {
      setInternalEvents((prev) => [...prev, newEvent]);
      setCreateDialogOpen(false);
      setImportingEvent(null);
    },
    []
  );

  // Handle import from external event preview
  const handleImportExternal = useCallback((event: ExternalEventData) => {
    setImportingEvent(event);
    setSelectedDate(new Date(event.start_date));
    setPreviewOpen(false);
    setCreateDialogOpen(true);
  }, []);

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
            setImportingEvent(null);
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
          onCreated={handleEventCreated}
          externalEvent={importingEvent}
        />
      )}

      {/* External event preview */}
      <ExternalEventPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        event={previewEvent}
        onImport={handleImportExternal}
      />
    </div>
  );
}
