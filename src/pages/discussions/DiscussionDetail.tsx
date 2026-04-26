"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, ListChecks, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NoteComposer } from "@/features/discussions/components/NoteComposer";
import { NoteCard } from "@/features/discussions/components/NoteCard";
import { ImpressionsPanel } from "@/features/discussions/components/ImpressionsPanel";
import { Timeline } from "@/features/discussions/components/Timeline";
import type { Discussion, DiscussionNote, NoteKind } from "@/features/discussions/data/types";

interface DiscussionDetailProps {
  discussion: Discussion;
  notes: DiscussionNote[];
  tasks: Array<{ id: string; title: string; status: string; assignee?: { name: string } }>;
  meetings: Array<{ id: string; title: string; type: string; startsAt: string }>;
}

export default function DiscussionDetail({ discussion, notes, tasks, meetings }: DiscussionDetailProps) {
  const orderedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [notes]
  );

  const handleAddNote = async (kind: NoteKind, body: string) => {
    // TODO: Implement note creation
    console.log("Add note:", kind, body);
  };

  return (
    <div className="px-8 py-10 lg:px-12 max-w-[1280px] mx-auto">
      <Link
        href="/discussions"
        className="text-[12px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> All discussions
      </Link>

      <div className="mt-5">
        <h1 className="font-serif text-3xl">{discussion.title}</h1>
        {discussion.description && (
          <p className="mt-3 text-[14px] text-muted-foreground leading-relaxed">{discussion.description}</p>
        )}
      </div>

      {/* Meta strip */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-muted-foreground border-b border-border pb-4">
        {discussion.dueAt && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" /> Due {new Date(discussion.dueAt).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-3">
          <span>
            <span className="tabular-nums">{notes.length}</span> notes
          </span>
          <span>
            <span className="tabular-nums">{tasks.length}</span> tasks
          </span>
          <span>
            <span className="tabular-nums">{meetings.length}</span> meetings
          </span>
        </span>
      </div>

      {/* 3-column layout */}
      <div className="mt-8 grid grid-cols-12 gap-8">
        {/* Notes column */}
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {discussion.state !== "closed" && (
            <NoteComposer
              onSubmit={handleAddNote}
              placeholder="Add a note. Use @ to mention. ⌘+Enter to post."
            />
          )}

          {orderedNotes.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-background px-5 py-10 text-center">
              <p className="font-serif italic text-[15px]">A blank page awaits.</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Notes, ideas, questions, and proposals will live here.
              </p>
            </div>
          ) : (
            orderedNotes.map((n) => <NoteCard key={n.id} discussionId={discussion.id} note={n} />)
          )}
        </div>

        {/* Right rail */}
        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <ImpressionsPanel discussion={discussion} />

          {/* Tasks */}
          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70 flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-brand" />
              <h3 className="font-serif italic text-[15px]">Tasks</h3>
            </header>
            <div className="p-3 space-y-2">
              {tasks.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic px-1">
                  No tasks yet — capture commitments as they come up.
                </p>
              ) : (
                tasks.map((t) => (
                  <Link
                    key={t.id}
                    href="/tasks"
                    className="block rounded-lg p-2.5 bg-surface-raised border border-border/70 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          t.status === "done"
                            ? "bg-[hsl(var(--cp-success))]"
                            : t.status === "blocked"
                            ? "bg-[hsl(var(--cp-warning))]"
                            : "bg-brand"
                        )}
                      />
                      <span className="text-[12.5px] truncate flex-1">{t.title}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Meetings */}
          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70 flex items-center gap-2">
              <Users2 className="h-3.5 w-3.5 text-brand" />
              <h3 className="font-serif italic text-[15px]">Discussed in</h3>
            </header>
            <div className="p-3 space-y-2">
              {meetings.length === 0 ? (
                <p className="text-[12px] text-muted-foreground italic px-1">
                  Not yet scheduled in a meeting.
                </p>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="rounded-lg p-2.5 bg-surface-raised border border-border/70">
                    <div className="text-[12.5px]">{m.title}</div>
                    <div className="text-[10.5px] text-muted-foreground mt-0.5">
                      {m.type} · {new Date(m.startsAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Timeline */}
          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70">
              <h3 className="font-serif italic text-[15px]">Timeline</h3>
            </header>
            <div className="p-4">
              <Timeline discussion={discussion} />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
