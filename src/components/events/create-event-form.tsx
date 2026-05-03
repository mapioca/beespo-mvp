"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addMinutes, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { ArrowLeft, CalendarDays, Clock3, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
  FormShell,
  FormSection,
  FormField,
  formInputClassName,
} from "@/components/ui/form-surface";
import {
  SettingsSegmentedControl,
  type SettingsSegmentedOption,
} from "@/components/settings/settings-segmented-control";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "activity" | "interview" | "meeting";
type PlanType = "agenda" | "program";
type Modality = "online" | "in_person" | "hybrid";

interface TemplateOption {
  id: string;
  name: string;
  kind: PlanType;
}

export interface CreateEventFormProps {
  /** Pre-fills the event type from the URL preset. */
  initialEventType?: EventType;
  /** Pre-fills the plan type (agenda/program) from the URL preset. */
  initialPlanType?: PlanType;
  /** Pre-fills the date from the URL preset (yyyy-MM-dd). */
  initialDate?: string;
}

// ─── Helper: time options ──────────────────────────────────────────────────────

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

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlanTypeCard({
  type,
  selected,
  onSelect,
  disabled,
}: {
  type: PlanType;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  const config = {
    agenda: {
      label: "Agenda",
      description: "Internal discussion-first plan. Add discussion points, objectives, and standard items like prayer or hymns.",
    },
    program: {
      label: "Program",
      description: "Audience-facing plan. Add segments, speakers, sacrament ordinances, and business items for publication.",
    },
  } as const;

  const { label, description } = config[type];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-[hsl(var(--settings-input-focus)/0.6)] bg-background"
          : "border-[hsl(var(--settings-surface-border))] bg-[hsl(var(--settings-surface-bg))] hover:border-[hsl(var(--settings-input-border))]",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <p className="text-sm font-normal">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const EVENT_TYPE_OPTIONS: SettingsSegmentedOption<EventType>[] = [
  { value: "activity", label: "Activity" },
  { value: "interview", label: "Interview" },
  { value: "meeting", label: "Meeting" },
];

const MODALITY_OPTIONS: SettingsSegmentedOption<Modality>[] = [
  { value: "in_person", label: "In person" },
  { value: "online", label: "Online" },
  { value: "hybrid", label: "Hybrid" },
];

export function CreateEventForm({
  initialEventType = "activity",
  initialPlanType,
  initialDate,
}: CreateEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>(initialEventType);
  const [date, setDate] = useState(initialDate ?? format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  // Meeting-specific
  const [modality, setModality] = useState<Modality>("in_person");
  const [planType, setPlanType] = useState<PlanType | null>(initialPlanType ?? null);
  const [promoteToAnnouncement, setPromoteToAnnouncement] = useState(false);
  const [announcementTemplateKind, setAnnouncementTemplateKind] = useState<PlanType>("agenda");
  const [announcementTemplateId, setAnnouncementTemplateId] = useState<string>("");
  const [templateOptions, setTemplateOptions] = useState<TemplateOption[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  const isMeeting = eventType === "meeting";
  const isSubmitting = isPending;
  const availableTemplates = useMemo(
    () => templateOptions.filter((template) => template.kind === announcementTemplateKind),
    [templateOptions, announcementTemplateKind]
  );

  useEffect(() => {
    if (isMeeting) return;
    setPromoteToAnnouncement(false);
    setAnnouncementTemplateId("");
  }, [isMeeting]);

  useEffect(() => {
    if (!isMeeting || !promoteToAnnouncement || templateOptions.length > 0) return;

    const fetchTemplates = async () => {
      setIsLoadingTemplates(true);
      const supabase = createClient();

      const { data, error } = await (supabase
        .from("templates") as ReturnType<typeof supabase.from>)
        .select("id, name, template_kind")
        .order("name");

      if (!error && data) {
        const mapped = (data as Array<{ id: string; name: string; template_kind?: "agenda" | "program" | null }>)
          .map((template) => ({
            id: template.id,
            name: template.name,
            kind: (template.template_kind === "program" ? "program" : "agenda") as PlanType,
          }));
        setTemplateOptions(mapped);
        setIsLoadingTemplates(false);
        return;
      }

      const { data: fallback } = await (supabase
        .from("templates") as ReturnType<typeof supabase.from>)
        .select("id, name")
        .order("name");

      setTemplateOptions(
        (fallback as Array<{ id: string; name: string }> | null)?.map((template) => ({
          id: template.id,
          name: template.name,
          kind: "agenda",
        })) ?? []
      );
      setIsLoadingTemplates(false);
    };

    void fetchTemplates();
  }, [isMeeting, promoteToAnnouncement, templateOptions.length]);

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    return null;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const error = validate();
    if (error) {
      toast.error(error);
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

    const payload: Record<string, unknown> = {
      title: title.trim(),
      event_type: eventType,
      location: location.trim() || null,
      description: description.trim() || null,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      is_all_day: isAllDay,
      date_tbd: !date,
      time_tbd: !isAllDay && !time,
      duration_mode: isAllDay ? "all_day" : hasDuration ? "minutes" : "tbd",
      duration_minutes: !isAllDay && hasDuration ? parsedDuration : null,
      promote_to_announcement: isMeeting ? promoteToAnnouncement : false,
    };

    if (isMeeting) {
      payload.meeting = {
        title: title.trim(),
        plan_type: planType,
        template_id: promoteToAnnouncement && announcementTemplateId ? announcementTemplateId : null,
        modality,
      };
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json() as { event?: { id?: string }; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to create event");

        const eventId = data.event?.id;
        if (!eventId) throw new Error("Event ID missing from response");

        toast.success(`Created: "${title.trim()}".`);
        router.push(`/schedule/events/${eventId}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create event.");
      }
    });
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex h-full flex-col">
      {/* Back link */}
      <div className="border-b border-border/60 px-6 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <FormShell title="Create event" description="Capture the details for this event.">

          {/* ── Section 1: Event details ───────────────────────────────── */}
          <FormSection>
            <FormField label="Title" htmlFor="title">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Ward Council"
                maxLength={200}
                disabled={isSubmitting}
                className={formInputClassName}
                autoFocus
              />
            </FormField>

            <FormField label="Type" htmlFor="event-type">
              <SettingsSegmentedControl
                value={eventType}
                onChange={(v) => {
                  setEventType(v);
                  if (v !== "meeting") setPlanType(null);
                }}
                options={EVENT_TYPE_OPTIONS}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField label="Location" htmlFor="location">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Relief Society Room"
                  maxLength={200}
                  disabled={isSubmitting}
                  className={cn(formInputClassName, "pl-9")}
                />
              </div>
            </FormField>

            <FormField label="Description" htmlFor="description">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any relevant details..."
                disabled={isSubmitting}
                className={cn(formInputClassName, "h-auto min-h-[96px] resize-none py-2.5")}
              />
            </FormField>
          </FormSection>

          {/* ── Section 2: When ────────────────────────────────────────── */}
          <FormSection title="When">
            <FormField label="Date" htmlFor="date">
              <div className="flex items-center gap-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(formInputClassName, "w-[200px] justify-start pl-3 pr-3 font-normal")}
                    >
                      <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                      {date
                        ? new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                            month: "2-digit",
                            day: "2-digit",
                            year: "numeric",
                          })
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DateCalendar
                      mode="single"
                      selected={date ? new Date(`${date}T00:00:00`) : undefined}
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
                    id="all-day"
                    checked={isAllDay}
                    onCheckedChange={(checked) => setIsAllDay(checked === true)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="all-day" className="text-sm font-normal text-muted-foreground">
                    All day
                  </Label>
                </div>
              </div>
            </FormField>

            {!isAllDay && (
              <div className="flex gap-4">
                <FormField label="Start time" htmlFor="start-time" className="w-[160px]">
                  <div className="relative">
                    <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Select value={time} onValueChange={setTime} disabled={isSubmitting}>
                      <SelectTrigger id="start-time" className={cn(formInputClassName, "w-full pl-9 pr-3")}>
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[11.5rem]">
                        {TIME_OPTIONS.map((t) => {
                          const [h, m] = t.split(":").map(Number);
                          const d = new Date();
                          d.setHours(h, m, 0, 0);
                          const label = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                          return (
                            <SelectItem key={t} value={t}>
                              {label}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </FormField>

                <FormField label="Duration (min)" htmlFor="duration" className="w-[120px]">
                  <Input
                    id="duration"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    min={1}
                    max={1440}
                    disabled={isSubmitting}
                    className={formInputClassName}
                  />
                </FormField>
              </div>
            )}
          </FormSection>

          {/* ── Section 3: Meeting (conditional) ──────────────────────── */}
          {isMeeting && (
            <FormSection title="Meeting">
              <FormField label="Format">
                <SettingsSegmentedControl
                  value={modality}
                  onChange={setModality}
                  options={MODALITY_OPTIONS}
                  disabled={isSubmitting}
                />
              </FormField>

              <FormField label="Announcement">
                <div className="flex items-center gap-2">
                  <Checkbox
                    variant="form"
                    id="meeting-announcement"
                    checked={promoteToAnnouncement}
                    onCheckedChange={(checked) => setPromoteToAnnouncement(checked === true)}
                    disabled={isSubmitting}
                  />
                  <Label htmlFor="meeting-announcement" className="text-sm font-normal text-muted-foreground">
                    Enable announcement for this event
                  </Label>
                </div>
              </FormField>

              {promoteToAnnouncement && (
                <FormField label="Template" htmlFor="template">
                  <div className="space-y-2">
                    <SettingsSegmentedControl
                      value={announcementTemplateKind}
                      onChange={(kind) => {
                        setAnnouncementTemplateKind(kind);
                        setAnnouncementTemplateId("");
                      }}
                      options={[
                        { value: "agenda", label: "Meeting" },
                        { value: "program", label: "Program" },
                      ]}
                      disabled={isSubmitting || isLoadingTemplates}
                    />
                    <Select
                      value={announcementTemplateId || undefined}
                      onValueChange={setAnnouncementTemplateId}
                      disabled={isSubmitting || isLoadingTemplates || availableTemplates.length === 0}
                    >
                      <SelectTrigger id="template" className={cn(formInputClassName, "max-w-[320px]")}>
                        <SelectValue
                          placeholder={
                            isLoadingTemplates
                              ? "Loading templates..."
                              : availableTemplates.length === 0
                              ? "No templates available"
                              : "Select template"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormField>
              )}

              <FormField label="Plan type" hint="Optional. Select a plan if you want to build the meeting in Beespo.">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <PlanTypeCard
                    type="agenda"
                    selected={planType === "agenda"}
                    onSelect={() => setPlanType((current) => (current === "agenda" ? null : "agenda"))}
                    disabled={isSubmitting}
                  />
                  <PlanTypeCard
                    type="program"
                    selected={planType === "program"}
                    onSelect={() => setPlanType((current) => (current === "program" ? null : "program"))}
                    disabled={isSubmitting}
                  />
                </div>
              </FormField>
            </FormSection>
          )}

        </FormShell>
      </div>

      {/* ── Sticky footer ────────────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-app-main-card/88 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-app-main-card/82">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !title.trim()} className="h-10 bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-600)]/90">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create event"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
