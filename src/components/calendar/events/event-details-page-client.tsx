"use client";

import Link from "next/link";
import { addMinutes, format } from "date-fns";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
  DetailsPanel,
  DetailsPanelField,
  DetailsPanelSection,
} from "@/components/ui/details-panel";
import {
  SettingsPageShell,
  SettingsSection,
  SettingsGroup,
  SettingsRow,
  settingsInputClassName,
} from "@/components/settings/settings-surface";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  ExternalLink,
  Loader2,
  MapPin,
  PanelsTopLeft,
  Users,
} from "lucide-react";

type PlanType = "agenda" | "program";
type Modality = "online" | "in_person" | "hybrid";

interface LinkedMeeting {
  id: string;
  title: string;
  status: string;
  plan_type: PlanType | null;
  modality: Modality | null;
  workspace_meeting_id: string | null;
}

interface EventDetail {
  id: string;
  title: string;
  event_type: string | null;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string;
  is_all_day: boolean;
  date_tbd: boolean | null;
  time_tbd: boolean | null;
  duration_mode: string | null;
  duration_minutes: number | null;
}

interface EventDetailsPageClientProps {
  event: EventDetail;
  meeting: LinkedMeeting | null;
}

const MODALITY_LABELS: Record<Modality, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  agenda: "Agenda",
  program: "Program",
};

