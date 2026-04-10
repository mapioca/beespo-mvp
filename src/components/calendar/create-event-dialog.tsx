"use client";

import { useEffect, useState } from "react";
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
import { DatePickerDialog } from "@/components/ui/date-picker-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function CreateEventDialog({
  open,
  onOpenChange,
  selectedDate,
  onCreated,
  onUpdated,
  eventToEdit,
  externalEvent,
}: CreateEventDialogProps) {
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
  const [durationDialogOpen, setDurationDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

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

  const scheduleSummary = [
    `Date ${dateValue ? formatPillDate(dateValue) : "TBD"}`,
    isAllDay ? "All-day" : `Time ${timeValue ? formatPillTime(timeValue) : "TBD"}`,
    isAllDay ? "Duration all-day" : `Duration ${durationMinutes.trim() ? `${durationMinutes.trim()}m` : "TBD"}`,
    eventType === "interview" ? null : `Announcement ${promoteToAnnouncement ? "On" : "Off"}`,
  ].filter(Boolean).join(" • ");

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

      if (isEditing) {
        onUpdated?.(data.event);
        toast.success("Event updated successfully.");
      } else {
        onCreated?.(data.event);
        toast.success(isImporting ? "External event imported successfully." : "Event created successfully.");
      }

      if (data.announcement) {
        toast.success("Announcement created", {
          description: "This event will be announced until it starts.",
        });
      }

      if (promoteToAnnouncement && linkedTemplateCount > 0) {
        toast.info("Template linking will be connected soon", {
          description: `${linkedTemplateCount} template${linkedTemplateCount === 1 ? "" : "s"} selected.`,
        });
      }

      onOpenChange(false);
      resetForm();

      if (!isEditing && data.meeting_id) {
        toast.success("Meeting workspace created", {
          description: "Next, choose Agenda or Program.",
        });
        window.location.href = `/meetings/${data.meeting_id}?setup=plan`;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save event.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-4 space-y-2">
          <DialogTitle>{isEditing ? "Edit Event" : isImporting ? "Import Event" : "New Event"}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Create a calendar event. Leave date/time/duration blank if details are still TBD.
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
                  onValueChange={(value) => setEventType(value as EventType)}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStagedLocation(location);
                    setLocationDialogOpen(true);
                  }}
                  disabled={isLoading}
                  className={pillClass(Boolean(location))}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {location ? `Location: ${location}` : "Location: TBD"}
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDateDialogOpen(true)}
                  disabled={isLoading}
                  className={pillClass(Boolean(dateValue))}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <CalendarDays className="h-2.5 w-2.5 shrink-0" />
                    {`Date: ${formatPillDate(dateValue)}`}
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTimeDialogOpen(true)}
                  disabled={isLoading || isAllDay}
                  className={pillClass(isAllDay ? true : Boolean(timeValue))}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <Clock3 className="h-2.5 w-2.5 shrink-0" />
                    {isAllDay ? "Time: all-day" : `Time: ${formatPillTime(timeValue)}`}
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

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDurationDialogOpen(true)}
                  disabled={isLoading || isAllDay}
                  className={pillClass(isAllDay ? true : Boolean(durationMinutes))}
                >
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                    <Timer className="h-2.5 w-2.5 shrink-0" />
                    {isAllDay ? "Duration: all-day" : `Duration: ${durationMinutes.trim() ? `${durationMinutes.trim()} min` : "TBD"}`}
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
                      {`Announcement: ${promoteToAnnouncement ? "On" : "Off"}`}
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
                    {`All-day: ${isAllDay ? "On" : "Off"}`}
                  </span>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                {scheduleSummary}
              </p>
            </ModalFormSection>
          </ModalFormBody>

          <ModalFormFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim()}>
              {isLoading
                ? isEditing ? "Saving..." : "Creating..."
                : isEditing ? "Save Changes" : isImporting ? "Import Event" : "Create Event"}
            </Button>
          </ModalFormFooter>
        </ModalForm>
      </DialogContent>

      <DatePickerDialog
        open={dateDialogOpen}
        onOpenChange={setDateDialogOpen}
        titleAccent="date"
        description="Set the event date. Leave it blank to keep the event date as TBD."
        saveLabel="Save date"
        value={dateValue}
        onSave={setDateValue}
      />

      <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set location</DialogTitle>
            <DialogDescription>Add a location for this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="event-location-dialog">Location</Label>
            <Input
              id="event-location-dialog"
              value={stagedLocation}
              onChange={(e) => setStagedLocation(e.target.value)}
              placeholder="e.g., Relief Society Room"
              disabled={isLoading}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setLocationDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setLocation(stagedLocation.trim());
                setLocationDialogOpen(false);
              }}
              disabled={isLoading}
            >
              Save location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set time</DialogTitle>
            <DialogDescription>Select a time for this event.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="event-time-dialog">Time</Label>
            <Input
              id="event-time-dialog"
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Clear the value to keep time as TBD.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTimeDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setTimeDialogOpen(false)} disabled={isLoading}>
              Save time
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={durationDialogOpen} onOpenChange={setDurationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Set duration</DialogTitle>
            <DialogDescription>Set duration in minutes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="event-duration-dialog">Duration (minutes)</Label>
            <Input
              id="event-duration-dialog"
              type="number"
              min={1}
              max={1440}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g., 60"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">Leave empty to keep duration as TBD.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDurationDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={() => setDurationDialogOpen(false)} disabled={isLoading}>
              Save duration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
