"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addMinutes, differenceInMinutes, format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormRichTextEditor } from "@/components/ui/form-rich-text-editor";
import { toast } from "@/lib/toast";
import { parseAllDayDate } from "@/lib/calendar-helpers";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ModalForm,
  ModalFormBody,
  ModalFormFooter,
  ModalFormSection,
} from "@/components/ui/modal-form-layout";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock3, Link2, MapPin, Megaphone, SunMedium, Timer, X } from "lucide-react";

type EventType = "interview" | "meeting" | "activity";
type TemplateKind = "agenda" | "program" | "unknown";

interface TemplateOption {
  id: string;
  name: string;
  kind: TemplateKind;
}

// Event type returned from API
export interface CalendarEventData {
  id: string;
  title: string;
  event_type?: EventType;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  date_tbd?: boolean;
  time_tbd?: boolean;
  duration_mode?: "minutes" | "tbd" | "all_day";
  duration_minutes?: number | null;
  workspace_event_id: string | null;
  external_source_id: string | null;
  external_source_type: string | null;
  announcements?: Array<{ id: string; title: string; status: string }> | null;
}

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | null;
  onCreated?: (event: CalendarEventData) => void;
  onUpdated?: (event: CalendarEventData) => void;
  eventToEdit?: CalendarEventData | null;
  externalEvent?: {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    start_date: string;
    end_date: string | null;
    is_all_day: boolean;
    external_uid?: string;
  } | null;
}

const EVENT_TYPE_HELP: Record<EventType, string> = {
  interview: "Interview is best for one-on-one scheduling without a full meeting workspace.",
  meeting: "Meeting creates a linked meeting workspace so you can attach an agenda or program next.",
  activity: "Activity is best for general events that do not need meeting tooling.",
};

