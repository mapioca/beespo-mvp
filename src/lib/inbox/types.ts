export type InboxKind =
  | "task"
  | "response_pending"
  | "declined"
  | "sustaining_due"
  | "set_apart_due"
  | "stalled"
  | "empty_vacancy";

export type InboxBucket = "today" | "this_week" | "later";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  priority: number;
  bucket: InboxBucket;
  at: string;
  title: string;
  body?: string;
  metaLabel?: string;
  memberId?: string;
  href: string;
  stage?: string;
  assigneeId?: string;
  forMe: boolean;
  read: boolean;
}

export const KIND_LABEL: Record<InboxKind, string> = {
  task: "Task",
  response_pending: "Awaiting reply",
  declined: "Declined",
  sustaining_due: "Sustaining",
  set_apart_due: "Set apart",
  stalled: "Stalled",
  empty_vacancy: "Vacancy",
};

export const BUCKET_LABEL: Record<InboxBucket, string> = {
  today: "Today",
  this_week: "This week",
  later: "Earlier",
};
