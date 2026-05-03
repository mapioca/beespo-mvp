"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  HandHeart,
  Hourglass,
  MessageSquareReply,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { InboxItem, InboxKind } from "@/lib/inbox/types";
import { formatDistanceToNow } from "date-fns";

const ICONS: Record<InboxKind, React.ComponentType<{ className?: string }>> = {
  task: ClipboardList,
  response_pending: MessageSquareReply,
  declined: CircleDot,
  sustaining_due: HandHeart,
  set_apart_due: Sparkles,
  stalled: Hourglass,
  empty_vacancy: CalendarClock,
};

const TONE: Record<
  InboxKind,
  "default" | "secondary" | "destructive" | "outline"
> = {
  task: "secondary",
  response_pending: "default",
  declined: "destructive",
  sustaining_due: "default",
  set_apart_due: "default",
  stalled: "outline",
  empty_vacancy: "outline",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export function InboxItemRow({
  item,
  memberName,
  assigneeName,
  onMarkRead,
  onMarkUnread,
}: {
  item: InboxItem;
  memberName?: string;
  assigneeName?: string;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
}) {
  const Icon = ICONS[item.kind];

  return (
    <li
      className={cn(
        "group relative flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50",
        !item.read && "bg-[hsl(var(--surface-raised))]"
      )}
    >
      {/* Unread indicator */}
      <span
        className={cn(
          "absolute left-0 top-0 bottom-0 w-[2px]",
          item.read ? "bg-transparent" : "bg-primary"
        )}
        aria-hidden
      />

      {/* Avatar / icon */}
      <div className="shrink-0 pt-0.5">
        {memberName ? (
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {getInitials(memberName)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
      </div>

      <Link
        href={item.href}
        onClick={() => onMarkRead(item.id)}
        className="min-w-0 flex-1 flex flex-col gap-1"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span
            className={cn(
              "text-[13.5px] leading-snug",
              item.read ? "text-foreground/80" : "text-foreground font-medium"
            )}
          >
            {item.title}
          </span>
        </div>
        {item.body && (
          <p className="text-[12.5px] text-muted-foreground leading-relaxed line-clamp-1">
            {item.body}
          </p>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 mt-0.5">
          <span className="tabular-nums">
            {formatDistanceToNow(new Date(item.at), { addSuffix: true })}
          </span>
          {assigneeName && (
            <>
              <span className="opacity-40">·</span>
              <span>
                {item.forMe ? "Assigned to you" : `Assigned to ${assigneeName.split(" ")[0]}`}
              </span>
            </>
          )}
          {item.forMe && !assigneeName && item.kind !== "task" && (
            <>
              <span className="opacity-40">·</span>
              <span>Bishopric action</span>
            </>
          )}
        </div>
      </Link>

      <div className="shrink-0 flex flex-col items-end gap-2">
        {item.metaLabel && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              TONE[item.kind] === "default" && "bg-primary/10 text-primary",
              TONE[item.kind] === "secondary" && "bg-secondary text-secondary-foreground",
              TONE[item.kind] === "destructive" && "bg-destructive/10 text-destructive",
              TONE[item.kind] === "outline" && "border bg-background text-muted-foreground"
            )}
          >
            {item.metaLabel}
          </span>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {item.read ? (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                onMarkUnread(item.id);
              }}
            >
              Mark unread
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                onMarkRead(item.id);
              }}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Mark read
            </Button>
          )}
          <Link
            href={item.href}
            onClick={() => onMarkRead(item.id)}
            className="inline-flex items-center text-muted-foreground hover:text-foreground p-1"
            aria-label="Open"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </li>
  );
}
