"use client";

export type MeetingType =
  | "bishopric"
  | "ward_council"
  | "rs_presidency"
  | "eq_presidency"
  | "ym_presidency"
  | "yw_presidency"
  | "primary_presidency"
  | "ss_presidency"
  | "stake";

export interface Meeting {
  id: string;
  title: string;
  type: MeetingType;
  startsAt: string;
  durationMin?: number;
  discussionIds: string[];
}

export interface AppUser {
  id: string;
  name: string;
  initials: string;
  role: string;
}

export type TaskStatus = "todo" | "in_progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface DiscussionTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  reporterId: string;
  assigneeId: string;
  dueAt?: string;
  createdAt: string;
}

export type DiscussionState = "draft" | "active" | "closed";
export type DiscussionResolution = "decision_made" | "deferred" | "no_decision_needed";
export type DiscussionPriority = "low" | "medium" | "high" | "urgent";
export type NoteKind = "idea" | "question" | "risk" | "proposal" | "key_point";

export interface NoteReply {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  meetingId?: string;
}

export interface DiscussionNote {
  id: string;
  kind: NoteKind;
  authorId: string;
  body: string;
  createdAt: string;
  meetingId?: string;
  replies: NoteReply[];
  mentions: string[];
  promotedTaskId?: string;
}

export type VoteValue = "yes" | "no" | "abstain";

export interface DiscussionVote {
  noteId?: string;
  ballots: Record<string, VoteValue>;
  openedAt: string;
  openedByUserId: string;
  closedAt?: string;
}

export interface SpiritualImpression {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  promotedNoteId?: string;
}

export type TimelineEventKind =
  | "created"
  | "state_changed"
  | "note_added"
  | "reply_added"
  | "discussed_in_meeting"
  | "task_created"
  | "vote_opened"
  | "vote_closed"
  | "impression_promoted"
  | "decision_recorded";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  at: string;
  actorId: string;
  data?: Record<string, unknown>;
}

export interface Discussion {
  id: string;
  title: string;
  description?: string;
  state: DiscussionState;
  priority: DiscussionPriority;
  tags: string[];
  ownerId: string;
  dueAt?: string;
  createdAt: string;
  closedAt?: string;
  resolution?: DiscussionResolution;
  decision?: string;
  notes: DiscussionNote[];
  impressions: SpiritualImpression[];
  votes: DiscussionVote[];
  taskIds: string[];
  meetingIds: string[];
  timeline: TimelineEvent[];
}

export const NOTE_KIND_META: Record<
  NoteKind,
  { label: string; icon: string; tone: "neutral" | "primary" | "warning" | "success" | "muted" }
> = {
  idea: { label: "Idea", icon: "Idea", tone: "primary" },
  question: { label: "Question", icon: "Q", tone: "neutral" },
  risk: { label: "Risk", icon: "Risk", tone: "warning" },
  proposal: { label: "Proposal", icon: "Plan", tone: "success" },
  key_point: { label: "Key point", icon: "Key", tone: "muted" },
};

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  bishopric: "Bishopric",
  ward_council: "Ward Council",
  rs_presidency: "Relief Society Presidency",
  eq_presidency: "Elders Quorum Presidency",
  ym_presidency: "Young Men Presidency",
  yw_presidency: "Young Women Presidency",
  primary_presidency: "Primary Presidency",
  ss_presidency: "Sunday School Presidency",
  stake: "Stake",
};

export const STATE_LABEL: Record<DiscussionState, string> = {
  draft: "Draft",
  active: "Active",
  closed: "Closed",
};

export const RESOLUTION_LABEL: Record<DiscussionResolution, string> = {
  decision_made: "Decision made",
  deferred: "Deferred",
  no_decision_needed: "No decision needed",
};