function formatPillDate(value: string): string {
  if (!value) return "TBD";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatPillTime(value: string): string {
  if (!value) return "TBD";
  const [h, m] = value.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return value;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function buildTimeOptions(stepMinutes = 15): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions(15);

function isRichTextEmpty(value: string): boolean {
  const plain = value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return plain.length === 0;
}

function pillClass(active: boolean): string {
  return cn(
    "h-7 rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
    active
      ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
      : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
  );
}

const CREATE_ANOTHER_STORAGE_KEY = "beespo:create-event:create-another";

export function CreateEventDialog({
  open,
  onOpenChange,
  selectedDate,
  onCreated,
  onUpdated,
  eventToEdit,
  externalEvent,
}: CreateEventDialogProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!eventToEdit;
  const isImporting = !!externalEvent;

  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("activity");
  const [location, setLocation] = useState("");
  const [stagedLocation, setStagedLocation] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [description, setDescription] = useState("");
  const [promoteToAnnouncement, setPromoteToAnnouncement] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<"agenda" | "program">("agenda");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedAgendaTemplateIds, setSelectedAgendaTemplateIds] = useState<string[]>([]);
  const [selectedProgramTemplateIds, setSelectedProgramTemplateIds] = useState<string[]>([]);
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [timeDialogSelection, setTimeDialogSelection] = useState("09:00");
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);
  const batchCreatedEventIdsRef = useRef<string[]>([]);

  useEffect(() => {
    if (eventToEdit) {
      const start = new Date(eventToEdit.start_at);
      const end = new Date(eventToEdit.end_at);
      const minutes = Math.max(15, differenceInMinutes(end, start));

      setTitle(eventToEdit.title);
      setEventType(eventToEdit.event_type ?? "activity");
      setLocation(eventToEdit.location ?? "");
      setStagedLocation(eventToEdit.location ?? "");
      setDescription(eventToEdit.description ?? "");
      setIsAllDay(eventToEdit.duration_mode === "all_day" || eventToEdit.is_all_day);
      setDateValue(eventToEdit.date_tbd ? "" : format(start, "yyyy-MM-dd"));
      setTimeValue(eventToEdit.time_tbd ? "" : format(start, "HH:mm"));
      setDurationMinutes(eventToEdit.duration_mode === "minutes" ? String(eventToEdit.duration_minutes ?? minutes) : "");
      setPromoteToAnnouncement(false);
      setSelectedAgendaTemplateIds([]);
      setSelectedProgramTemplateIds([]);
      return;
    }

    if (externalEvent) {
      const start = externalEvent.is_all_day
        ? parseAllDayDate(externalEvent.start_date)
        : new Date(externalEvent.start_date);

      setTitle(externalEvent.title);
      setEventType("activity");
      setLocation(externalEvent.location ?? "");
      setStagedLocation(externalEvent.location ?? "");
      setDescription(externalEvent.description ?? "");
      setDateValue(format(start, "yyyy-MM-dd"));
      setTimeValue(externalEvent.is_all_day ? "" : format(start, "HH:mm"));
      setIsAllDay(externalEvent.is_all_day);

      if (!externalEvent.is_all_day && externalEvent.end_date) {
        const end = new Date(externalEvent.end_date);
        setDurationMinutes(String(Math.max(15, differenceInMinutes(end, start))));
      } else {
        setDurationMinutes("");
      }

      setPromoteToAnnouncement(false);
      setSelectedAgendaTemplateIds([]);
      setSelectedProgramTemplateIds([]);
      return;
    }

    const baseDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
    setTitle("");
    setEventType("activity");
    setLocation("");
    setStagedLocation("");
    setDateValue(baseDate);
    setTimeValue("");
    setDurationMinutes("");
    setIsAllDay(false);
    setDescription("");
    setPromoteToAnnouncement(false);
    setSelectedAgendaTemplateIds([]);
    setSelectedProgramTemplateIds([]);
  }, [eventToEdit, externalEvent, selectedDate, open]);

  useEffect(() => {
    if (!timeDialogOpen) return;
    setTimeDialogSelection(timeValue || "09:00");
  }, [timeDialogOpen, timeValue]);

  useEffect(() => {
    if (!open || isEditing || isImporting) return;
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem(CREATE_ANOTHER_STORAGE_KEY);
    setCreateAnother(stored === "1");
    batchCreatedEventIdsRef.current = [];
    toast.dismiss("event-create-result");
  }, [open, isEditing, isImporting]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(CREATE_ANOTHER_STORAGE_KEY, createAnother ? "1" : "0");
  }, [createAnother]);

  useEffect(() => {
    if (eventType === "interview") {
      setPromoteToAnnouncement(false);
      setSelectedAgendaTemplateIds([]);
      setSelectedProgramTemplateIds([]);
    }
  }, [eventType]);

  useEffect(() => {
    if (!templateDialogOpen || templateOptions.length > 0) return;

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      const supabase = createClient();

      const { data, error } = await (supabase
        .from("templates") as ReturnType<typeof supabase.from>)
        .select("id, name, template_kind")
        .order("name");

      if (!error && data) {
        setTemplateOptions(
          (data as Array<{ id: string; name: string; template_kind?: "agenda" | "program" | null }>)
            .map((template) => ({
              id: template.id,
              name: template.name,
              kind: template.template_kind === "program"
                ? "program"
                : template.template_kind === "agenda"
                  ? "agenda"
                  : "unknown",
            }))
        );
        setLoadingTemplates(false);
        return;
      }

      const { data: fallback, error: fallbackError } = await (supabase
        .from("templates") as ReturnType<typeof supabase.from>)
        .select("id, name")
        .order("name");

      if (!fallbackError && fallback) {
        setTemplateOptions(
          (fallback as Array<{ id: string; name: string }>).map((template) => ({
            id: template.id,
            name: template.name,
            kind: "agenda",
          }))
        );
      } else {
        toast.error("Failed to load templates.");
      }

      setLoadingTemplates(false);
    };

    void fetchTemplates();
  }, [templateDialogOpen, templateOptions.length]);

  const linkedTemplateCount = selectedAgendaTemplateIds.length + selectedProgramTemplateIds.length;
  const agendaTemplates = templateOptions.filter((template) => template.kind === "agenda" || template.kind === "unknown");
  const programTemplates = templateOptions.filter((template) => template.kind === "program");

  const resetForm = () => {
    setTitle("");
    setEventType("activity");
    setLocation("");
    setStagedLocation("");
    setDateValue("");
    setTimeValue("");
    setDurationMinutes("");
    setIsAllDay(false);
    setDescription("");
    setPromoteToAnnouncement(false);
    setSelectedAgendaTemplateIds([]);
    setSelectedProgramTemplateIds([]);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isEditing && batchCreatedEventIdsRef.current.length > 0) {
      const uniqueIds = Array.from(new Set(batchCreatedEventIdsRef.current));
      const count = uniqueIds.length;
      const createdParam = encodeURIComponent(uniqueIds.join(","));
      toast.dismiss("event-create-result");
              toast.success(`${count} event${count === 1 ? "" : "s"} created.`, {
        id: "event-create-summary",
        duration: 10000,
        actions: [
          {
            label: `View ${count} event${count === 1 ? "" : "s"} created`,
            onClick: () => {
              toast.dismiss("event-create-summary");
              window.location.href = `/schedule/events?created=${createdParam}`;
            },
          },
        ],
      });
      batchCreatedEventIdsRef.current = [];
    }
    onOpenChange(nextOpen);
  };

  const toggleAgendaTemplate = (templateId: string) => {
    setSelectedAgendaTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const toggleProgramTemplate = (templateId: string) => {
    setSelectedProgramTemplateIds((prev) =>
      prev.includes(templateId) ? prev.filter((id) => id !== templateId) : [...prev, templateId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      const dateIsTbd = !dateValue;
      const timeIsTbd = !isAllDay && !timeValue;
      const durationIsTbd = !isAllDay && !durationMinutes.trim();

      const fallbackDate = dateValue || format(selectedDate || new Date(), "yyyy-MM-dd");
      const fallbackTime = timeValue || "09:00";

      const start = new Date(`${fallbackDate}T${fallbackTime}:00`);
      if (Number.isNaN(start.getTime())) {
        throw new Error("Please provide a valid date/time or leave them blank for TBD.");
      }

      const parsedDuration = Number.parseInt(durationMinutes, 10);
      const hasDuration = Number.isFinite(parsedDuration) && parsedDuration > 0;
      if (!isAllDay && durationMinutes.trim() && !hasDuration) {
        throw new Error("Duration must be a positive number of minutes.");
      }

      const end = isAllDay
        ? new Date(`${fallbackDate}T23:59:59`)
        : addMinutes(start, hasDuration ? parsedDuration : 60);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        event_type: eventType,
        location: location.trim() || null,
        description: isRichTextEmpty(description) ? null : description,
        start_at: isAllDay ? new Date(`${fallbackDate}T00:00:00`).toISOString() : start.toISOString(),
        end_at: end.toISOString(),
        is_all_day: isAllDay,
        date_tbd: dateIsTbd,
        time_tbd: timeIsTbd,
        duration_mode: isAllDay ? "all_day" : durationIsTbd ? "tbd" : "minutes",
        duration_minutes: !isAllDay && hasDuration ? parsedDuration : null,
        promote_to_announcement: promoteToAnnouncement,
      };

      if (!isEditing && eventType === "meeting") {
        payload.meeting = {
          title: title.trim() || null,
          plan_type: null,
          template_id: null,
        };
      }

      if (externalEvent?.external_uid) {
        payload.external_source_id = externalEvent.external_uid;
        payload.external_source_type = "ics";
      }

      const endpoint = isEditing ? `/api/events/${eventToEdit.id}` : "/api/events";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to save event");
      const createdMeetingId = !isEditing ? (data.meeting_id as string | undefined) : undefined;
      const keepsCreating = !isEditing && createAnother;

      if (isEditing) {
        onUpdated?.(data.event);
        toast.success("Event updated successfully.");
      } else {
        onCreated?.(data.event);
        const eventId = data.event?.id as string | undefined;
        const eventTitle = (data.event?.title as string | undefined) ?? title.trim();
        if (eventId) {
          batchCreatedEventIdsRef.current = [...batchCreatedEventIdsRef.current, eventId];
        }
        const detailParts: string[] = [];
        if (data.announcement) {
          detailParts.push("Announcement enabled.");
        }
        if (promoteToAnnouncement && linkedTemplateCount > 0) {
          detailParts.push(`Template linkage selected: ${linkedTemplateCount}.`);
        }
        if (createdMeetingId) {
          detailParts.push("Meeting workspace linked.");
        }
        toast.info(`Created: "${eventTitle}".`, {
          id: "event-create-result",
          duration: 3000,
          description: detailParts.join(" "),
        });
      }

      if (data.announcement && isEditing) {
        toast.success("Announcement created", {
          description: "This event will be announced until it starts.",
        });
      }

      if (promoteToAnnouncement && linkedTemplateCount > 0 && isEditing) {
        toast.info("Template linking will be connected soon", {
          description: `${linkedTemplateCount} template${linkedTemplateCount === 1 ? "" : "s"} selected.`,
        });
      }

      if (keepsCreating) {
        setTitle("");
        setDescription("");
      } else {
        handleDialogOpenChange(false);
        resetForm();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-4 space-y-2">
          <DialogTitle>{isEditing ? "Edit Event" : isImporting ? "Import Event" : "New Event"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a calendar event.
          </DialogDescription>
        </DialogHeader>

        <ModalForm onSubmit={handleSubmit}>
          <ModalFormBody className="space-y-4 pt-1 pb-2">
            <ModalFormSection>
              <div className="space-y-2">
                <Label htmlFor="event-title">Title*</Label>
                <Input
                  id="event-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ward Council"
                  maxLength={200}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Event description</Label>
                <FormRichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Optional details..."
                  disabled={isLoading}
                  hasError={false}
                  minHeight="8rem"
                />
              </div>
            </ModalFormSection>

            <ModalFormSection>
              <div className="space-y-2">
                <Label htmlFor="event-type">Event type</Label>
                <Select
                  value={eventType}
                  onValueChange={(value) => {
                    if (value === "meeting" && !isEditing) {
                      // Route to the unified create page which handles meeting+plan setup
                      onOpenChange(false);
                      const dateParam = dateValue ? `&date=${dateValue}` : "";
                      router.push(`/events/new?type=meeting${dateParam}`);
                      return;
                    }
                    setEventType(value as EventType);
                  }}
                  disabled={isLoading || isEditing}
                >
                  <SelectTrigger id="event-type" className="w-full sm:w-[280px]">
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{EVENT_TYPE_HELP[eventType]}</p>
              </div>
            </ModalFormSection>

            <ModalFormSection>
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStagedLocation(location)}
                      disabled={isLoading}
                      className={pillClass(Boolean(location))}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />
                        {location ? location : "Set location"}
                        {location && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setLocation("");
                            }}
                            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                          >
                            <X className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[280px] p-3" align="start">
                    <div className="space-y-2">
                      <Label htmlFor="event-location-popover">Location</Label>
                      <Input
                        id="event-location-popover"
                        value={stagedLocation}
                        onChange={(e) => {
                          const next = e.target.value;
                          setStagedLocation(next);
                          setLocation(next.trimStart());
                        }}
                        placeholder="e.g., Relief Society Room"
                        disabled={isLoading}
                      />
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading}
                      className={pillClass(Boolean(dateValue))}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                        <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                        {dateValue ? formatPillDate(dateValue) : "Set date"}
                        {dateValue && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDateValue("");
                            }}
                            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                          >
                            <X className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-3" align="start">
                    <div className="space-y-2">
                      <Label htmlFor="event-date-popover">Date</Label>
                      <Input
                        id="event-date-popover"
                        type="date"
                        value={dateValue}
                        onChange={(e) => setDateValue(e.target.value)}
                        disabled={isLoading}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDateValue("");
                            setDateDialogOpen(false);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setTimeDialogSelection(timeValue || "09:00")}
                      disabled={isLoading || isAllDay}
                      className={pillClass(isAllDay ? true : Boolean(timeValue))}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                        <Clock3 className="h-2.5 w-2.5 shrink-0" />
                        {isAllDay ? "All-day" : (timeValue ? formatPillTime(timeValue) : "Set time")}
                        {timeValue && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setTimeValue("");
                            }}
                            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                          >
                            <X className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-3" align="start">
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Select
                        value={timeDialogSelection}
                        onValueChange={(next) => {
                          setTimeDialogSelection(next);
                          setTimeValue(next);
                          setTimeDialogOpen(false);
                        }}
                      >
                        <SelectTrigger className="h-9 w-full">
                          <SelectValue placeholder="Select time">{formatPillTime(timeDialogSelection)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {formatPillTime(option)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLoading || isAllDay}
                      className={pillClass(isAllDay ? true : Boolean(durationMinutes))}
                    >
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                        <Timer className="h-2.5 w-2.5 shrink-0" />
                        {isAllDay ? "All-day duration" : (durationMinutes.trim() ? `${durationMinutes.trim()} min` : "Set duration")}
                        {durationMinutes && (
                          <span
                            role="button"
                            tabIndex={-1}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDurationMinutes("");
                            }}
                            className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                          >
                            <X className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[240px] p-3" align="start">
                    <div className="space-y-2">
                      <Label htmlFor="event-duration-popover">Duration (minutes)</Label>
                      <Input
                        id="event-duration-popover"
                        type="number"
                        min={1}
                        max={1440}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                        placeholder="e.g., 60"
                        disabled={isLoading}
                      />
                      <div className="flex justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDurationMinutes("")}
                        >
                          Clear
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDurationDialogOpen(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {eventType !== "interview" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPromoteToAnnouncement((prev) => !prev)}
                    disabled={isLoading}
                    className={pillClass(promoteToAnnouncement)}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      <Megaphone className="h-2.5 w-2.5 shrink-0" />
                      {promoteToAnnouncement ? "Announcement on" : "Enable announcement"}
                    </span>
                  </Button>
                )}

                {eventType !== "interview" && promoteToAnnouncement && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTemplateDialogOpen(true)}
                    disabled={isLoading}
                    className={pillClass(linkedTemplateCount > 0)}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                      <Link2 className="h-2.5 w-2.5 shrink-0" />
                      {linkedTemplateCount > 0 ? `Template: ${linkedTemplateCount} linked` : "Link to template"}
                      {linkedTemplateCount > 0 && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedAgendaTemplateIds([]);
                            setSelectedProgramTemplateIds([]);
                          }}
                          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/20"
                        >
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAllDay((prev) => !prev)}
                  disabled={isLoading}
                  className={pillClass(isAllDay)}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <SunMedium className="h-2.5 w-2.5 shrink-0" />
                    {isAllDay ? "All-day on" : "Mark all-day"}
                  </span>
                </Button>
              </div>
            </ModalFormSection>
          </ModalFormBody>

          <ModalFormFooter className="justify-between">
            {!isEditing && (
              <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox
                  checked={createAnother}
                  onCheckedChange={(checked) => setCreateAnother(Boolean(checked))}
                  disabled={isLoading}
                  className="rounded-[2px]"
                />
                Create another
              </label>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => handleDialogOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !title.trim()}>
                {isLoading
                  ? isEditing ? "Saving..." : "Creating..."
                  : isEditing ? "Save Changes" : isImporting ? "Import Event" : "Create Event"}
              </Button>
            </div>
          </ModalFormFooter>
        </ModalForm>
      </DialogContent>

      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link to template</DialogTitle>
            <DialogDescription>
              Select one or more templates where this announcement should appear.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={templateTab} onValueChange={(value) => setTemplateTab(value as "agenda" | "program")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="agenda">Agenda templates</TabsTrigger>
              <TabsTrigger value="program">Program templates</TabsTrigger>
            </TabsList>

            <TabsContent value="agenda" className="space-y-2">
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : agendaTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No agenda templates available.</p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
                  {agendaTemplates.map((template) => (
                    <label key={template.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                      <Checkbox
                        checked={selectedAgendaTemplateIds.includes(template.id)}
                        onCheckedChange={() => toggleAgendaTemplate(template.id)}
                      />
                      <span className="text-sm">{template.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="program" className="space-y-2">
              {loadingTemplates ? (
                <p className="text-sm text-muted-foreground">Loading templates...</p>
              ) : programTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Program templates are coming soon.
                </p>
              ) : (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/60 p-2">
                  {programTemplates.map((template) => (
                    <label key={template.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/40">
                      <Checkbox
                        checked={selectedProgramTemplateIds.includes(template.id)}
                        onCheckedChange={() => toggleProgramTemplate(template.id)}
                      />
                      <span className="text-sm">{template.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTemplateDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
