"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
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
  SettingsPageShell,
  SettingsSection,
  SettingsGroup,
  SettingsRow,
} from "@/components/settings/settings-surface";
import { ZoomMeetingSheet } from "@/components/meetings/zoom-meeting-sheet";
import { FormRichTextEditor } from "@/components/ui/form-rich-text-editor";
import { DirectoryMemberSearch } from "@/components/meetings/directory-member-select";
import type { Database } from "@/types/database";
import {
  CalendarDays,
  ClipboardList,
  ExternalLink,
  PanelsTopLeft,
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

// ─── InlineModalityEditor ──────────────────────────────────────────────────────
function InlineModalityEditor({ value, onSave }: { value: Modality; onSave: (v: Modality) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2">
          {MODALITY_LABELS[value] ?? "In person"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[160px] p-1.5" align="start" sideOffset={4}>
        {(["in_person", "online", "hybrid"] as Modality[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { onSave(m); setOpen(false); }}
            className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-[#f9f7f5] ${value === m ? "text-[#1c1917] font-medium" : "text-[#78716c]"}`}
          >
            {MODALITY_LABELS[m]}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// ─── InlineDateTimeEditor ──────────────────────────────────────────────────────
function InlineDateTimeEditor({
  date,
  time,
  onSave,
}: {
  date: string;
  time: string;
  onSave: (date: string, time: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(date);
  const [draftTime, setDraftTime] = useState(time);

  useEffect(() => { setDraftDate(date); setDraftTime(time); }, [date, time]);

  const label = useMemo(() => {
    if (!draftDate) return "Not scheduled";
    const d = new Date(`${draftDate}T${draftTime}:00`);
    return format(d, "MMMM d, yyyy · h:mm a");
  }, [draftDate, draftTime]);

  function commit() {
    setOpen(false);
    onSave(draftDate, draftTime);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) commit(); else setOpen(true); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3 space-y-3" align="start" sideOffset={4}>
        <DateCalendar
          mode="single"
          selected={draftDate ? new Date(`${draftDate}T00:00:00`) : undefined}
          onSelect={(d) => { if (d) setDraftDate(format(d, "yyyy-MM-dd")); }}
          initialFocus
        />
        <Select value={draftTime} onValueChange={setDraftTime}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[11rem]">
            {TIME_OPTIONS.map((t) => {
              const [h, m] = t.split(":").map(Number);
              const d = new Date(); d.setHours(h, m, 0, 0);
              return <SelectItem key={t} value={t}>{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</SelectItem>;
            })}
          </SelectContent>
        </Select>
        <Button size="sm" className="w-full h-8 bg-[var(--color-accent-600)] text-white hover:bg-[var(--color-accent-600)]/90" onClick={commit}>
          Save
        </Button>
      </PopoverContent>
    </Popover>
  );
}

// ─── InlineTitleEditor ─────────────────────────────────────────────────────────
function InlineTitleEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) inputRef.current?.select(); }, [editing]);

  function commit() {
    setEditing(false);
    onSave(draft);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(value); setEditing(false); } }}
        className="w-full bg-transparent text-[17px] font-medium tracking-[-0.01em] text-foreground/90 outline-none border-b border-[#d6d3d1] pb-0.5"
        autoFocus
      />
    );
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      className="cursor-text text-[17px] font-medium tracking-[-0.01em] text-foreground/90 hover:text-foreground transition-colors"
      title="Click to edit"
    >
      {value || "Untitled meeting"}
    </h1>
  );
}

// ─── InlineRoleRow ─────────────────────────────────────────────────────────────
function InlineRoleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid items-center h-9" style={{ gridTemplateColumns: "120px 240px" }}>
      <span className="text-sm text-[#1c1917]">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex items-center gap-2 h-7 px-2 rounded-md min-w-[200px] text-[14px] font-normal transition-colors hover:bg-[#f9f7f5] disabled:pointer-events-none disabled:opacity-50"
          >
            {value ? (
              <>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7e5e4] text-[10px] font-medium text-[#78716c]">
                  {value.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("")}
                </span>
                <span className="text-[#1c1917]">{value}</span>
                <span className="ml-auto hidden text-xs text-[#78716c] group-hover:inline">change</span>
              </>
            ) : (
              <span className="text-[#78716c]">Add person</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start" sideOffset={4}>
          <DirectoryMemberSearch
            value={value}
            onChange={(name) => { onChange(name); setOpen(false); }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MeetingDetailsPageClient({
  meeting,
  event,
  totalDuration,
  isZoomFreeAccount,
}: MeetingDetailsPageClientProps) {
  const router = useRouter();
  const [isSaving, startTransition] = useTransition();
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [localMeeting, setLocalMeeting] = useState(meeting);

  const initialDate = meeting.scheduled_date
    ? format(new Date(meeting.scheduled_date), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");
  const initialTime = meeting.scheduled_date
    ? format(new Date(meeting.scheduled_date), "HH:mm")
    : "09:00";

  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [modality, setModality] = useState<Modality>(
    (meeting.modality as Modality | null) ?? "in_person"
  );
  const [description, setDescription] = useState(meeting.description ?? "");
  const [expandedPlanType, setExpandedPlanType] = useState<"agenda" | "program" | null>(null);
  const [planName, setPlanName] = useState("");

  const planType = (localMeeting.plan_type as PlanType | null) ?? null;

  const modalityValue = (localMeeting as { modality?: Modality | null }).modality ?? null;
  const canUseZoom = modalityValue === "online" || modalityValue === "hybrid";

  const externalPlanUrl = (localMeeting as { external_plan_url?: string | null }).external_plan_url ?? null;

  function setPlanType(nextType: "agenda" | "program" | "external", nameOrUrl?: string | null) {
    startTransition(async () => {
      try {
        if (nextType === "external") {
          const body: Record<string, unknown> = { plan_type: nextType, external_plan_url: nameOrUrl ?? null };
          const response = await fetch(`/api/meetings/${meeting.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = (await response.json()) as { meeting?: MeetingRow; error?: string };
          if (!response.ok) throw new Error(data.error ?? "Failed to set plan");
          if (data.meeting) setLocalMeeting(data.meeting);
          toast.success("External plan saved.");
        } else {
          // Create agenda or program via POST
          const payload = {
            type: nextType,
            title: nameOrUrl?.trim() || `${meeting.title} ${nextType === "agenda" ? "Agenda" : "Program"}`,
          };
          const response = await fetch(`/api/meetings/${meeting.id}/plan`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Failed to create plan");
          
          if (nextType === "agenda") router.push(`/meetings/agenda/${meeting.id}`);
          else if (nextType === "program") router.push(`/meetings/program/${meeting.id}`);
        }
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
          title=""
          className="max-w-3xl [&>div]:mx-0 [&>div]:max-w-[720px]"
          contentClassName="space-y-10"
          headerClassName="hidden"
        >
          {/* Inline-editable header */}
          <div className="-mt-2 space-y-1 mb-8">
            <InlineTitleEditor
              value={localMeeting.title ?? ""}
              onSave={async (next) => {
                if (!next.trim() || next === localMeeting.title) return;
                try {
                  const res = await fetch(`/api/meetings/${meeting.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: next.trim() }),
                  });
                  const data = await res.json() as { meeting?: MeetingRow; error?: string };
                  if (!res.ok) throw new Error(data.error);
                  if (data.meeting) setLocalMeeting(data.meeting);
                } catch { toast.error("Failed to update title."); }
              }}
            />
            <div className="flex items-center gap-2">
              <InlineDateTimeEditor
                date={date}
                time={time}
                onSave={async (newDate, newTime) => {
                  const scheduled = new Date(`${newDate}T${newTime}:00`);
                  try {
                    const res = await fetch(`/api/meetings/${meeting.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ scheduled_date: scheduled.toISOString() }),
                    });
                    const data = await res.json() as { meeting?: MeetingRow; error?: string };
                    if (!res.ok) throw new Error(data.error);
                    if (data.meeting) setLocalMeeting(data.meeting);
                    setDate(newDate);
                    setTime(newTime);
                  } catch { toast.error("Failed to update date."); }
                }}
              />
              <span className="text-[#d6d3d1]">·</span>
              <InlineModalityEditor
                value={modality}
                onSave={async (next) => {
                  setModality(next);
                  try {
                    const res = await fetch(`/api/meetings/${meeting.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ modality: next }),
                    });
                    const data = await res.json() as { meeting?: MeetingRow; error?: string };
                    if (!res.ok) throw new Error(data.error);
                    if (data.meeting) setLocalMeeting(data.meeting);
                  } catch { toast.error("Failed to update format."); }
                }}
              />
            </div>
          </div>


          <SettingsSection
            title="Roles"
            titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
          >
            <div className="flex flex-col">
              {(["presiding", "conducting", "chorister", "organist"] as const).map((role) => {
                const nameKey = `${role}_name` as keyof typeof localMeeting;
                const currentName = (localMeeting[nameKey] as string | null) ?? "";
                return (
                  <InlineRoleRow
                    key={role}
                    label={role.charAt(0).toUpperCase() + role.slice(1)}
                    value={currentName}
                    disabled={isSaving}
                    onChange={async (name) => {
                      try {
                        const response = await fetch(`/api/meetings/${meeting.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ [`${role}_name`]: name || null }),
                        });
                        const data = await response.json() as { meeting?: MeetingRow; error?: string };
                        if (!response.ok) throw new Error(data.error ?? "Failed to update");
                        if (data.meeting) setLocalMeeting(data.meeting);
                      } catch {
                        toast.error("Failed to update role.");
                      }
                    }}
                  />
                );
              })}
            </div>
          </SettingsSection>

          {!planType && (
            <SettingsSection
              title="Plan"
              description="Attach an agenda, program, or external plan to this meeting. You can add one now or later."
              titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
              descriptionClassName="text-[13px]"
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2 rounded-xl border border-[#e7e5e4] bg-white p-4 transition-colors hover:border-[#d6d3d1] hover:bg-[#fcfcfa]">
                  <ClipboardList className="h-5 w-5 text-[#78716c]" />
                  <div>
                    <p className="text-sm font-medium text-[#1c1917]">New agenda</p>
                    <p className="mt-0.5 text-xs text-[#78716c] leading-relaxed">For activities, interviews, and council meetings</p>
                  </div>
                  {expandedPlanType === "agenda" ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder={`${meeting.title} Agenda`}
                        disabled={isSaving}
                        className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-1.5 text-sm focus:border-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#1c1917]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && planName.trim()) {
                            setPlanType("agenda", planName);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPlanType("agenda", planName)}
                          disabled={isSaving || !planName.trim()}
                          className="flex-1 rounded-md bg-[#b45309] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#92400e] disabled:opacity-50"
                        >
                          {isSaving ? "Creating..." : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setExpandedPlanType(null); setPlanName(""); }}
                          disabled={isSaving}
                          className="rounded-md border border-[#e7e5e4] px-3 py-1.5 text-xs font-medium hover:bg-[#fcfcfa]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPlanType("agenda");
                        setPlanName(`${meeting.title} Agenda`);
                      }}
                      disabled={isSaving || expandedPlanType === "program"}
                      className="mt-2 w-full rounded-md border border-[#e7e5e4] px-3 py-1.5 text-xs font-medium hover:bg-[#fcfcfa] disabled:opacity-50"
                    >
                      Continue
                    </button>
                  )}
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-[#e7e5e4] bg-white p-4 transition-colors hover:border-[#d6d3d1] hover:bg-[#fcfcfa]">
                  <PanelsTopLeft className="h-5 w-5 text-[#78716c]" />
                  <div>
                    <p className="text-sm font-medium text-[#1c1917]">New program</p>
                    <p className="mt-0.5 text-xs text-[#78716c] leading-relaxed">For sacrament meetings and conferences</p>
                  </div>
                  {expandedPlanType === "program" ? (
                    <div className="mt-2 space-y-2">
                      <input
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder={`${meeting.title} Program`}
                        disabled={isSaving}
                        className="w-full rounded-md border border-[#e7e5e4] bg-white px-3 py-1.5 text-sm focus:border-[#1c1917] focus:outline-none focus:ring-1 focus:ring-[#1c1917]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && planName.trim()) {
                            setPlanType("program", planName);
                          }
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPlanType("program", planName)}
                          disabled={isSaving || !planName.trim()}
                          className="flex-1 rounded-md bg-[#b45309] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#92400e] disabled:opacity-50"
                        >
                          {isSaving ? "Creating..." : "Create"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setExpandedPlanType(null); setPlanName(""); }}
                          disabled={isSaving}
                          className="rounded-md border border-[#e7e5e4] px-3 py-1.5 text-xs font-medium hover:bg-[#fcfcfa]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedPlanType("program");
                        setPlanName(`${meeting.title} Program`);
                      }}
                      disabled={isSaving || expandedPlanType === "agenda"}
                      className="mt-2 w-full rounded-md border border-[#e7e5e4] px-3 py-1.5 text-xs font-medium hover:bg-[#fcfcfa] disabled:opacity-50"
                    >
                      Continue
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSetExternalPlan}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 text-xs text-[#78716c] hover:text-[#1c1917] transition-colors disabled:pointer-events-none disabled:opacity-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Link an external plan
              </button>
            </SettingsSection>
          )}

          {planType === "external" && (
            <SettingsSection
              title="External plan"
              description="This meeting uses a plan stored outside Beespo."
              titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
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
            title="Notes"
            titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
          >
            <FormRichTextEditor
              value={description}
              onChange={setDescription}
              onBlur={async () => {
                if (description === (localMeeting.description ?? "")) return;
                try {
                  const res = await fetch(`/api/meetings/${meeting.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ description: description.trim() || null }),
                  });
                  const data = await res.json() as { meeting?: MeetingRow; error?: string };
                  if (!res.ok) throw new Error(data.error);
                  if (data.meeting) setLocalMeeting(data.meeting);
                } catch { toast.error("Failed to save notes."); }
              }}
              placeholder="Add notes..."
              minHeight="120px"
            />
          </SettingsSection>

          {event && (
            <SettingsSection
              title="Event"
              description="The calendar event this meeting is attached to."
              titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
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
              titleClassName="text-[12px] font-medium uppercase tracking-[0.5px] text-[#57534e]"
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

        </SettingsPageShell>
      </div>


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
