"use client";

import Link from "next/link";
import { CalendarDays, MessageCircle } from "lucide-react";
import { Pill } from "./shared";
import { PRIORITY_LABEL, PRIORITY_TONE, STATE_TONE, timeAgo } from "../lib/meta";
import { STATE_LABEL } from "../data/types";

interface DiscussionRowProps {
  d: {
    id: string;
    title: string;
    description?: string;
    state: "draft" | "active" | "closed";
    priority: string;
    created_at: string;
    due_date?: string;
    noteCount?: number;
  };
}

export function DiscussionRow({ d }: DiscussionRowProps) {
  return (
    <Link
      href={`/discussions/${d.id}`}
      className="group block px-5 py-4 transition-colors bg-surface-raised hover:bg-surface-hover"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Pill tone={STATE_TONE[d.state]} dot>
              {STATE_LABEL[d.state]}
            </Pill>
            <Pill tone={PRIORITY_TONE[d.priority as keyof typeof PRIORITY_TONE]}>
              {PRIORITY_LABEL[d.priority as keyof typeof PRIORITY_LABEL]}
            </Pill>
          </div>

          <h3 className="truncate text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-primary">
            {d.title}
          </h3>
          {d.description ? (
            <p className="mt-1 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
              {d.description}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle className="h-3 w-3 opacity-70" />
              <span className="tabular-nums">{d.noteCount || 0}</span> notes
            </span>
            {d.due_date ? (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3 w-3 opacity-70" />
                Due {new Date(d.due_date).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-xs text-muted-foreground">
            {timeAgo(d.created_at)}
          </div>
        </div>
      </div>
    </Link>
  );
}
