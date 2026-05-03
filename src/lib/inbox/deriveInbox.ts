import type { InboxItem, InboxBucket } from "./types";

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  assigned_to?: string | null;
  due_date?: string | null;
  status: string;
  created_at: string;
  calling_process_id?: string | null;
  workspace_task_id?: string | null;
}

export interface CallingProcess {
  id: string;
  calling_id: string;
  candidate_name_id: string;
  current_stage: string;
  status: string;
  dropped_reason?: string | null;
  created_at: string;
  updated_at: string;
  stage_statuses?: Record<string, "pending" | "complete">;
}

export interface CallingVacancy {
  id: string;
  calling_id: string;
  notes?: string | null;
  created_at: string;
}

export interface Calling {
  id: string;
  title: string;
  organization?: string | null;
}

export interface CandidateName {
  id: string;
  name: string;
}

interface DeriveArgs {
  tasks: Task[];
  callingProcesses: CallingProcess[];
  vacancies: CallingVacancy[];
  callings: Calling[];
  candidateNames: CandidateName[];
  currentUserId: string;
  readIds: Set<string>;
  now?: Date;
}

const DAY = 24 * 60 * 60 * 1000;

function bucketFor(at: string, now: Date): InboxBucket {
  const diff = new Date(at).getTime() - now.getTime();
  if (diff <= DAY) return "today";
  if (diff <= 7 * DAY) return "this_week";
  return "later";
}

function bucketForAge(at: string, now: Date): InboxBucket {
  const age = now.getTime() - new Date(at).getTime();
  if (age <= DAY) return "today";
  if (age <= 7 * DAY) return "this_week";
  return "later";
}

export function deriveInbox({
  tasks,
  callingProcesses,
  vacancies,
  callings,
  candidateNames,
  currentUserId,
  readIds,
  now = new Date(),
}: DeriveArgs): InboxItem[] {
  const items: InboxItem[] = [];

  const candidateName = (id: string) => candidateNames.find((c) => c.id === id)?.name ?? "Member";
  const callingTitle = (id: string) => callings.find((c) => c.id === id)?.title ?? "Calling";

  // 1) Open tasks
  for (const t of tasks) {
    if (t.status === "completed" || t.status === "cancelled") continue;
    const process = t.calling_process_id
      ? callingProcesses.find((p) => p.id === t.calling_process_id)
      : undefined;
    const member = process ? candidateName(process.candidate_name_id) : "";
    const calling = process ? callingTitle(process.calling_id) : "";
    const at = t.due_date ?? t.created_at;

    items.push({
      id: `task:${t.id}`,
      kind: "task",
      priority: t.assigned_to === currentUserId ? 90 : 60,
      bucket: t.due_date ? bucketFor(t.due_date, now) : bucketForAge(t.created_at, now),
      at,
      title: t.title,
      body: process ? `${member} → ${calling}` : undefined,
      metaLabel: t.due_date ? "Due" : "Task",
      memberId: process?.candidate_name_id,
      href: process ? `/callings/${process.id}` : "/tasks",
      assigneeId: t.assigned_to ?? undefined,
      forMe: t.assigned_to === currentUserId,
      read: readIds.has(`task:${t.id}`),
    });
  }

  // 2) Calling process signals
  for (const p of callingProcesses) {
    if (p.status === "completed" || p.status === "dropped") continue;

    const lastAt = p.updated_at;
    const stages = p.stage_statuses ?? {};

    // Declined
    if (p.status === "dropped" && p.dropped_reason) {
      items.push({
        id: `declined:${p.id}`,
        kind: "declined",
        priority: 80,
        bucket: bucketForAge(lastAt, now),
        at: lastAt,
        title: `${candidateName(p.candidate_name_id)} declined ${callingTitle(p.calling_id)}`,
        body: p.dropped_reason,
        metaLabel: "Declined",
        memberId: p.candidate_name_id,
        href: `/callings/${p.id}`,
        forMe: true,
        read: readIds.has(`declined:${p.id}`),
      });
      continue;
    }

    // Extended but no response yet
    if (stages.extended === "complete" && stages.accepted === "pending") {
      items.push({
        id: `resp:${p.id}`,
        kind: "response_pending",
        priority: 95,
        bucket: bucketForAge(lastAt, now),
        at: lastAt,
        title: `Awaiting response from ${candidateName(p.candidate_name_id)}`,
        body: `Calling extended for ${callingTitle(p.calling_id)}.`,
        metaLabel: "Awaiting reply",
        memberId: p.candidate_name_id,
        href: `/callings/${p.id}`,
        stage: "accepted",
        forMe: true,
        read: readIds.has(`resp:${p.id}`),
      });
    }

    // Accepted but not yet sustained
    if (stages.accepted === "complete" && stages.sustained === "pending") {
      items.push({
        id: `sus:${p.id}`,
        kind: "sustaining_due",
        priority: 85,
        bucket: bucketForAge(lastAt, now),
        at: lastAt,
        title: `Sustain ${candidateName(p.candidate_name_id)} in sacrament meeting`,
        body: `As ${callingTitle(p.calling_id)}.`,
        metaLabel: "Sustaining",
        memberId: p.candidate_name_id,
        href: `/callings/${p.id}`,
        stage: "sustained",
        forMe: true,
        read: readIds.has(`sus:${p.id}`),
      });
    }

    // Sustained but not set apart
    if (stages.sustained === "complete" && stages.set_apart === "pending") {
      items.push({
        id: `seta:${p.id}`,
        kind: "set_apart_due",
        priority: 70,
        bucket: bucketForAge(lastAt, now),
        at: lastAt,
        title: `Set apart ${candidateName(p.candidate_name_id)}`,
        body: `As ${callingTitle(p.calling_id)}.`,
        metaLabel: "Set apart",
        memberId: p.candidate_name_id,
        href: `/callings/${p.id}`,
        stage: "set_apart",
        forMe: true,
        read: readIds.has(`seta:${p.id}`),
      });
    }

    // Stalled — no update in 14d
    if (now.getTime() - new Date(lastAt).getTime() > 14 * DAY) {
      items.push({
        id: `stall:${p.id}`,
        kind: "stalled",
        priority: 50,
        bucket: "later",
        at: lastAt,
        title: `${candidateName(p.candidate_name_id)} → ${callingTitle(p.calling_id)} has stalled`,
        body: `No activity in over two weeks.`,
        metaLabel: "Stalled",
        memberId: p.candidate_name_id,
        href: `/callings/${p.id}`,
        forMe: true,
        read: readIds.has(`stall:${p.id}`),
      });
    }
  }

  // 3) Vacancies with no active processes
  for (const v of vacancies) {
    const activeProcesses = callingProcesses.filter(
      (p) => p.calling_id === v.calling_id && p.status === "active"
    );
    if (activeProcesses.length === 0) {
      items.push({
        id: `vac:${v.id}`,
        kind: "empty_vacancy",
        priority: 55,
        bucket: bucketForAge(v.created_at, now),
        at: v.created_at,
        title: `${callingTitle(v.calling_id)} has no candidates yet`,
        body: v.notes || "Add a name when one comes to mind.",
        metaLabel: "Vacancy",
        href: `/callings`,
        forMe: true,
        read: readIds.has(`vac:${v.id}`),
      });
    }
  }

  // Sort: unread first, then priority desc, then most recent first
  items.sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return new Date(b.at).getTime() - new Date(a.at).getTime();
  });

  return items;
}
