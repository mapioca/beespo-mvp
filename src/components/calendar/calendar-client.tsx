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
  meetingsToEvents,
  internalEventsToCalendarEvents,
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
  CalendarClientProps,
} from "./calendar-types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type CalendarSubscriptionSummary = {
  id: string;
  name: string;
  color: string | null;
  is_enabled: boolean | null;
};

const VIEW_OPTIONS: { value: CalendarViewType; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "agenda", label: "Agenda" },
];

const MY_CALENDAR_COLOR = "hsl(var(--brand))";

export function CalendarClient({
  initialMeetings,
  initialEvents = [],
  userRole,
}: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarViewType>("month");
  const [myCalendarOn, setMyCalendarOn] = useState(true);
  const [visibility, setVisibility] = useState<CalendarVisibility>({
    announcements: false,
    meetings: true,
    tasks: false,
    events: true,
    external: true,
    externalSubscriptions: {},
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [meetings] = useState(initialMeetings);
  const [internalEvents, setInternalEvents] = useState(initialEvents);

  const [externalEvents, setExternalEvents] = useState<ExternalEventWithColor[]>([]);
  const [subscriptions, setSubscriptions] = useState<CalendarSubscriptionSummary[]>([]);
  const [linkedEventIds, setLinkedEventIds] = useState<Set<string>>(new Set());

  const [previewEvent, setPreviewEvent] = useState<ExternalEventData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [importingEvent, setImportingEvent] = useState<ExternalEventData | null>(null);
  const [selectedInternalEvent, setSelectedInternalEvent] = useState<EventListItem | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);

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

    const { data: links } = await (supabase
      .from("external_event_links") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select("external_event_id");

    const linkedIds = new Set<string>(links?.map((l: { external_event_id: string }) => l.external_event_id) || []);
    setLinkedEventIds(linkedIds);

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

  const canCreateEvents = userRole === "admin" || userRole === "leader";

  useEffect(() => {
    if (!canCreateEvents) return;
    if (searchParams?.get("create") !== "event") return;

    setSelectedDate(new Date());
    setImportingEvent(null);
    setCreateDialogOpen(true);
  }, [canCreateEvents, searchParams]);

  const claimedExternalIds = useMemo(
    () => getClaimedExternalIds(internalEvents),
    [internalEvents]
  );

  const externalToCalendarEvents = useCallback(
    (events: ExternalEventWithColor[]): CalendarEvent[] => {
      const legacyFiltered = events.filter((e) => !linkedEventIds.has(e.id));

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

  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    if (myCalendarOn) {
      events.push(...meetingsToEvents(meetings));
      events.push(...internalEventsToCalendarEvents(internalEvents));
    }

    const visibleExternal = externalEvents.filter((e) => {
      if (!e.subscription_id) return true;
      const subVisible = visibility.externalSubscriptions[e.subscription_id];
      return subVisible === undefined ? true : subVisible;
    });
    events.push(...externalToCalendarEvents(visibleExternal));

    return events;
  }, [myCalendarOn, meetings, internalEvents, externalEvents, visibility.externalSubscriptions, externalToCalendarEvents]);

  const eventsByDate = useMemo(() => groupEventsByDate(allEvents), [allEvents]);

  const goToToday = useCallback(() => setCurrentDate(new Date()), []);

  const goToPrevious = useCallback(() => {
    switch (view) {
      case "month":
      case "agenda":
        setCurrentDate((d) => subMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => subWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => subDays(d, 1));
        break;
    }
  }, [view]);

  const goToNext = useCallback(() => {
    switch (view) {
      case "month":
      case "agenda":
        setCurrentDate((d) => addMonths(d, 1));
        break;
      case "week":
        setCurrentDate((d) => addWeeks(d, 1));
        break;
      case "day":
        setCurrentDate((d) => addDays(d, 1));
        break;
    }
  }, [view]);

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

  const handleEventClick = useCallback((event: CalendarEvent) => {
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

    if (event.source === "event") {
      const matchingEvent = internalEvents.find((e) => e.id === event.sourceId);
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

    if (event.source === "meeting") {
      const meeting = meetings.find((m) => m.id === event.sourceId);
      if (meeting) {
        setSelectedInternalEvent({
          id: meeting.id,
          title: meeting.title,
          description: null,
          location: null,
          start_at: meeting.scheduled_date ?? new Date().toISOString(),
          end_at: meeting.scheduled_date ?? new Date().toISOString(),
          is_all_day: false,
          source_type: "meeting",
          source_id: meeting.id,
          workspace_event_id: null,
          external_source_id: null,
          external_source_type: null,
        });
        setDetailDrawerOpen(true);
      }
    }
  }, [externalEvents, internalEvents]);

  const toggleSubscription = useCallback((subscriptionId: string) => {
    setVisibility((prev) => {
      const updated = {
        ...prev.externalSubscriptions,
        [subscriptionId]: !(prev.externalSubscriptions[subscriptionId] ?? true),
      };
      const anyOn = Object.values(updated).some(Boolean);
      return { ...prev, externalSubscriptions: updated, external: anyOn };
    });
  }, []);

  const handleEventCreated = useCallback((newEvent: CalendarEventData) => {
    setInternalEvents((prev) => [...prev, newEvent]);
    setImportingEvent(null);
  }, []);

  const handleImportExternal = useCallback((event: ExternalEventData) => {
    setImportingEvent(event);
    setSelectedDate(new Date(event.start_date));
    setPreviewOpen(false);
    setCreateDialogOpen(true);
  }, []);

  const handleConvertAsIs = useCallback(async (event: ExternalEventData) => {
    const start = event.is_all_day
      ? new Date(`${event.start_date}T00:00:00`)
      : new Date(event.start_date);
    const end = event.end_date
      ? (event.is_all_day ? new Date(`${event.end_date}T23:59:59`) : new Date(event.end_date))
      : new Date(start.getTime() + 60 * 60 * 1000);

    const payload = {
      title: event.title,
      event_type: "activity",
      location: event.location ?? null,
      description: event.description ?? null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      is_all_day: event.is_all_day,
      date_tbd: false,
      time_tbd: false,
      duration_mode: event.is_all_day ? "all_day" : "minutes",
      duration_minutes: event.is_all_day ? null : 60,
      external_source_id: event.external_uid ?? event.id,
      external_source_type: "ics",
    };

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.ok && data.event) {
      setInternalEvents((prev) => [...prev, data.event]);
    }
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

  const periodLabel = useMemo(() => buildPeriodLabel(currentDate, view), [currentDate, view]);

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
    <div className="flex min-h-full flex-col bg-surface-canvas text-foreground">
      {/* Full-width page header */}
      <header className="px-5 pb-0 pt-10 sm:px-8 lg:px-12">
        <div className="max-w-[520px]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Calendar
          </div>
          <h1 className="mt-2 font-serif text-[34px] font-normal leading-none tracking-normal text-foreground">
            Your time, <em className="italic">organized</em>
          </h1>
          <p className="mt-3 text-[14px] leading-6 text-muted-foreground">
            Meetings, events, and subscriptions — all in one view.
          </p>
        </div>
      </header>

      {/* Body: main content + right sidebar (both start below the header) */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col px-5 py-5 sm:px-8 lg:px-12">
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Previous"
                className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Next"
                className="grid h-8 w-8 place-items-center rounded-[7px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <span className="font-serif text-[32px] font-normal leading-none tracking-normal text-foreground tabular-nums">
              {periodLabel}
            </span>

            <div className="ml-auto flex items-center gap-5">
              <nav className="flex items-center gap-5 border-b border-transparent">
                {VIEW_OPTIONS.map((option) => {
                  const active = view === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setView(option.value)}
                      className={cn(
                        "border-b-2 pb-1 text-[12.5px] transition-colors",
                        active
                          ? "border-brand text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </nav>

              {canCreateEvents && (
                <button
                        type="button"
                        onClick={() => router.push("/events/new")}
                        aria-label="New event"
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-brand/10 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
              )}
            </div>
          </div>

          <main className="mt-6 flex-1">
            {renderView()}
          </main>
        </div>

        <CalendarSidebar
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          myCalendarOn={myCalendarOn}
          onToggleMyCalendar={() => setMyCalendarOn((v) => !v)}
          subscriptions={subscriptions}
          externalVisibility={visibility.externalSubscriptions}
          onToggleSubscription={toggleSubscription}
          onSelectDate={setCurrentDate}
          onPrevMonth={() => setCurrentDate((d) => subMonths(d, 1))}
          onNextMonth={() => setCurrentDate((d) => addMonths(d, 1))}
          onToday={goToToday}
          eventsVisible={allEvents.length}
        />
      </div>

      {canCreateEvents && (
        <CreateEventDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          selectedDate={selectedDate}
          onCreated={handleEventCreated}
          externalEvent={importingEvent}
        />
      )}

      <ExternalEventPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        event={previewEvent}
        onImport={handleImportExternal}
        onConvertAsIs={handleConvertAsIs}
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

function buildPeriodLabel(date: Date, view: CalendarViewType): string {
  switch (view) {
    case "month":
    case "agenda":
      return format(date, "MMMM yyyy");
    case "week": {
      const start = startOfWeek(date, { weekStartsOn: 0 });
      const end = endOfWeek(date, { weekStartsOn: 0 });
      const sameMonth = format(start, "MMM") === format(end, "MMM");
      return sameMonth
        ? `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
        : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    }
    case "day":
      return format(date, "EEEE, MMM d, yyyy");
  }
}

function CalendarSidebar({
  currentDate,
  eventsByDate,
  myCalendarOn,
  onToggleMyCalendar,
  subscriptions,
  externalVisibility,
  onToggleSubscription,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  eventsVisible,
}: {
  currentDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  myCalendarOn: boolean;
  onToggleMyCalendar: () => void;
  subscriptions: CalendarSubscriptionSummary[];
  externalVisibility: Record<string, boolean>;
  onToggleSubscription: (id: string) => void;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  eventsVisible: number;
}) {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-surface-canvas lg:flex">
      <div className="px-5 pt-6">
        <MiniCalendar
          currentDate={currentDate}
          eventsByDate={eventsByDate}
          onSelectDate={onSelectDate}
          onPrevMonth={onPrevMonth}
          onNextMonth={onNextMonth}
        />

        <button
          type="button"
          onClick={onToday}
          className="mt-4 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Today
        </button>
      </div>

      <div className="px-5 pt-7">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
          Calendars
        </h3>
        <ul className="mt-3 space-y-2">
          <CalendarSidebarItem
            label="My Calendar"
            color={MY_CALENDAR_COLOR}
            checked={myCalendarOn}
            onToggle={onToggleMyCalendar}
          />
          {subscriptions.map((sub) => {
            const checked = externalVisibility[sub.id] ?? true;
            return (
              <CalendarSidebarItem
                key={sub.id}
                label={sub.name}
                color={sub.color ?? "#8b5cf6"}
                checked={checked}
                onToggle={() => onToggleSubscription(sub.id)}
              />
            );
          })}
        </ul>
      </div>

      <div className="mt-auto border-t border-border/60 px-5 py-3">
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{eventsVisible}</span>{" "}
          {eventsVisible === 1 ? "event" : "events"} visible
        </p>
      </div>
    </aside>
  );
}

function CalendarSidebarItem({
  label,
  color,
  checked,
  onToggle,
}: {
  label: string;
  color: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center gap-2 rounded-[5px] px-1 py-1 text-left transition-colors hover:bg-surface-hover/60"
      >
        <span
          className={cn(
            "h-2 w-2 shrink-0 rounded-full transition-opacity",
            checked ? "opacity-100" : "opacity-30"
          )}
          style={{ backgroundColor: color }}
        />
        <span
          className={cn(
            "truncate text-[12.5px] transition-colors",
            checked ? "text-foreground" : "text-muted-foreground/60"
          )}
        >
          {label}
        </span>
      </button>
    </li>
  );
}

function MiniCalendar({
  currentDate,
  eventsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: {
  currentDate: Date;
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDate: (date: Date) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const gridDays = eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn: 0 }),
    end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
  });

  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="grid h-6 w-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <h3 className="text-[12.5px] font-semibold tracking-tight text-foreground">
          {format(currentDate, "MMM yyyy")}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="grid h-6 w-6 place-items-center rounded-[5px] text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10.5px]">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={`${d}-${i}`} className="pb-1 font-medium text-muted-foreground/60">
            {d}
          </div>
        ))}
        {gridDays.map((day) => {
          const selected = isSameDay(day, currentDate);
          const muted = !isSameMonth(day, currentDate);
          const today = isToday(day);
          const hasEvent = (eventsByDate.get(format(day, "yyyy-MM-dd"))?.length || 0) > 0;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDate(day)}
              className={cn(
                "relative mx-auto flex h-7 w-7 items-center justify-center rounded-[6px] text-[11.5px] tabular-nums transition-colors",
                muted && !selected && "text-muted-foreground/40",
                !muted && !selected && "text-foreground/85",
                selected && "bg-brand font-semibold text-brand-foreground",
                !selected && today && "text-brand font-semibold",
                !selected && "hover:bg-surface-hover"
              )}
            >
              {format(day, "d")}
              {hasEvent && (
                <span
                  className={cn(
                    "absolute -bottom-0.5 h-[3px] w-[3px] rounded-full",
                    selected ? "bg-brand-foreground" : "bg-brand"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
