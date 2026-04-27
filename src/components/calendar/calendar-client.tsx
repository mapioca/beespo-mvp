"use client";

import type React from "react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
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
  parseAllDayDate,
} from "@/lib/calendar-helpers";
import { MonthView } from "./views/month-view";
import { WeekView } from "./views/week-view";
import { DayView } from "./views/day-view";
import { AgendaView } from "./views/agenda-view";
import { CreateEventDialog, CalendarEventData } from "./create-event-dialog";
import { ExternalEventPreview, ExternalEventData } from "./external-event-preview";
import { EventDetailDrawer, type EventListItem } from "./events";
import type {
  CalendarViewType,
  CalendarVisibility,
  ExternalEventWithColor,
  CalendarClientProps
} from "./calendar-types";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type CalendarSubscriptionSummary = {
  id: string;
  name: string;
  color: string | null;
  is_enabled: boolean | null;
};

const EVENT_TYPE_META = [
  { value: "activity", label: "Activity", color: "#f2be5c" },
  { value: "interview", label: "Interview", color: "#8d6ce8" },
  { value: "meeting", label: "Meeting", color: "#e47b52" },
] as const;

export function CalendarClient({
  initialAnnouncements,
  initialMeetings,
  initialTasks,
  initialEvents = [],
  userRole,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view] = useState<CalendarViewType>("week");
  const [visibility, setVisibility] = useState<CalendarVisibility>({
    announcements: true,
    meetings: true,
    tasks: true,
    events: true,
    external: true,
    externalSubscriptions: {},
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Local state for data (can be updated after creating events)
  const [announcements] = useState(initialAnnouncements);
  const [meetings] = useState(initialMeetings);
  const [tasks] = useState(initialTasks);
  const [internalEvents, setInternalEvents] = useState(initialEvents);

  // External events state
  const [externalEvents, setExternalEvents] = useState<ExternalEventWithColor[]>([]);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscriptionSummary[]>([]);
  const [linkedEventIds, setLinkedEventIds] = useState<Set<string>>(new Set());

  // External event preview state
  const [previewEvent, setPreviewEvent] = useState<ExternalEventData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Import mode - when importing from external event
  const [importingEvent, setImportingEvent] = useState<ExternalEventData | null>(null);
  const [selectedInternalEvent, setSelectedInternalEvent] = useState<EventListItem | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

  // Fetch external events and links
  const fetchExternalEvents = useCallback(async () => {
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await (supabase
      .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("workspace_id")
      .eq("id", user.id)
      .single();

    if (!profile?.workspace_id) return;

    const { data: calendarSubscriptions } = await (supabase
      .from("calendar_subscriptions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("id, name, color, is_enabled")
      .eq("workspace_id", profile.workspace_id)
      .eq("is_enabled", true)
      .order("name");

    setSubscriptions(calendarSubscriptions || []);

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
      subscription_id?: string;
    }) => ({
      ...e,
      color: e.calendar_subscriptions?.color,
      subscription_name: e.calendar_subscriptions?.name,
    }));

    setExternalEvents(eventsWithColor);

    // Register any new subscription IDs as visible (default on)
    setVisibility((prev) => {
      const newSubs = { ...prev.externalSubscriptions };
      let changed = false;
      for (const subscription of (calendarSubscriptions || []) as { id?: string }[]) {
        if (subscription.id && !(subscription.id in newSubs)) {
          newSubs[subscription.id] = true;
          changed = true;
        }
      }
      return changed ? { ...prev, externalSubscriptions: newSubs } : prev;
    });
  }, []);

  useEffect(() => {
    fetchExternalEvents();
  }, [fetchExternalEvents]);

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
          event_type,
          description,
          location,
          start_at,
          end_at,
          is_all_day,
          date_tbd,
          time_tbd,
          duration_mode,
          duration_minutes,
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

  useEffect(() => {
    if (!canCreateEvents) return;
    if (searchParams?.get("create") !== "event") return;

    setSelectedDate(new Date());
    setImportingEvent(null);
    setCreateDialogOpen(true);
  }, [canCreateEvents, searchParams]);

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
        startDate: (event.is_all_day ?? false)
          ? parseAllDayDate(event.start_date)
          : parseISO(event.start_date),
        endDate: event.end_date
          ? ((event.is_all_day ?? false)
            ? parseAllDayDate(event.end_date)
            : parseISO(event.end_date))
          : undefined,
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
      // Filter by individual subscription visibility
      const visibleExternal = externalEvents.filter((e) => {
        if (!e.subscription_id) return true;
        const subVisible = visibility.externalSubscriptions[e.subscription_id];
        // If not yet registered, treat as visible
        return subVisible === undefined ? true : subVisible;
      });
      events.push(...externalToCalendarEvents(visibleExternal));
    }

    return events;
  }, [announcements, meetings, tasks, internalEvents, externalEvents, visibility, dateRange, externalToCalendarEvents]);

  // Group events by date for display
  const eventsByDate = useMemo(
    () => groupEventsByDate(allEvents),
    [allEvents]
  );

  const visibleExternalEvents = useMemo(
    () =>
      externalEvents.filter((event) => {
        if (!visibility.external) return false;
        if (!event.subscription_id) return true;
        const subVisible = visibility.externalSubscriptions[event.subscription_id];
        return subVisible === undefined ? true : subVisible;
      }),
    [externalEvents, visibility.external, visibility.externalSubscriptions]
  );

  const appEventCount = useMemo(
    () => allEvents.filter((event) => event.source !== "external").length,
    [allEvents]
  );

  const subscribedEventCount = visibleExternalEvents.length;

  const todayEvents = useMemo(() => {
    const now = new Date();
    return allEvents
      .filter((event) => isSameDay(event.startDate, now))
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, 6);
  }, [allEvents]);

  const eventTypeCounts = useMemo(() => {
    return EVENT_TYPE_META.map((type) => ({
      ...type,
      count: internalEvents.filter((event) => event.event_type === type.value).length,
    }));
  }, [internalEvents]);

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

    // Internal events from events table open in detail drawer
    if (event.source === "event") {
      const matchingEvent = internalEvents.find((internalEvent) => internalEvent.id === event.sourceId);
      if (matchingEvent) {
        setSelectedInternalEvent({
          id: matchingEvent.id,
          title: matchingEvent.title,
          event_type: matchingEvent.event_type,
          description: matchingEvent.description,
          location: matchingEvent.location,
          start_at: matchingEvent.start_at,
          end_at: matchingEvent.end_at,
          is_all_day: matchingEvent.is_all_day,
          date_tbd: matchingEvent.date_tbd,
          time_tbd: matchingEvent.time_tbd,
          duration_mode: matchingEvent.duration_mode,
          duration_minutes: matchingEvent.duration_minutes,
          workspace_event_id: matchingEvent.workspace_event_id,
          external_source_id: matchingEvent.external_source_id,
          external_source_type: matchingEvent.external_source_type,
          source_type: "event",
        });
        setDetailDrawerOpen(true);
      }
      return;
    }

    // Navigate to the source entity
    let path = "";
    if (event.source === "announcement") {
      path = `/meetings/announcements/${event.sourceId}`;
    } else if (event.source === "meeting") {
      path = `/meetings/${event.sourceId}`;
    } else if (event.source === "task") {
      path = `/tasks`;
    }
    
    if (path) {
      window.location.href = path;
    }
  }, [externalEvents, internalEvents]);

  // Toggle calendar visibility
  useCallback(
      (key: keyof CalendarVisibility) => {
        setVisibility((prev) => {
          const newVal = !prev[key];
          // When toggling the master "external" flag, sync all per-subscription states
          if (key === "external") {
            const newSubs: Record<string, boolean> = {};
            for (const id of Object.keys(prev.externalSubscriptions)) {
              newSubs[id] = newVal as boolean;
            }
            return { ...prev, external: newVal as boolean, externalSubscriptions: newSubs };
          }
          return { ...prev, [key]: newVal };
        });
      },
      []
  );
