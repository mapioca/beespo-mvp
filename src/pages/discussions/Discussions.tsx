"use client";

import { useMemo, useState, useEffect } from "react";
import { MessagesSquare, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DiscussionRow } from "@/features/discussions/components/DiscussionRow";
import { NewDiscussionDialog } from "@/features/discussions/components/NewDiscussionDialog";
import { Pill, SectionHeader } from "@/features/discussions/components/shared";
import { STATE_LABEL, type DiscussionPriority, type DiscussionState } from "@/features/discussions/data/types";
import { PRIORITY_LABEL, PRIORITY_RANK, STATE_TONE } from "@/features/discussions/lib/meta";

type Scope = "all" | "active" | "draft" | "closed";

const SCOPES: Array<{ key: Scope; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Drafts" },
  { key: "closed", label: "Closed" },
];

interface Discussion {
  id: string;
  title: string;
  description?: string;
  state: DiscussionState;
  priority: string;
  created_at: string;
  created_by?: string;
  noteCount?: number;
}

export default function Discussions() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<Scope>("active");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<DiscussionPriority | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadDiscussions();
  }, []);

  const loadDiscussions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/discussions");
      const result = await response.json();
      if (result.data) {
        setDiscussions(result.data);
      }
    } catch (error) {
      console.error("Failed to load discussions:", error);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return discussions
      .filter((discussion) => {
        if (scope !== "all" && discussion.state !== scope) return false;
        if (priorityFilter && discussion.priority !== priorityFilter) return false;
        if (query) {
          const haystack = `${discussion.title} ${discussion.description ?? ""}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priority = PRIORITY_RANK[a.priority as DiscussionPriority] - PRIORITY_RANK[b.priority as DiscussionPriority];
        if (priority !== 0) return priority;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [discussions, priorityFilter, scope, search]);

  const counts = useMemo(
    () => ({
      all: discussions.length,
      active: discussions.filter((d) => d.state === "active").length,
      draft: discussions.filter((d) => d.state === "draft").length,
      closed: discussions.filter((d) => d.state === "closed").length,
    }),
    [discussions],
  );

  const grouped = useMemo(() => {
    const out: Record<DiscussionState, Discussion[]> = { active: [], draft: [], closed: [] };
    for (const discussion of filtered) out[discussion.state].push(discussion);
    return out;
  }, [filtered]);

  const hasActiveFilter = priorityFilter !== null || search.trim() !== "";
  const stateOrder: DiscussionState[] = ["active", "draft", "closed"];

  if (loading) {
    return (
      <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1100px]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="mt-10 space-y-3">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <SectionHeader
          eyebrow="Discussions"
          title={
            <>
              Where decisions are <em className="italic">made</em>
            </>
          }
          subtitle="A purposeful space to think together across meetings, asynchronously, and toward a recorded outcome."
          right={
            <Button
              onClick={() => setCreating(true)}
              className="mt-9"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New discussion
            </Button>
          }
        />

        <div className="mt-10 flex items-center gap-8 border-b">
          {SCOPES.map((item) => {
            const active = scope === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScope(item.key)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-sm transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-2 text-xs tabular-nums opacity-70">{counts[item.key]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search discussions..."
              className="h-8 w-[240px] pl-8 text-sm"
            />
          </div>

          <FilterMenu
            label="Priority"
            value={priorityFilter}
            options={(["urgent", "high", "medium", "low"] as DiscussionPriority[]).map((priority) => ({
              value: priority,
              label: PRIORITY_LABEL[priority],
            }))}
            onChange={(value) => setPriorityFilter(value as DiscussionPriority | null)}
          />
          {hasActiveFilter ? (
            <button
              type="button"
              className="ml-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setPriorityFilter(null);
              }}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
          <div className="ml-auto text-xs tabular-nums text-muted-foreground">
            {filtered.length} of {discussions.length}
          </div>
        </div>

        <main className="mt-8">
          {filtered.length === 0 ? (
            <Empty onCreate={() => setCreating(true)} />
          ) : (
            <div className="space-y-8">
              {stateOrder.map((state) => {
                const list = grouped[state];
                if (list.length === 0) return null;
                return (
                  <section key={state}>
                    <div className="mb-3 flex items-center gap-3 px-1">
                      <Pill tone={STATE_TONE[state]} dot>
                        {STATE_LABEL[state]}
                      </Pill>
                      <span className="text-xs tabular-nums text-muted-foreground">{list.length}</span>
                    </div>
                    <div className="overflow-hidden rounded-lg border bg-card">
                      {list.map((discussion, index) => (
                        <div key={discussion.id} className={cn(index > 0 && "border-t")}>
                          <DiscussionRow d={discussion} />
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <NewDiscussionDialog 
        open={creating} 
        onOpenChange={setCreating}
        onCreated={() => loadDiscussions()}
      />
    </div>
  );
}

function FilterMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;
  const current = options.find((option) => option.value === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <span className="opacity-80">{label}:</span>
        <span>{current?.label ?? "Any"}</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-lg border bg-popover shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn("w-full px-3 py-2 text-left text-sm hover:bg-accent", value === null && "text-primary")}
            >
              Any {label.toLowerCase()}
            </button>
            <div className="h-px bg-border" />
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={cn("w-full px-3 py-2 text-left text-sm hover:bg-accent", value === option.value && "text-primary")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border bg-card px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <MessagesSquare className="h-5 w-5 text-muted-foreground" />
      </span>
      <h3 className="font-serif text-xl font-normal">Nothing to discuss yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Start the next decision. Pull together notes, votes, and tasks in one place.
      </p>
      <Button onClick={onCreate} className="mt-5">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New discussion
      </Button>
    </div>
  );
}
