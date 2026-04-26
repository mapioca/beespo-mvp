"use client";

import { useMemo, useState } from "react";
import { MessagesSquare, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DiscussionRow } from "@/features/discussions/components/DiscussionRow";
import { NewDiscussionDialog } from "@/features/discussions/components/NewDiscussionDialog";
import { Pill, SectionHeader } from "@/features/discussions/components/shared";
import { STATE_LABEL, type Discussion, type DiscussionPriority, type DiscussionState } from "@/features/discussions/data/types";
import { PRIORITY_LABEL, PRIORITY_RANK, STATE_TONE } from "@/features/discussions/lib/meta";
import { useDiscussions } from "@/features/discussions/lib/store";

type Scope = "all" | "active" | "draft" | "closed";

const SCOPES: Array<{ key: Scope; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Drafts" },
  { key: "closed", label: "Closed" },
];

export default function Discussions() {
  const { discussions } = useDiscussions();
  const [scope, setScope] = useState<Scope>("active");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<DiscussionPriority | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const discussion of discussions) for (const tag of discussion.tags) set.add(tag);
    return Array.from(set).sort();
  }, [discussions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return discussions
      .filter((discussion) => {
        if (scope !== "all" && discussion.state !== scope) return false;
        if (priorityFilter && discussion.priority !== priorityFilter) return false;
        if (tagFilter && !discussion.tags.includes(tagFilter)) return false;
        if (query) {
          const haystack = `${discussion.title} ${discussion.description ?? ""} ${discussion.tags.join(" ")}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (priority !== 0) return priority;
        const aLast = a.timeline[a.timeline.length - 1]?.at ?? a.createdAt;
        const bLast = b.timeline[b.timeline.length - 1]?.at ?? b.createdAt;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      });
  }, [discussions, priorityFilter, scope, search, tagFilter]);

  const counts = useMemo(
    () => ({
      all: discussions.length,
      active: discussions.filter((discussion) => discussion.state === "active").length,
      draft: discussions.filter((discussion) => discussion.state === "draft").length,
      closed: discussions.filter((discussion) => discussion.state === "closed").length,
    }),
    [discussions],
  );

  const grouped = useMemo(() => {
    const out: Record<DiscussionState, Discussion[]> = { active: [], draft: [], closed: [] };
    for (const discussion of filtered) out[discussion.state].push(discussion);
    return out;
  }, [filtered]);

  const hasActiveFilter = priorityFilter !== null || tagFilter !== null || search.trim() !== "";
  const stateOrder: DiscussionState[] = ["active", "draft", "closed"];

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
              className="mt-9 h-9 rounded-[8px] bg-brand px-4 text-[12.5px] font-medium text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New discussion
            </Button>
          }
        />

        <div className="mt-10 flex items-center gap-8 border-b border-border/70">
          {SCOPES.map((item) => {
            const active = scope === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setScope(item.key)}
                className={cn(
                  "-mb-px border-b-2 pb-3 text-[13px] transition-colors",
                  active ? "border-brand text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                <span className="ml-2 text-[10px] tabular-nums opacity-70">{counts[item.key]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search discussions..."
              className="h-8 w-[240px] rounded-[8px] border-border/70 bg-surface-sunken pl-8 text-[12.5px]"
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
          {allTags.length > 0 ? (
            <FilterMenu
              label="Tag"
              value={tagFilter}
              options={allTags.map((tag) => ({ value: tag, label: `#${tag}` }))}
              onChange={setTagFilter}
            />
          ) : null}
          {hasActiveFilter ? (
            <button
              type="button"
              className="ml-1 inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setSearch("");
                setPriorityFilter(null);
                setTagFilter(null);
              }}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
          <div className="ml-auto text-[11.5px] tabular-nums text-muted-foreground">
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
                      <span className="text-[11px] tabular-nums text-muted-foreground">{list.length}</span>
                    </div>
                    <div className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
                      {list.map((discussion, index) => (
                        <div key={discussion.id} className={cn(index > 0 && "border-t border-border/60")}>
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

      <NewDiscussionDialog open={creating} onOpenChange={setCreating} />
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
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] transition-colors",
          active
            ? "border-brand/40 bg-brand/10 text-brand"
            : "border-border/70 bg-surface-raised text-muted-foreground hover:bg-surface-hover hover:text-foreground",
        )}
      >
        <span className="opacity-80">{label}:</span>
        <span>{current?.label ?? "Any"}</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] overflow-hidden rounded-[8px] border border-border/70 bg-popover shadow-lg">
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn("w-full px-3 py-2 text-left text-[12px] hover:bg-surface-hover", value === null && "text-brand")}
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
                className={cn("w-full px-3 py-2 text-left text-[12px] hover:bg-surface-hover", value === option.value && "text-brand")}
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
    <div className="rounded-[8px] border border-border/70 bg-background px-6 py-16 text-center">
      <span className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised">
        <MessagesSquare className="h-5 w-5 text-muted-foreground" />
      </span>
      <h3 className="font-serif text-xl font-normal">Nothing to discuss yet</h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        Start the next decision. Pull together notes, votes, and tasks in one place.
      </p>
      <Button onClick={onCreate} className="mt-5 h-8 bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        New discussion
      </Button>
    </div>
  );
}
