"use client";

import {
  CheckCircle2,
  CircleDot,
  ListChecks,
  MessageCircle,
  Play,
  Repeat2,
  Sparkles,
  Users2,
  Vote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_KIND_META, RESOLUTION_LABEL, type Discussion, type TimelineEventKind } from "../data/types";
import { formatDate, formatTime } from "../lib/meta";
import { useDiscussions } from "../lib/store";
import { Avatar } from "./shared";

const ICON: Record<TimelineEventKind, typeof CircleDot> = {
  created: Play,
  state_changed: Repeat2,
  note_added: MessageCircle,
  reply_added: MessageCircle,
  discussed_in_meeting: Users2,
  task_created: ListChecks,
  vote_opened: Vote,
  vote_closed: Vote,
  impression_promoted: Sparkles,
  decision_recorded: CheckCircle2,
};

export function Timeline({ discussion }: { discussion: Discussion }) {
  const { users, meetings } = useDiscussions();
  const events = [...discussion.timeline].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className="relative space-y-3">
      <span className="absolute bottom-1 left-[11px] top-1 w-px bg-border" aria-hidden />
      {events.map((event) => {
        const actor = users.find((user) => user.id === event.actorId);
        const Icon = ICON[event.kind] ?? CircleDot;
        const meetingId = event.data?.meetingId as string | undefined;
        const meeting = meetingId ? meetings.find((item) => item.id === meetingId) : undefined;
        return (
          <li key={event.id} className="relative pl-8">
            <span
              className={cn(
                "absolute left-0 top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border/70 bg-background",
                event.kind === "decision_recorded" && "border-[hsl(var(--cp-success)/0.4)] text-[hsl(var(--cp-success))]",
                event.kind === "created" && "border-brand/40 text-brand",
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="text-[12.5px] leading-snug">
              <span className="text-foreground">{describe(event.kind, event.data)}</span>
              {meeting ? <span className="ml-1 font-serif italic text-muted-foreground">{meeting.title}</span> : null}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
              {actor ? (
                <>
                  <Avatar name={actor.name} size={14} />
                  {actor.name}
                  <span>-</span>
                </>
              ) : null}
              <span>
                {formatDate(event.at)} at {formatTime(event.at)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function describe(kind: TimelineEventKind, data?: Record<string, unknown>): string {
  switch (kind) {
    case "created":
      return "Discussion created";
    case "state_changed": {
      const to = data?.to as string | undefined;
      const resolution = data?.resolution as keyof typeof RESOLUTION_LABEL | undefined;
      if (to === "closed" && resolution) return `Closed - ${RESOLUTION_LABEL[resolution]}`;
      return `State changed to ${to ?? "unknown"}`;
    }
    case "note_added": {
      const noteKind = data?.kind as keyof typeof NOTE_KIND_META | undefined;
      return noteKind ? `${NOTE_KIND_META[noteKind].label} added` : "Note added";
    }
    case "reply_added":
      return "Reply posted";
    case "discussed_in_meeting":
      return "Discussed in meeting";
    case "task_created":
      return "Task created";
    case "vote_opened":
      return "Vote opened";
    case "vote_closed":
      return "Vote closed";
    case "impression_promoted":
      return "Impression shared as a note";
    case "decision_recorded":
      return "Decision recorded";
  }
}
