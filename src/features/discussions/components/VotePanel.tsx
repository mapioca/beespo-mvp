"use client";

import { Check, Minus, Vote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Discussion, VoteValue } from "../data/types";
import { useDiscussions } from "../lib/store";
import { Avatar, Pill } from "./shared";

export function VotePanel({ discussion }: { discussion: Discussion }) {
  const { users, currentUserId, castVote, closeVote, openVote } = useDiscussions();
  const open = discussion.votes.find((item) => !item.closedAt);
  const last = discussion.votes[discussion.votes.length - 1];

  if (!open && !last) {
    return (
      <section className="rounded-[8px] border border-border/70 bg-background p-4">
        <header className="mb-2 flex items-center gap-2">
          <Vote className="h-3.5 w-3.5 text-brand" />
          <h3 className="font-serif text-[15px] italic">Unanimity vote</h3>
        </header>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          When the time is right, call a vote on the discussion or on a specific proposal.
        </p>
        <Button onClick={() => openVote(discussion.id)} size="sm" variant="outline" className="mt-3 h-8 bg-surface-raised text-[12px]">
          Open vote on discussion
        </Button>
      </section>
    );
  }

  const active = open ?? last!;
  const isOpen = !active.closedAt;
  const myVote = active.ballots[currentUserId];
  const yes = Object.values(active.ballots).filter((value) => value === "yes").length;
  const no = Object.values(active.ballots).filter((value) => value === "no").length;
  const abstain = Object.values(active.ballots).filter((value) => value === "abstain").length;
  const total = users.length;
  const cast = yes + no + abstain;
  const unanimousYes = !isOpen && cast === total && yes === total;

  return (
    <section className="rounded-[8px] border border-border/70 bg-background p-4">
      <header className="mb-3 flex items-center gap-2">
        <Vote className="h-3.5 w-3.5 text-brand" />
        <h3 className="font-serif text-[15px] italic">Unanimity vote</h3>
        {isOpen ? <Pill tone="primary" dot>Open</Pill> : unanimousYes ? <Pill tone="success">Unanimous</Pill> : <Pill tone="muted">Closed</Pill>}
      </header>

      <div className="mb-3 grid grid-cols-3 gap-2">
        <Tally label="Yes" value={yes} total={total} tone="success" />
        <Tally label="No" value={no} total={total} tone="danger" />
        <Tally label="Abstain" value={abstain} total={total} tone="muted" />
      </div>

      <div className="space-y-1.5">
        {users.map((user) => {
          const value = active.ballots[user.id];
          return (
            <div key={user.id} className="flex items-center gap-2 text-[12px]">
              <Avatar name={user.name} size={20} />
              <span className="truncate">{user.name}</span>
              <span className="ml-auto">
                {value === "yes" ? <span className="inline-flex items-center gap-1 text-[hsl(var(--cp-success))]"><Check className="h-3 w-3" /> Yes</span> : null}
                {value === "no" ? <span className="inline-flex items-center gap-1 text-destructive"><X className="h-3 w-3" /> No</span> : null}
                {value === "abstain" ? <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="h-3 w-3" /> Abstain</span> : null}
                {!value ? <span className="font-serif italic text-muted-foreground">awaiting</span> : null}
              </span>
            </div>
          );
        })}
      </div>

      {isOpen ? (
        <div className="mt-4 border-t border-border/70 pt-3">
          <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your vote</div>
          <div className="flex flex-wrap items-center gap-1.5">
            <BallotBtn current={myVote} value="yes" onClick={() => castVote(discussion.id, "yes")} />
            <BallotBtn current={myVote} value="no" onClick={() => castVote(discussion.id, "no")} />
            <BallotBtn current={myVote} value="abstain" onClick={() => castVote(discussion.id, "abstain")} />
            <Button onClick={() => closeVote(discussion.id)} size="sm" variant="ghost" className="ml-auto h-7 px-2 text-[11.5px] text-muted-foreground hover:text-foreground">
              Close vote
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function Tally({ label, value, total, tone }: { label: string; value: number; total: number; tone: "success" | "danger" | "muted" }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="rounded-[8px] border border-border/70 bg-surface-raised px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-serif text-[18px] tabular-nums",
            tone === "success" && "text-[hsl(var(--cp-success))]",
            tone === "danger" && "text-destructive",
            tone === "muted" && "text-muted-foreground",
          )}
        >
          {value}
        </span>
        <span className="text-[10.5px] tabular-nums text-muted-foreground">/ {total} - {pct}%</span>
      </div>
    </div>
  );
}

function BallotBtn({ current, value, onClick }: { current?: VoteValue; value: VoteValue; onClick: () => void }) {
  const active = current === value;
  const label = value === "yes" ? "Yes" : value === "no" ? "No" : "Abstain";
  const Icon = value === "yes" ? Check : value === "no" ? X : Minus;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-[6px] border px-2.5 text-[11.5px] transition-colors",
        active
          ? value === "yes"
            ? "border-[hsl(var(--cp-success)/0.4)] bg-[hsl(var(--cp-success)/0.1)] text-[hsl(var(--cp-success))]"
            : value === "no"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-surface-active text-foreground"
          : "border-border bg-surface-raised text-muted-foreground hover:bg-surface-hover hover:text-foreground",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}
