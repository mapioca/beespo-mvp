"use client";

import Link from "next/link";
import { CalendarDays, ListChecks, MessageCircle, Users2 } from "lucide-react";
import { Pill, Avatar } from "./shared";
import { useDiscussions } from "../lib/store";
import { formatDate, PRIORITY_LABEL, PRIORITY_TONE, STATE_TONE, timeAgo } from "../lib/meta";
import { STATE_LABEL, type Discussion } from "../data/types";

export function DiscussionRow({ d }: { d: Discussion }) {
  const { users } = useDiscussions();
  const owner = users.find((user) => user.id === d.ownerId);
  const lastEvent = d.timeline[d.timeline.length - 1];

  return (
    <Link
      href={`/discussions/${d.id}`}
      className="group block px-5 py-4 transition-colors hover:bg-surface-hover/70"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Pill tone={STATE_TONE[d.state]} dot>
              {STATE_LABEL[d.state]}
            </Pill>
            <Pill tone={PRIORITY_TONE[d.priority]}>{PRIORITY_LABEL[d.priority]}</Pill>
            {d.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="text-[10.5px] text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>

          <h3 className="truncate text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-brand">
            {d.title}
          </h3>
          {d.description ? (
            <p className="mt-1 line-clamp-1 text-[12.5px] leading-relaxed text-muted-foreground">
              {d.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-muted-foreground">
            {owner ? (
              <span className="inline-flex items-center gap-1.5">
                <Avatar name={owner.name} size={16} />
                {owner.name}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3 opacity-70" />
              <span className="tabular-nums">{d.notes.length}</span> notes
            </span>
            {d.taskIds.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <ListChecks className="h-3 w-3 opacity-70" />
                <span className="tabular-nums">{d.taskIds.length}</span> tasks
              </span>
            ) : null}
            {d.meetingIds.length > 0 ? (
              <span className="inline-flex items-center gap-1.5">
                <Users2 className="h-3 w-3 opacity-70" />
                <span className="tabular-nums">{d.meetingIds.length}</span> meetings
              </span>
            ) : null}
            {d.dueAt ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 opacity-70" />
                Due {formatDate(d.dueAt)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-[10.5px] text-muted-foreground">
            {lastEvent ? timeAgo(lastEvent.at) : timeAgo(d.createdAt)}
          </div>
          {d.state === "closed" && d.resolution === "decision_made" ? (
            <div className="mt-1 font-serif text-[10.5px] italic text-brand">decision recorded</div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
