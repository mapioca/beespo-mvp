import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getDashboardRequestContext } from "@/lib/dashboard/request-context";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SettingsPageShell,
  SettingsSection,
  SettingsGroup,
  SettingsRow,
} from "@/components/settings/settings-surface";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  ExternalLink,
  MapPin,
  PanelsTopLeft,
  Users,
} from "lucide-react";
import type { Metadata } from "next";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  meetings: LinkedMeeting[] | null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
    .select("title")
    .eq("id", id)
    .single();
  const title = (data as { title?: string } | null)?.title ?? "Event";
  return { title: `${title} | Beespo` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ profile }, supabase] = await Promise.all([
    getDashboardRequestContext(),
    createClient(),
  ]);

  const { data, error } = await (supabase.from("events") as ReturnType<typeof supabase.from>)
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
      meetings!event_id (
        id,
        title,
        status,
        plan_type,
        modality,
        workspace_meeting_id
      )
    `)
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !data) notFound();

  const event = data as unknown as EventDetail;
  const meeting = event.meetings?.[0] ?? null;
  const planType = meeting?.plan_type ?? null;
  const PlanIcon = planType ? PLAN_TYPE_ICONS[planType] : null;
  const when = formatEventWhen(event);
  const duration = formatDuration(event);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Breadcrumbs
        items={[
          { label: "Events", href: "/schedule/events" },
          { label: event.title },
        ]}
      />

      <div className="flex-1 overflow-y-auto">
        <SettingsPageShell title={event.title} description={when}>
          {/* ── Event details ─────────────────────────────────────────── */}
          <SettingsSection title="Details">
            <SettingsGroup>
              {event.location && (
                <SettingsRow
                  leading={<MapPin className="h-4 w-4 text-muted-foreground" />}
                  title="Location"
                  description={event.location}
                />
              )}
              <SettingsRow
                leading={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
                title="Date"
                description={when}
              />
              {duration && (
                <SettingsRow
                  leading={<Clock3 className="h-4 w-4 text-muted-foreground" />}
                  title="Duration"
                  description={duration}
                />
              )}
              {event.event_type && (
                <SettingsRow
                  leading={<Users className="h-4 w-4 text-muted-foreground" />}
                  title="Type"
                  description={
                    event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)
                  }
                />
              )}
            </SettingsGroup>

            {event.description && (
              <div className="rounded-[var(--settings-surface-radius)] border border-[hsl(var(--settings-surface-border))] bg-[hsl(var(--settings-surface-bg))] px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)]">
                <p className="text-[length:var(--settings-meta-size)] font-medium text-muted-foreground mb-1">
                  Description
                </p>
                <p
                  className="text-[length:var(--settings-body-size)] leading-relaxed [&_p]:mb-2"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}
          </SettingsSection>

          {/* ── Meeting workspace ─────────────────────────────────────── */}
          {meeting ? (
            <SettingsSection
              title="Meeting workspace"
              description={
                planType
                  ? `This event has a linked ${PLAN_TYPE_LABELS[planType].toLowerCase()} workspace.`
                  : "This event has a linked meeting workspace."
              }
            >
              <SettingsGroup>
                {planType && PlanIcon && (
                  <SettingsRow
                    leading={<PlanIcon className="h-4 w-4 text-muted-foreground" />}
                    title="Plan type"
                    description={PLAN_TYPE_LABELS[planType]}
                    trailing={
                      <Badge variant="outline" className="text-xs">
                        {STATUS_LABELS[meeting.status] ?? meeting.status}
                      </Badge>
                    }
                  />
                )}
                {meeting.modality && (
                  <SettingsRow
                    leading={<Users className="h-4 w-4 text-muted-foreground" />}
                    title="Format"
                    description={MODALITY_LABELS[meeting.modality]}
                  />
                )}
              </SettingsGroup>

              <div className="flex gap-3">
                <Button asChild>
                  <Link href={`/meetings/${meeting.workspace_meeting_id ?? meeting.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open {planType ? PLAN_TYPE_LABELS[planType].toLowerCase() : "meeting"}
                  </Link>
                </Button>
              </div>
            </SettingsSection>
          ) : event.event_type === "meeting" ? (
            <SettingsSection
              title="Meeting workspace"
              description="No plan has been created for this meeting yet."
            >
              <div className="flex gap-3">
                <Button asChild variant="outline">
                  <Link href={`/events/new?plan=agenda`}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Create agenda
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/events/new?plan=program`}>
                    <PanelsTopLeft className="mr-2 h-4 w-4" />
                    Create program
                  </Link>
                </Button>
              </div>
            </SettingsSection>
          ) : null}
        </SettingsPageShell>
      </div>
    </div>
  );
}
