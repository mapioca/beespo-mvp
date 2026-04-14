"use client";

import Link from "next/link";
import { format } from "date-fns";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { ZoomMeetingSheet } from "@/components/meetings/zoom-meeting-sheet";
import { FormRichTextEditor } from "@/components/ui/form-rich-text-editor";
import { DirectoryMemberSelect } from "@/components/meetings/directory-member-select";
import type { Database } from "@/types/database";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  Loader2,
  MapPin,
  PanelsTopLeft,
  Users,
  Video,
} from "lucide-react";

type MeetingRow = Database["public"]["Tables"]["meetings"]["Row"];
type PlanType = "agenda" | "program" | "external";
type Modality = "online" | "in_person" | "hybrid";

interface LinkedEvent {
  id: string;
  title: string;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  workspace_event_id: string | null;
}

interface MeetingDetailsPageClientProps {
  meeting: MeetingRow & { modality?: Modality | null };
  event: LinkedEvent | null;
  totalDuration: number;
  isZoomFreeAccount: boolean | null;
}

const MODALITY_LABELS: Record<Modality, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  agenda: "Agenda",
  program: "Program",
  external: "External plan",
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const detailsRowClassName = "min-h-[3.5rem] hover:bg-transparent";

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

export function MeetingDetailsPageClient({
  meeting,
  event,
  totalDuration,
  isZoomFreeAccount,
}: MeetingDetailsPageClientProps) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [localMeeting, setLocalMeeting] = useState(meeting);

  const initialDate = meeting.scheduled_date
    ? format(new Date(meeting.scheduled_date), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const initialTime = meeting.scheduled_date
    ? format(new Date(meeting.scheduled_date), "HH:mm")
    : "09:00";

  const [title, setTitle] = useState(meeting.title ?? "");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [modality, setModality] = useState<Modality>(
    (meeting.modality as Modality | null) ?? "in_person"
  );
  const [presiding, setPresiding] = useState(meeting.presiding_name ?? "");
  const [conducting, setConducting] = useState(meeting.conducting_name ?? "");
  const [chorister, setChorister] = useState(meeting.chorister_name ?? "");
  const [organist, setOrganist] = useState(meeting.organist_name ?? "");
  const [description, setDescription] = useState(meeting.description ?? "");

  useEffect(() => {
    if (!isEditOpen) return;
    setTitle(localMeeting.title ?? "");
    setDate(
      localMeeting.scheduled_date
        ? format(new Date(localMeeting.scheduled_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd")
    );
    setTime(
      localMeeting.scheduled_date
        ? format(new Date(localMeeting.scheduled_date), "HH:mm")
        : "09:00"
    );
    setModality(
      ((localMeeting as { modality?: Modality | null }).modality) ?? "in_person"
    );
    setPresiding(localMeeting.presiding_name ?? "");
    setConducting(localMeeting.conducting_name ?? "");
    setChorister(localMeeting.chorister_name ?? "");
    setOrganist(localMeeting.organist_name ?? "");
    setDescription(localMeeting.description ?? "");
  }, [localMeeting, isEditOpen]);

  const planType = (localMeeting.plan_type as PlanType | null) ?? null;
  const when = useMemo(() => {
    if (!localMeeting.scheduled_date) return "Not scheduled";
    return format(new Date(localMeeting.scheduled_date), "MMMM d, yyyy · h:mm a");
  }, [localMeeting.scheduled_date]);

  const modalityValue = (localMeeting as { modality?: Modality | null }).modality ?? null;
  const canUseZoom = modalityValue === "online" || modalityValue === "hybrid";

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }

    const scheduled = new Date(`${date}T${time}:00`);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/meetings/${meeting.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            scheduled_date: scheduled.toISOString(),
            modality,
            presiding_name: presiding.trim() || null,
            conducting_name: conducting.trim() || null,
            chorister_name: chorister.trim() || null,
            organist_name: organist.trim() || null,
            description: description.trim() || null,
          }),
        });

        const data = (await response.json()) as {
          meeting?: MeetingRow;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Failed to update meeting");

        if (data.meeting) setLocalMeeting(data.meeting);
        toast.success("Meeting updated.");
        setIsEditOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update meeting.");
      }
    });
  }

  const planHref =
    planType === "program"
      ? `/meetings/program/${meeting.id}`
      : planType === "agenda"
        ? `/meetings/agenda/${meeting.id}`
        : null;

  const externalPlanUrl = (localMeeting as { external_plan_url?: string | null }).external_plan_url ?? null;

  function setPlanType(nextType: "agenda" | "program" | "external", url?: string | null) {
    startTransition(async () => {
      try {
        const body: Record<string, unknown> = { plan_type: nextType };
        if (nextType === "external") body.external_plan_url = url ?? null;
        const response = await fetch(`/api/meetings/${meeting.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await response.json()) as { meeting?: MeetingRow; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Failed to set plan");
        if (data.meeting) setLocalMeeting(data.meeting);
        if (nextType === "agenda") router.push(`/meetings/agenda/${meeting.id}`);
        else if (nextType === "program") router.push(`/meetings/program/${meeting.id}`);
        else toast.success("External plan saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to set plan.");
      }
    });
  }

  function handleSetExternalPlan() {
    const url = typeof window !== "undefined"
      ? window.prompt("Paste the link to your external plan (Google Doc, etc.). Leave blank to save without a link.", externalPlanUrl ?? "")
      : null;
    if (url === null) return;
    const trimmed = url.trim();
    setPlanType("external", trimmed || null);
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <SettingsPageShell
          title={localMeeting.title ?? "Untitled meeting"}
          description={planType ? `${when} · ${PLAN_TYPE_LABELS[planType]}` : when}
          className="max-w-2xl"
          contentClassName="space-y-6"
          headerClassName="pb-4 [&>h1]:font-medium [&>h1]:tracking-[-0.01em] [&>h1]:text-foreground/90 [&>p]:text-[13px] [&>p]:text-muted-foreground"
        >
          <div className="flex justify-end gap-2">
            {planHref && (
              <Button asChild className="h-8 rounded-lg px-3 text-xs font-medium">
                <Link href={planHref}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open {planType === "program" ? "program" : "agenda"}
                </Link>
              </Button>
            )}
            {planType === "external" && externalPlanUrl && (
              <Button asChild className="h-8 rounded-lg px-3 text-xs font-medium">
                <a href={externalPlanUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open external plan
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              className="h-8 rounded-lg px-3 text-xs font-medium"
              onClick={() => setIsEditOpen(true)}
            >
              Edit details
            </Button>
          </div>

          {!planType && (
            <SettingsSection
              title="Plan"
              description="Attach an agenda, program, or external plan to this meeting. You can add one now or later."
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => setPlanType("agenda")}
                  disabled={isSaving}
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Create agenda
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={() => setPlanType("program")}
                  disabled={isSaving}
                >
                  <PanelsTopLeft className="mr-2 h-4 w-4" />
                  Create program
                </Button>
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={handleSetExternalPlan}
                  disabled={isSaving}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Link external plan
                </Button>
              </div>
            </SettingsSection>
          )}

          {planType === "external" && (
            <SettingsSection
              title="External plan"
              description="This meeting uses a plan stored outside Beespo."
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <SettingsGroup>
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Link"
                  description={externalPlanUrl ?? "No link — add one in Edit details."}
                />
              </SettingsGroup>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-9 rounded-lg"
                  onClick={handleSetExternalPlan}
                  disabled={isSaving}
                >
                  {externalPlanUrl ? "Update link" : "Add link"}
                </Button>
              </div>
            </SettingsSection>
          )}

          <SettingsSection
            title="Meeting details"
            titleClassName="text-[14px] font-medium text-foreground/85"
          >
            <SettingsGroup>
              <SettingsRow
                dividerStyle="inset"
                className={detailsRowClassName}
                leading={<CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />}
                title="When"
                description={when}
              />
              {event?.location && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Location"
                  description={event.location}
                />
              )}
              {modalityValue && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  leading={<Users className="h-3.5 w-3.5 text-muted-foreground" />}
                  title="Format"
                  description={MODALITY_LABELS[modalityValue]}
                  trailing={
                    <Badge
                      variant="outline"
                      className="h-6 rounded-full border-[hsl(var(--settings-divider))] bg-[hsl(var(--settings-input-bg))] px-2.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {STATUS_LABELS[localMeeting.status] ?? localMeeting.status}
                    </Badge>
                  }
                />
              )}
            </SettingsGroup>
          </SettingsSection>

          <SettingsSection
            title="Roles"
            titleClassName="text-[14px] font-medium text-foreground/85"
          >
            <SettingsGroup>
              {localMeeting.presiding_name && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  title="Presiding"
                  description={localMeeting.presiding_name}
                />
              )}
              {localMeeting.conducting_name && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  title="Conducting"
                  description={localMeeting.conducting_name}
                />
              )}
              {localMeeting.chorister_name && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  title="Chorister"
                  description={localMeeting.chorister_name}
                />
              )}
              {localMeeting.organist_name && (
                <SettingsRow
                  dividerStyle="inset"
                  className={detailsRowClassName}
                  title="Organist"
                  description={localMeeting.organist_name}
                />
              )}
              {!localMeeting.presiding_name &&
                !localMeeting.conducting_name &&
                !localMeeting.chorister_name &&
                !localMeeting.organist_name && (
                  <SettingsRow
                    dividerStyle="inset"
                    className={detailsRowClassName}
                    title="No roles assigned"
                    description="Add presiding, conducting, and music roles from the edit panel."
                  />
                )}
            </SettingsGroup>
          </SettingsSection>

          {event && (
            <SettingsSection
              title="Event"
              description="The calendar event this meeting is attached to."
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <Button asChild variant="outline" className="h-9 rounded-lg">
                <Link href={`/schedule/events/${event.id}`}>
                  <CalendarDays className="mr-2 h-4 w-4" />
                  {event.title}
                </Link>
              </Button>
            </SettingsSection>
          )}

          {canUseZoom && (
            <SettingsSection
              title="Zoom"
              description="Host or share the online session for this meeting."
              titleClassName="text-[14px] font-medium text-foreground/85"
              descriptionClassName="text-[13px]"
            >
              <Button
                variant="outline"
                className="h-9 rounded-lg"
                onClick={() => setIsZoomOpen(true)}
              >
                <Video className="mr-2 h-4 w-4" />
                {(localMeeting as { zoom_meeting_id?: string | null }).zoom_meeting_id
                  ? "Manage Zoom meeting"
                  : "Set up Zoom meeting"}
              </Button>
            </SettingsSection>
          )}

          {localMeeting.description && (
            <SettingsSection
              title="Notes"
              titleClassName="text-[14px] font-medium text-foreground/85"
            >
              <div className="rounded-[var(--settings-surface-radius)] border border-[hsl(var(--settings-surface-border))] bg-[hsl(var(--settings-surface-bg))] px-[var(--settings-row-padding-x)] py-[var(--settings-row-padding-y)]">
                <div
                  className={cn(
                    "prose-sm max-w-none text-sm leading-relaxed text-foreground/85",
                    "[&_p]:my-1 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
                    "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:my-1",
                    "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:my-1",
                    "[&_li]:my-0.5",
                    "[&_strong]:font-semibold",
                    "[&_em]:italic",
                    "[&_s]:line-through"
                  )}
                  dangerouslySetInnerHTML={{ __html: localMeeting.description ?? "" }}
                />
              </div>
            </SettingsSection>
          )}
        </SettingsPageShell>
      </div>

      <DetailsPanel
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        title="Edit meeting"
      >
        <DetailsPanelSection title="Meeting details">
          <DetailsPanelField label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={settingsInputClassName}
              placeholder="Meeting title"
              disabled={isSaving}
            />
          </DetailsPanelField>

          <DetailsPanelField label="Date">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  className={`${settingsInputClassName} w-full justify-start pl-3 pr-3 font-normal`}
                >
                  <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                  {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
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
          </DetailsPanelField>

          <DetailsPanelField label="Time">
            <div className="max-w-[160px]">
              <Select value={time} onValueChange={setTime} disabled={isSaving}>
                <SelectTrigger className={settingsInputClassName}>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-[10rem]">
                  {TIME_OPTIONS.map((opt) => {
                    const [hour, minute] = opt.split(":").map(Number);
                    const dt = new Date();
                    dt.setHours(hour, minute, 0, 0);
                    return (
                      <SelectItem key={opt} value={opt}>
                        {dt.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </DetailsPanelField>

          <DetailsPanelField label="Format">
            <Select
              value={modality}
              onValueChange={(val) => setModality(val as Modality)}
              disabled={isSaving}
            >
              <SelectTrigger className={cn(settingsInputClassName, "h-8 text-[13px]")}>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In person</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </DetailsPanelField>
        </DetailsPanelSection>

        <DetailsPanelSection title="Roles">
          <DetailsPanelField label="Presiding">
            <DirectoryMemberSelect
              value={presiding}
              onChange={setPresiding}
              disabled={isSaving}
              placeholder="Select presiding..."
            />
          </DetailsPanelField>
          <DetailsPanelField label="Conducting">
            <DirectoryMemberSelect
              value={conducting}
              onChange={setConducting}
              disabled={isSaving}
              placeholder="Select conducting..."
            />
          </DetailsPanelField>
          <DetailsPanelField label="Chorister">
            <DirectoryMemberSelect
              value={chorister}
              onChange={setChorister}
              disabled={isSaving}
              placeholder="Select chorister..."
            />
          </DetailsPanelField>
          <DetailsPanelField label="Organist">
            <DirectoryMemberSelect
              value={organist}
              onChange={setOrganist}
              disabled={isSaving}
              placeholder="Select organist..."
            />
          </DetailsPanelField>
        </DetailsPanelSection>

        <DetailsPanelSection title="Notes">
          <FormRichTextEditor
            value={description}
            onChange={setDescription}
            placeholder="Add notes"
            disabled={isSaving}
            minHeight="120px"
          />
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

      {canUseZoom && (
        <ZoomMeetingSheet
          meeting={localMeeting}
          totalDuration={totalDuration}
          isZoomFreeAccount={isZoomFreeAccount}
          open={isZoomOpen}
          onOpenChange={setIsZoomOpen}
          onMeetingUpdate={(updated) =>
            setLocalMeeting((prev) => ({ ...prev, ...updated }))
          }
        />
      )}
    </>
  );
}