// Toggle individual external subscription visibility
  const toggleExternalSubscription = useCallback((subscriptionId: string) => {
    setVisibility((prev) => {
      const updated = {
        ...prev.externalSubscriptions,
        [subscriptionId]: !prev.externalSubscriptions[subscriptionId],
      };
      // Derive master toggle: all on => true, all off => false, mixed => true (indeterminate handled in sidebar)
      const values = Object.values(updated);
      const anyOn = values.some(Boolean);
      return { ...prev, externalSubscriptions: updated, external: anyOn };
    });
  }, []);

  // Handle new event created from dialog
  const handleEventCreated = useCallback(
    (newEvent: CalendarEventData) => {
      setInternalEvents((prev) => [...prev, newEvent]);
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

  const handleInternalEventUpdated = useCallback((updatedEvent: EventListItem) => {
    setInternalEvents((prev) =>
      prev.map((event) =>
        event.id === updatedEvent.id
          ? {
            ...event,
            title: updatedEvent.title,
            event_type: updatedEvent.event_type ?? event.event_type,
            description: updatedEvent.description,
            location: updatedEvent.location,
            start_at: updatedEvent.start_at,
            end_at: updatedEvent.end_at,
            is_all_day: updatedEvent.is_all_day,
            date_tbd: updatedEvent.date_tbd ?? event.date_tbd,
            time_tbd: updatedEvent.time_tbd ?? event.time_tbd,
            duration_mode: updatedEvent.duration_mode ?? event.duration_mode,
            duration_minutes: updatedEvent.duration_minutes ?? event.duration_minutes,
            workspace_event_id: updatedEvent.workspace_event_id,
            external_source_id: updatedEvent.external_source_id,
            external_source_type: updatedEvent.external_source_type,
          }
          : event
      )
    );
    setSelectedInternalEvent(updatedEvent);
  }, []);

  const handleInternalEventDeleted = useCallback((eventId: string) => {
    setInternalEvents((prev) => prev.filter((event) => event.id !== eventId));
    setSelectedInternalEvent((prev) => (prev?.id === eventId ? null : prev));
    setDetailDrawerOpen(false);
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
    <div className="min-h-[calc(100vh-4rem)] bg-[#101112] text-zinc-100">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-6 py-8 lg:px-10 xl:px-14">
        <CalendarHeader
          canCreateEvents={canCreateEvents}
          onCreateEvent={() => router.push("/events/new")}
        />

        <div className="grid min-h-0 gap-8 xl:grid-cols-[minmax(0,1fr)_220px] 2xl:grid-cols-[minmax(0,1fr)_240px]">
          <main className="min-w-0">
            <CalendarControls
              currentDate={currentDate}
              view={view}
              onToday={goToToday}
              onPrevious={goToPrevious}
              onNext={goToNext}
            />

            <div className="mt-3 h-[calc(100vh-23rem)] min-h-[500px] overflow-hidden rounded-[8px] border border-white/[0.08] bg-[#131416] shadow-[0_0_0_1px_rgba(255,255,255,0.015)]">
              <div className="h-full overflow-auto p-0 [&_*]:border-white/10 [&_.bg-surface-raised]:bg-[#131416] [&_.bg-surface-sunken]:bg-[#211916] [&_.text-foreground]:text-zinc-200 [&_.text-muted-foreground]:text-zinc-500">
                {renderView()}
              </div>
            </div>
          </main>

          <CalendarRightRail
            currentDate={currentDate}
            subscriptions={subscriptions}
            visibility={visibility}
            appEventCount={appEventCount}
            subscribedEventCount={subscribedEventCount}
            allEvents={allEvents}
            externalEvents={externalEvents}
            todayEvents={todayEvents}
            eventTypeCounts={eventTypeCounts}
            onPreviousMonth={() => setCurrentDate((date) => subMonths(date, 1))}
            onNextMonth={() => setCurrentDate((date) => addMonths(date, 1))}
            onSelectDate={setCurrentDate}
            onToggleExternalSubscription={toggleExternalSubscription}
            onManageCalendars={() => router.push("/schedule/settings")}
          />
        </div>
      </div>

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

      <EventDetailDrawer
        event={selectedInternalEvent}
        open={detailDrawerOpen}
        onOpenChange={setDetailDrawerOpen}
        canManageEvents={canCreateEvents}
        onEventUpdated={handleInternalEventUpdated}
        onEventDeleted={handleInternalEventDeleted}
      />
    </div>
  );
}

function CalendarHeader({
  canCreateEvents,
  onCreateEvent,
}: {
  canCreateEvents: boolean;
  onCreateEvent: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-6">
      <div className="max-w-[620px]">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Calendar
        </p>
        <h1 className="font-serif text-3xl font-normal leading-[1.1] tracking-tight text-zinc-100 md:text-[34px]">
          The shape of the <span className="italic">week</span>
        </h1>
        <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-zinc-500">
          Ward events alongside the calendars you subscribe to. Pull anything from outside into the work.
        </p>
      </div>
      <div className="flex shrink-0 items-start pt-9">
        {canCreateEvents && (
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onCreateEvent}
                  aria-label="New event"
                  className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                sideOffset={6}
                showArrow={false}
                className="rounded-[4px] bg-foreground/90 px-1.5 py-0.5 text-[10px] font-medium tracking-tight shadow-sm"
              >
                New event
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </header>
  );
}

function CalendarControls({
  currentDate,
  view,
  onToday,
  onPrevious,
  onNext,
}: {
  currentDate: Date;
  view: CalendarViewType;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const label =
    view === "week"
      ? `${format(startOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d")} – ${format(endOfWeek(currentDate, { weekStartsOn: 0 }), "MMM d, yyyy")}`
      : format(currentDate, view === "day" ? "EEE, MMM d, yyyy" : "MMMM yyyy");

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          onClick={onPrevious}
          className="h-8 w-8 rounded-[7px] border-white/10 bg-transparent text-zinc-500 shadow-none hover:bg-white/5 hover:text-zinc-100"
          aria-label="Previous"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          className="h-8 w-8 rounded-[7px] border-white/10 bg-transparent text-zinc-500 shadow-none hover:bg-white/5 hover:text-zinc-100"
          aria-label="Next"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Button
        variant="outline"
        onClick={onToday}
        className="h-8 rounded-[7px] border-white/10 bg-transparent px-3 text-xs text-zinc-500 shadow-none hover:bg-white/5 hover:text-zinc-100"
      >
        Today
      </Button>
      <h2 className="ml-1 font-serif text-[21px] font-normal leading-none tracking-normal text-zinc-200">
        {label}
      </h2>
    </div>
  );
}

function CalendarRightRail({
  currentDate,
  subscriptions,
  visibility,
  appEventCount,
  subscribedEventCount,
  allEvents,
  externalEvents,
  todayEvents,
  eventTypeCounts,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
  onToggleExternalSubscription,
  onManageCalendars,
}: {
  currentDate: Date;
  subscriptions: CalendarSubscriptionSummary[];
  visibility: CalendarVisibility;
  appEventCount: number;
  subscribedEventCount: number;
  allEvents: CalendarEvent[];
  externalEvents: ExternalEventWithColor[];
  todayEvents: CalendarEvent[];
  eventTypeCounts: Array<(typeof EVENT_TYPE_META)[number] & { count: number }>;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
  onToggleExternalSubscription: (subscriptionId: string) => void;
  onManageCalendars: () => void;
}) {
  return (
    <aside className="space-y-6 xl:pt-20">
      <p className="text-right text-[12px] font-medium text-zinc-500">
        {appEventCount} app · {subscribedEventCount} subscribed
      </p>

      <MiniCalendar
        currentDate={currentDate}
        events={allEvents}
        onPreviousMonth={onPreviousMonth}
        onNextMonth={onNextMonth}
        onSelectDate={onSelectDate}
      />

      <RailSection
        title="External Calendars"
        action={
          <button
            type="button"
            onClick={onManageCalendars}
            className="text-xl leading-none text-zinc-500 hover:text-zinc-200"
            aria-label="Manage external calendars"
          >
            +
          </button>
        }
      >
        <div className="space-y-3">
          {subscriptions.length > 0 ? (
            subscriptions.map((subscription) => {
              const isVisible = visibility.externalSubscriptions[subscription.id] ?? true;
              const count = externalEvents.filter((event) => event.subscription_id === subscription.id).length;
              return (
                <label key={subscription.id} className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={() => onToggleExternalSubscription(subscription.id)}
                    className="mt-0.5 h-4 w-4 rounded-full border-zinc-700 bg-transparent text-[#101112] data-[state=checked]:border-transparent [&_svg]:h-3 [&_svg]:w-3"
                    style={{
                      backgroundColor: isVisible ? subscription.color ?? "#62b7e8" : "transparent",
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium text-zinc-300">{subscription.name}</span>
                    <span className="text-[11px] text-zinc-600">{count} events</span>
                  </span>
                </label>
              );
            })
          ) : (
            <p className="text-sm text-zinc-600">No external calendars connected</p>
          )}
        </div>
      </RailSection>

      <RailSection title="Today">
        <div className="space-y-4">
          {todayEvents.length > 0 ? (
            todayEvents.map((event) => (
              <div key={`${event.source}-${event.id}`} className="grid grid-cols-[1fr_auto] gap-3 text-xs">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: getRailEventColor(event) }}
                  />
                  <span className="truncate text-zinc-300">{event.title}</span>
                </div>
                <span className="text-zinc-500">{event.isAllDay ? "All day" : format(event.startDate, "h:mm a")}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-600">No events today</p>
          )}
        </div>
      </RailSection>

      <RailSection title="Event Types">
        <div className="space-y-2.5">
          {eventTypeCounts.map((type) => (
            <div key={type.value} className="flex items-center gap-2.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: type.color }} />
              <span className="text-zinc-400">{type.label}</span>
              <span className="ml-auto text-xs text-zinc-600">{type.count}</span>
            </div>
          ))}
        </div>
      </RailSection>
    </aside>
  );
}

function MiniCalendar({
  currentDate,
  events,
  onPreviousMonth,
  onNextMonth,
  onSelectDate,
}: {
  currentDate: Date;
  events: CalendarEvent[];
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  const eventDays = new Set(events.map((event) => format(event.startDate, "yyyy-MM-dd")));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300">{format(currentDate, "MMMM yyyy")}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onPreviousMonth} className="text-zinc-500 hover:text-zinc-200" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={onNextMonth} className="text-zinc-500 hover:text-zinc-200" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-[11px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <div key={`${day}-${index}`} className="font-medium text-zinc-600">
            {day}
          </div>
        ))}
        {gridDays.map((day) => {
          const selected = isSameDay(day, currentDate);
          const muted = !isSameMonth(day, currentDate);
          const hasEvent = eventDays.has(format(day, "yyyy-MM-dd"));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative mx-auto flex h-5 w-5 items-center justify-center rounded-full text-[11px] transition-colors",
                muted ? "text-zinc-700" : "text-zinc-400",
                selected && "bg-[#ef7d52] font-semibold text-[#17110e]",
                !selected && isToday(day) && "ring-1 ring-[#ef7d52]/70",
                !selected && "hover:bg-white/5 hover:text-zinc-200"
              )}
            >
              {format(day, "d")}
              {hasEvent && (
                <span className={cn("absolute bottom-0 h-0.5 w-0.5 rounded-full", selected ? "bg-[#17110e]" : "bg-[#ef7d52]")} />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function RailSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function getRailEventColor(event: CalendarEvent) {
  if (event.color) return event.color;
  if (event.source === "meeting") return "#62b7e8";
  if (event.source === "task") return "#6ee27f";
  if (event.source === "announcement") return "#f2be5c";
  if (event.source === "external") return "#8d6ce8";
  return "#e47b52";
}
