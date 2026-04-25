"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Inbox as InboxIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInbox } from "@/lib/inbox/useInbox";
import {
  BUCKET_LABEL,
  KIND_LABEL,
  type InboxBucket,
  type InboxKind,
} from "@/lib/inbox/types";
import { type Task, type CallingProcess, type CallingVacancy, type Calling, type CandidateName } from "@/lib/inbox/deriveInbox";
import { InboxItemRow } from "@/components/inbox/InboxItemRow";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "for_me";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "for_me", label: "For me" },
];

const KIND_FILTERS: InboxKind[] = [
  "task",
  "response_pending",
  "sustaining_due",
  "set_apart_due",
  "declined",
  "stalled",
  "empty_vacancy",
];

const BUCKET_ORDER: InboxBucket[] = ["today", "this_week", "later"];

interface InboxClientProps {
  tasks: Task[];
  callingProcesses: CallingProcess[];
  vacancies: CallingVacancy[];
  callings: Calling[];
  candidateNames: CandidateName[];
  currentUserId: string;
}

export function InboxClient(props: InboxClientProps) {
  const { items, unreadCount, markRead, markUnread, markAllRead } = useInbox(props);
  const [filter, setFilter] = useState<Filter>("all");
  const [kindFilter, setKindFilter] = useState<InboxKind | null>(null);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filter === "unread" && i.read) return false;
      if (filter === "for_me" && !i.forMe) return false;
      return !(kindFilter && i.kind !== kindFilter);

    });
  }, [items, filter, kindFilter]);

  const grouped = useMemo(() => {
    const out: Record<InboxBucket, typeof filtered> = { today: [], this_week: [], later: [] };
    for (const i of filtered) out[i.bucket].push(i);
    return out;
  }, [filtered]);

  const counts = useMemo(() => {
    const c: Record<InboxKind, number> = {
      task: 0,
      response_pending: 0,
      declined: 0,
      sustaining_due: 0,
      set_apart_due: 0,
      stalled: 0,
      empty_vacancy: 0,
    };
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);

  // Build lookup maps for member and assignee names
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cn of props.candidateNames) {
      map.set(cn.id, cn.name);
    }
    return map;
  }, [props.candidateNames]);

  return (
    <div className="px-8 lg:px-12 py-10 max-w-[1100px] mx-auto">
      <div className="mb-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Inbox</p>
            <h1 className="text-3xl font-serif italic mb-2">
              What needs your <em className="not-italic">attention</em>
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Tasks assigned to the bishopric, awaiting responses, sustainings to call, and callings
              still to record. Drawn from your callings work.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                unreadCount > 0
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {unreadCount} unread
            </span>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                onClick={() => markAllRead(items.filter((i) => !i.read).map((i) => i.id))}
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Primary filter tabs */}
      <div className="border-b flex items-center gap-8">
        {FILTERS.map((f) => {
          const count =
            f.key === "all"
              ? items.length
              : f.key === "unread"
                ? items.filter((i) => !i.read).length
                : items.filter((i) => i.forMe).length;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "pb-3 text-[13px] border-b-2 transition-colors -mb-px",
                active
                  ? "border-primary text-foreground font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              <span className="ml-2 text-[10px] tabular-nums opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Kind chips */}
      <div className="mt-5 flex flex-wrap gap-2">
        <KindChip
          label="All kinds"
          active={kindFilter === null}
          count={items.length}
          onClick={() => setKindFilter(null)}
        />
        {KIND_FILTERS.map((k) => (
          <KindChip
            key={k}
            label={KIND_LABEL[k]}
            count={counts[k]}
            active={kindFilter === k}
            onClick={() => setKindFilter(kindFilter === k ? null : k)}
          />
        ))}
      </div>

      {/* Body */}
      <div className="mt-8">
        {filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {BUCKET_ORDER.map((b) =>
              grouped[b].length === 0 ? null : (
                <section key={b}>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3 px-1">
                    {BUCKET_LABEL[b]}
                  </div>
                  <ul className="bg-card rounded-xl border divide-y overflow-hidden">
                    {grouped[b].map((item) => (
                      <InboxItemRow
                        key={item.id}
                        item={item}
                        memberName={item.memberId ? memberNameMap.get(item.memberId) : undefined}
                        assigneeName={item.assigneeId ? "User" : undefined}
                        onMarkRead={markRead}
                        onMarkUnread={markUnread}
                      />
                    ))}
                  </ul>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KindChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
        active
          ? "bg-primary/10 border-primary/40 text-primary font-medium"
          : "bg-card text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

function EmptyState() {
  return (
    <div className="bg-card rounded-xl border px-6 py-16 text-center">
      <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-secondary mb-4">
        <InboxIcon className="h-5 w-5 text-muted-foreground" />
      </span>
      <h3 className="font-serif text-xl">Inbox zero</h3>
      <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
        Nothing here. Quiet ward, or you&#39;ve already done the work.
      </p>
    </div>
  );
}
