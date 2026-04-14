"use client";

import { useState, useTransition } from "react";
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
  SettingsPageShell,
  SettingsSection,
  SettingsGroup,
  SettingsFieldRow,
  settingsInputClassName,
} from "@/components/settings/settings-surface";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "activity" | "interview" | "meeting";
type PlanType = "agenda" | "program";
type Modality = "online" | "in_person" | "hybrid";

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

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex h-10 rounded-lg border border-[hsl(var(--settings-input-border))] bg-muted/20 p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-8 rounded-md px-3 text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value
              ? "bg-background text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-background/35",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

const EVENT_TYPE_OPTIONS: SegmentedOption<EventType>[] = [
  { value: "activity", label: "Activity" },
  { value: "interview", label: "Interview" },
  { value: "meeting", label: "Meeting" },
];

const MODALITY_OPTIONS: SegmentedOption<Modality>[] = [
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

  const isMeeting = eventType === "meeting";
  const isSubmitting = isPending;

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): string | null {
    if (!title.trim()) return "Title is required.";
    if (isMeeting && !planType) return "Please select a plan type (agenda or program).";
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
      promote_to_announcement: false,
    };

    if (isMeeting) {
      payload.meeting = {
        title: title.trim(),
        plan_type: planType,
        template_id: null,
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
    <form onSubmit={handleSubmit} className="flex h-full flex-col bg-[hsl(var(--settings-canvas))]">
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
        <SettingsPageShell
          title="Create event"
          description="Capture the details for this event."
          className="max-w-2xl"
          contentClassName="space-y-6"
          headerClassName="pb-4 [&>h1]:font-medium [&>h1]:tracking-[-0.01em] [&>h1]:text-foreground/90 [&>p]:text-[13px] [&>p]:text-muted-foreground"
        >
          {/* ── Section 1: Event details ───────────────────────────────── */}
          <SettingsSection
            title="Event details"
            titleClassName="text-[14px] font-medium text-foreground/85"
            descriptionClassName="text-[13px]"
          >
            <SettingsGroup className="[&>div]:md:grid-cols-[11rem_minmax(0,1fr)]">
              <SettingsFieldRow label="Title" labelClassName="font-normal text-foreground/80" dividerStyle="inset" align="center">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Ward Council"
                  maxLength={200}
                  disabled={isSubmitting}
                  className={settingsInputClassName}
                  autoFocus
                />
              </SettingsFieldRow>

              <SettingsFieldRow label="Type" labelClassName="font-normal text-foreground/80" dividerStyle="inset" align="center">
                <SegmentedControl
                  value={eventType}
                  onChange={(v) => {
                    setEventType(v);
                    if (v !== "meeting") setPlanType(null);
                  }}
                  options={EVENT_TYPE_OPTIONS}
                  disabled={isSubmitting}
                />
              </SettingsFieldRow>

              <SettingsFieldRow label="Location" labelClassName="font-normal text-foreground/80" dividerStyle="inset" align="center">
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Relief Society Room"
                    maxLength={200}
                    disabled={isSubmitting}
                    className={cn(settingsInputClassName, "pl-9")}
                  />
                </div>
              </SettingsFieldRow>

              <SettingsFieldRow label="Description" labelClassName="font-normal text-foreground/80" dividerStyle="none" align="start">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any relevant details..."
                  disabled={isSubmitting}
                    className={cn(
                      settingsInputClassName,
                      "min-h-[96px] resize-none"
                    )}
                />
              </SettingsFieldRow>
            </SettingsGroup>
          </SettingsSection>

          {/* ── Section 2: When ────────────────────────────────────────── */}
          <SettingsSection title="When" titleClassName="text-[14px] font-medium text-foreground/85">
            <SettingsGroup className="[&>div]:md:grid-cols-[11rem_minmax(0,1fr)]">
              <SettingsFieldRow label="Date" labelClassName="font-normal text-foreground/80" dividerStyle="inset" align="center">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 max-w-[200px]">
                    <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      disabled={isSubmitting}
                      className={cn(settingsInputClassName, "pl-9")}
                    />
                  </div>
                  <div className="flex items-center gap-2 pl-1">
                    <Checkbox
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
              </SettingsFieldRow>

              {!isAllDay && (
                <>
                  <SettingsFieldRow label="Start time" labelClassName="font-normal text-foreground/80" dividerStyle="inset" align="center">
                    <div className="relative max-w-[160px]">
                      <Clock3 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <select
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        disabled={isSubmitting}
                        className={cn(
                          settingsInputClassName,
                          "h-10 w-full appearance-none rounded-md border pl-9 pr-3 text-sm bg-[hsl(var(--settings-input-bg))] focus:outline-none"
                        )}
                      >
                        {TIME_OPTIONS.map((t) => {
                          const [h, m] = t.split(":").map(Number);
                          const d = new Date();
                          d.setHours(h, m, 0, 0);
                          const label = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
                          return (
                            <option key={t} value={t}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </SettingsFieldRow>

                  <SettingsFieldRow label="Duration (min)" labelClassName="font-normal text-foreground/80" dividerStyle="none" align="center">
                    <Input
                      type="number"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      placeholder="60"
                      min={1}
                      max={1440}
                      disabled={isSubmitting}
                      className={cn(settingsInputClassName, "max-w-[120px]")}
                    />
                  </SettingsFieldRow>
                </>
              )}
            </SettingsGroup>
          </SettingsSection>

          {/* ── Section 3: Meeting (conditional) ──────────────────────── */}
          {isMeeting && (
            <SettingsSection
              title="Meeting"
              titleClassName="text-[14px] font-medium text-foreground/85"
            >
              <SettingsGroup className="[&>div]:md:grid-cols-[11rem_minmax(0,1fr)]">
                <SettingsFieldRow label="Format" labelClassName="font-normal text-foreground/80" dividerStyle="none" align="center">
                  <SegmentedControl
                    value={modality}
                    onChange={setModality}
                    options={MODALITY_OPTIONS}
                    disabled={isSubmitting}
                  />
                </SettingsFieldRow>
              </SettingsGroup>

              <div className="space-y-1">
                <p className="text-[14px] font-medium text-foreground/85">Plan type</p>
                <p className="text-[12px] text-muted-foreground">
                  Choose a plan type. This cannot be changed later.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <PlanTypeCard
                  type="agenda"
                  selected={planType === "agenda"}
                  onSelect={() => setPlanType("agenda")}
                  disabled={isSubmitting}
                />
                <PlanTypeCard
                  type="program"
                  selected={planType === "program"}
                  onSelect={() => setPlanType("program")}
                  disabled={isSubmitting}
                />
              </div>
            </SettingsSection>
          )}
        </SettingsPageShell>
      </div>

      {/* ── Sticky footer ────────────────────────────────────────────────── */}
      <div className="border-t border-border/40 bg-[hsl(var(--settings-canvas))]/88 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-[hsl(var(--settings-canvas))]/82">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !title.trim()}>
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