const PLAN_TYPE_ICONS: Record<PlanType, typeof ClipboardList> = {
  agenda: ClipboardList,
  program: PanelsTopLeft,
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function buildTimeOptions(stepMinutes = 15): string[] {
  const options: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += stepMinutes) {
      options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return options;
}
const TIME_OPTIONS = buildTimeOptions(15);

const detailsRowClassName = "min-h-[3.5rem] hover:bg-transparent";

function formatEventWhen(event: EventDetail): string {
  if (event.date_tbd) return "Date TBD";
  const start = new Date(event.start_at);
  if (event.is_all_day || event.duration_mode === "all_day") {
    return format(start, "MMMM d, yyyy");
  }
  if (event.time_tbd) return `${format(start, "MMMM d, yyyy")} · Time TBD`;
  return format(start, "MMMM d, yyyy · h:mm a");
}

function formatDuration(event: EventDetail): string | null {
  if (event.is_all_day || event.duration_mode === "all_day") return "All day";
  if (event.duration_mode === "tbd" || event.time_tbd) return "Duration TBD";
  if (!event.duration_minutes) return null;
  const h = Math.floor(event.duration_minutes / 60);
  const m = event.duration_minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function toTitleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EventDetailsPageClient({
  event,
  meeting,
}: EventDetailsPageClientProps) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [isAllDay, setIsAllDay] = useState(event.is_all_day || event.duration_mode === "all_day");
  const [date, setDate] = useState(format(new Date(event.start_at), "yyyy-MM-dd"));
  const [time, setTime] = useState(format(new Date(event.start_at), "HH:mm"));
  const [durationMinutes, setDurationMinutes] = useState(
    event.duration_minutes ? String(event.duration_minutes) : "60"
  );

  const planType = meeting?.plan_type ?? null;
  const PlanIcon = planType ? PLAN_TYPE_ICONS[planType] : null;
  const when = useMemo(() => formatEventWhen(event), [event]);
  const duration = useMemo(() => formatDuration(event), [event]);
  const eventTypeLabel = event.event_type ? toTitleCase(event.event_type) : null;

  useEffect(() => {
    if (!isEditOpen) return;
    setTitle(event.title);
    setLocation(event.location ?? "");
    setDescription(event.description ?? "");
    setIsAllDay(event.is_all_day || event.duration_mode === "all_day");
    setDate(format(new Date(event.start_at), "yyyy-MM-dd"));
    setTime(format(new Date(event.start_at), "HH:mm"));
    setDurationMinutes(event.duration_minutes ? String(event.duration_minutes) : "60");
  }, [event, isEditOpen]);

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const fallbackDate = date || format(new Date(), "yyyy-MM-dd");
    const fallbackTime = isAllDay ? "00:00" : (time || "09:00");
    const start = new Date(`${fallbackDate}T${fallbackTime}:00`);
    const parsedDuration = Number.parseInt(durationMinutes, 10);
    const hasDuration = Number.isFinite(parsedDuration) && parsedDuration > 0;
    const end = isAllDay
      ? new Date(`${fallbackDate}T23:59:59`)
      : addMinutes(start, hasDuration ? parsedDuration : 60);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/events/${event.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            location: location.trim() || null,
            description: description.trim() || null,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            is_all_day: isAllDay,
            date_tbd: false,
            time_tbd: !isAllDay && !time,
            duration_mode: isAllDay ? "all_day" : hasDuration ? "minutes" : "tbd",
            duration_minutes: !isAllDay && hasDuration ? parsedDuration : null,
          }),
        });

        const data = await response.json() as { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to update event");

        toast.success("Event updated.");
        setIsEditOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update event.");
      }
    });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <SettingsPageShell
          title={event.title}
          description={eventTypeLabel ? `${when} · ${eventTypeLabel}` : when}
          className="max-w-2xl"
          contentClassName="space-y-6"
          headerClassName="pb-4 [&>h1]:font-medium [&>h1]:tracking-[-0.01em] [&>h1]:text-foreground/90 [&>p]:text-[13px] [&>p]:text-muted-foreground"
        >
          <div className="flex justify-end">
            <Button
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs font-medium"
              onClick={() => setIsEditOpen(true)}
            >
              Edit details
            </Button>
          </div>

          <SettingsSection
            title="Event details"
            titleClassName="text-[14px] font-medium text-foreground/85"
          >
            <SettingsGroup>
              {event.location && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Location"
                  description={event.location}
                />
              )}
              <SettingsRow
                dividerStyle="inset"
                className={detailsRowClassName}
                leading={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />}
                title="Date"
                description={when}
              />
              {duration && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<Clock3 className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Duration"
                  description={duration}
                />
              )}
              {eventTypeLabel && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Type"
                  description={eventTypeLabel}
                />
              )}
            </SettingsGroup>

            {event.description && (
              <div className="rounded-[var(--settings-surface-radius)] border border-[hsl(var(--settings-surface-border))] bg-[hsl(var(--settings-surface-bg))] px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)]">
                <p className="mb-1 text-[length:var(--settings-meta-size)] font-medium text-muted-foreground">
                  Description
                </p>
                <p
                  className="text-[length:var(--settings-body-size)] leading-relaxed text-foreground/85 [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}
          </SettingsSection>

          {meeting ? (
            <SettingsSection
              title="Meeting workspace"
              description={
                planType
                  ? `This event has a linked ${PLAN_TYPE_LABELS[planType].toLowerCase()} workspace.`
                  : "This event has a linked meeting workspace."
              }
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <SettingsGroup>
                {planType && PlanIcon && (
                  <SettingsRow
                    dividerStyle="inset"
                    className={detailsRowClassName}
                    leading={<PlanIcon className="h-3.5 w-3.5 text-muted-foreground" />}
                    title="Plan type"
                    description={PLAN_TYPE_LABELS[planType]}
                    trailing={
                      <Badge
                        variant="outline"
                        className="h-6 rounded-full border-[hsl(var(--settings-divider))] bg-[hsl(var(--settings-input-bg))] px-2.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {STATUS_LABELS[meeting.status] ?? meeting.status}
                      </Badge>
                    }
                  />
                )}
                {meeting.modality && (
                  <SettingsRow
                    dividerStyle="inset"
                    className={detailsRowClassName}
                    leading={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                    title="Format"
                    description={MODALITY_LABELS[meeting.modality]}
                  />
                )}
              </SettingsGroup>

              <div className="flex gap-3">
                <Button asChild className="h-9 rounded-lg">
                  <Link href={`/meetings/${meeting.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open {planType ? PLAN_TYPE_LABELS[planType].toLowerCase() : "meeting"}
                  </Link>
                </Button>
              </div>
            </SettingsSection>
          ) : event.event_type === "meeting" ? (
            <SettingsSection
              title="Meeting workspace"
              description="No workspace is linked to this meeting yet."
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <div className="flex gap-3">
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href="/events/new?plan=agenda">
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Create agenda
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-9 rounded-lg">
                  <Link href="/events/new?plan=program">
                    <PanelsTopLeft className="mr-2 h-4 w-4" />
                    Create program
                  </Link>
                </Button>
              </div>
            </SettingsSection>
          ) : null}
        </SettingsPageShell>
      </div>

      <DetailsPanel
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit event"
      >
        <DetailsPanelSection title="Event details">
          <DetailsPanelField label="Title">
            <Input
              value={title}
              onChange={(eventInput) => setTitle(eventInput.target.value)}
              className={settingsInputClassName}
              placeholder="Event title"
              disabled={isSaving}
            />
          </DetailsPanelField>

          <DetailsPanelField label="Type">
            <span className="text-sm font-normal text-foreground/85">
              {eventTypeLabel ?? "Event"}
            </span>
          </DetailsPanelField>

          <DetailsPanelField label="Date">
            <div className="space-y-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    className={`${settingsInputClassName} w-[160px] justify-start pl-3 pr-3 font-normal`}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                    {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                      month: "2-digit",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DateCalendar
                    mode="single"
                    selected={new Date(`${date}T00:00:00`)}
                    onSelect={(selected) => {
                      if (!selected) return;
                      setDate(format(selected, "yyyy-MM-dd"));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2">
                <Checkbox
                  variant="form"
                  id="edit-all-day"
                  checked={isAllDay}
                  onCheckedChange={(checked) => setIsAllDay(checked === true)}
                  disabled={isSaving}
                />
                <Label htmlFor="edit-all-day" className="text-sm font-normal text-muted-foreground">
                  All day
                </Label>
              </div>
            </div>
          </DetailsPanelField>

          {!isAllDay && (
            <>
              <DetailsPanelField label="Start time">
                <div className="max-w-[160px]">
                  <Select value={time} onValueChange={setTime} disabled={isSaving}>
                    <SelectTrigger className={settingsInputClassName}>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[10rem]">
                      {TIME_OPTIONS.map((timeOption) => {
                        const [hour, minute] = timeOption.split(":").map(Number);
                        const datetime = new Date();
                        datetime.setHours(hour, minute, 0, 0);
                        const label = datetime.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        });
                        return (
                          <SelectItem key={timeOption} value={timeOption}>
                            {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </DetailsPanelField>

              <DetailsPanelField label="Duration (min)">
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(eventInput) => setDurationMinutes(eventInput.target.value)}
                  placeholder="60"
                  min={1}
                  max={1440}
                  disabled={isSaving}
                  className={`${settingsInputClassName} max-w-[120px]`}
                />
              </DetailsPanelField>
            </>
          )}

          <DetailsPanelField label="Location">
            <Input
              value={location}
              onChange={(eventInput) => setLocation(eventInput.target.value)}
              className={settingsInputClassName}
              placeholder="e.g., Relief Society Room"
              disabled={isSaving}
            />
          </DetailsPanelField>

          <DetailsPanelField label="Description">
            <Textarea
              value={description}
              onChange={(eventInput) => setDescription(eventInput.target.value)}
              className={`${settingsInputClassName} min-h-[92px] resize-none`}
              placeholder="Add details"
              disabled={isSaving}
            />
          </DetailsPanelField>
        </DetailsPanelSection>

        <DetailsPanelSection className="pt-2 space-y-0 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setIsEditOpen(false)}
            disabled={isSaving}
            className="h-10 rounded-[14px] px-8 text-sm font-medium leading-none text-foreground/80 bg-[hsl(var(--settings-surface-bg))] hover:bg-[hsl(var(--settings-row-hover))] hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !title.trim()}
            className="h-10 rounded-[14px] px-8 text-sm font-medium leading-none"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DetailsPanelSection>
      </DetailsPanel>
    </>
  );
}
