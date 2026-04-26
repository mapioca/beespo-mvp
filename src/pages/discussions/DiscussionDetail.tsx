"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, CheckCircle2, ListChecks, Plus, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CloseDiscussionDialog } from "@/features/discussions/components/CloseDiscussionDialog";
import { ImpressionsPanel } from "@/features/discussions/components/ImpressionsPanel";
import { NoteCard } from "@/features/discussions/components/NoteCard";
import { NoteComposer } from "@/features/discussions/components/NoteComposer";
import { PresenceStack } from "@/features/discussions/components/PresenceStack";
import { PromoteToTaskDialog } from "@/features/discussions/components/PromoteToTaskDialog";
import { Timeline } from "@/features/discussions/components/Timeline";
import { VotePanel } from "@/features/discussions/components/VotePanel";
import { Avatar, Pill, SectionHeader } from "@/features/discussions/components/shared";
import { MEETING_TYPE_LABEL, RESOLUTION_LABEL, STATE_LABEL } from "@/features/discussions/data/types";
import { formatDate, PRIORITY_LABEL, PRIORITY_TONE, STATE_TONE, TASK_STATUS_TONE } from "@/features/discussions/lib/meta";
import { useDiscussions } from "@/features/discussions/lib/store";

export default function DiscussionDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { discussions, meetings, users, tasks, addNote, setDiscussionState, reopenDiscussion } = useDiscussions();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : undefined;
  const discussion = useMemo(() => discussions.find((item) => item.id === id), [discussions, id]);
  const [closing, setClosing] = useState(false);
  const [promoting, setPromoting] = useState(false);

  if (!discussion) {
    return (
      <div className="min-h-full bg-card px-5 py-12 text-foreground sm:px-8">
        <div className="mx-auto max-w-[900px]">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back
          </button>
          <div className="mt-8 rounded-[8px] border border-border/70 bg-background px-6 py-12 text-center">
            <h2 className="font-serif text-2xl font-normal">Discussion not found</h2>
          </div>
        </div>
      </div>
    );
  }

  const owner = users.find((user) => user.id === discussion.ownerId);
  const linkedMeetings = meetings.filter((meeting) => discussion.meetingIds.includes(meeting.id));
  const linkedTasks = tasks.filter((task) => discussion.taskIds.includes(task.id));
  const orderedNotes = [...discussion.notes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="min-h-full bg-surface-canvas px-5 py-10 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1280px]">
        <Link href="/discussions" className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          All discussions
        </Link>

        <div className="mt-5">
          <SectionHeader
            eyebrow={
              <span className="inline-flex items-center gap-2">
                <span>Discussion</span>
                <Pill tone={STATE_TONE[discussion.state]} dot>{STATE_LABEL[discussion.state]}</Pill>
                <Pill tone={PRIORITY_TONE[discussion.priority]}>{PRIORITY_LABEL[discussion.priority]}</Pill>
              </span>
            }
            title={discussion.title}
            subtitle={discussion.description}
            right={
              <div className="mt-8 flex items-center gap-2">
                <PresenceStack users={users} className="hidden xl:flex" />
                {discussion.state !== "closed" ? (
                  <>
                    {discussion.state === "draft" ? (
                      <Button variant="outline" onClick={() => setDiscussionState(discussion.id, "active")} className="h-9 bg-surface-raised text-[12.5px]">
                        Publish
                      </Button>
                    ) : null}
                    <Button
                      onClick={() => setClosing(true)}
                      className="h-9 bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Close discussion
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" onClick={() => reopenDiscussion(discussion.id)} className="h-9 bg-surface-raised text-[12.5px]">
                    Reopen
                  </Button>
                )}
              </div>
            }
          />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border/70 pb-4 text-[11.5px] text-muted-foreground">
          {owner ? (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={owner.name} size={16} />
              Owned by {owner.name}
            </span>
          ) : null}
          {discussion.dueAt ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" />
              Due {formatDate(discussion.dueAt)}
            </span>
          ) : null}
          {discussion.tags.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              {discussion.tags.map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-3">
            <span><span className="tabular-nums">{discussion.notes.length}</span> notes</span>
            <span><span className="tabular-nums">{linkedTasks.length}</span> tasks</span>
            <span><span className="tabular-nums">{linkedMeetings.length}</span> meetings</span>
          </span>
        </div>

        {discussion.state === "closed" && discussion.resolution ? (
          <div
            className={cn(
              "mt-6 rounded-[8px] border px-5 py-4",
              discussion.resolution === "decision_made"
                ? "border-[hsl(var(--cp-success)/0.3)] bg-[hsl(var(--cp-success)/0.05)]"
                : "border-border/70 bg-background",
            )}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={cn(
                  "h-4 w-4",
                  discussion.resolution === "decision_made" ? "text-[hsl(var(--cp-success))]" : "text-muted-foreground",
                )}
              />
              <span className="font-serif text-[15px] italic">{RESOLUTION_LABEL[discussion.resolution]}</span>
              {discussion.closedAt ? <span className="ml-1 text-[10.5px] text-muted-foreground">{formatDate(discussion.closedAt)}</span> : null}
            </div>
            {discussion.decision ? <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed">{discussion.decision}</p> : null}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-12 gap-8">
          <div className="col-span-12 space-y-4 lg:col-span-8">
            {discussion.state !== "closed" ? (
              <NoteComposer
                onSubmit={(kind, body) => addNote(discussion.id, { kind, body })}
                placeholder="Add a note. Use @ to mention. Cmd+Enter to post."
              />
            ) : null}

            {orderedNotes.length === 0 ? (
              <div className="rounded-[8px] border border-border/70 bg-background px-5 py-10 text-center">
                <p className="font-serif text-[15px] italic">A blank page awaits.</p>
                <p className="mt-1 text-[12px] text-muted-foreground">Notes, ideas, questions, and proposals will live here.</p>
              </div>
            ) : (
              orderedNotes.map((note) => <NoteCard key={note.id} discussionId={discussion.id} note={note} />)
            )}
          </div>

          <aside className="col-span-12 space-y-5 lg:col-span-4">
            <ImpressionsPanel discussion={discussion} />
            <VotePanel discussion={discussion} />

            <section className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
              <header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <ListChecks className="h-3.5 w-3.5 text-brand" />
                <h3 className="font-serif text-[15px] italic">Tasks</h3>
                <button
                  type="button"
                  onClick={() => setPromoting(true)}
                  className="ml-auto inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[11px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </header>
              <div className="space-y-2 p-3">
                {linkedTasks.length === 0 ? (
                  <p className="px-1 font-serif text-[12px] italic text-muted-foreground">No tasks yet. Capture commitments as they come up.</p>
                ) : null}
                {linkedTasks.map((task) => {
                  const assignee = users.find((user) => user.id === task.assigneeId);
                  return (
                    <div key={task.id} className="block rounded-[8px] border border-border/70 bg-surface-raised p-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            TASK_STATUS_TONE[task.status] === "success" && "bg-[hsl(var(--cp-success))]",
                            TASK_STATUS_TONE[task.status] === "warning" && "bg-[hsl(var(--cp-warning))]",
                            TASK_STATUS_TONE[task.status] === "primary" && "bg-brand",
                          )}
                        />
                        <span className="min-w-0 flex-1 truncate text-[12.5px]">{task.title}</span>
                        {assignee ? <Avatar name={assignee.name} size={18} /> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
              <header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
                <Users2 className="h-3.5 w-3.5 text-brand" />
                <h3 className="font-serif text-[15px] italic">Discussed in</h3>
              </header>
              <div className="space-y-2 p-3">
                {linkedMeetings.length === 0 ? (
                  <p className="px-1 font-serif text-[12px] italic text-muted-foreground">Not yet scheduled in a meeting.</p>
                ) : null}
                {linkedMeetings.map((meeting) => (
                  <div key={meeting.id} className="rounded-[8px] border border-border/70 bg-surface-raised p-2.5">
                    <div className="text-[12.5px]">{meeting.title}</div>
                    <div className="mt-0.5 text-[10.5px] text-muted-foreground">
                      {MEETING_TYPE_LABEL[meeting.type]} - {formatDate(meeting.startsAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
              <header className="border-b border-border/70 px-4 py-3">
                <h3 className="font-serif text-[15px] italic">Timeline</h3>
              </header>
              <div className="p-4">
                <Timeline discussion={discussion} />
              </div>
            </section>
          </aside>
        </div>
      </div>

      <CloseDiscussionDialog open={closing} onOpenChange={setClosing} discussionId={discussion.id} />
      <PromoteToTaskDialog
        open={promoting}
        onOpenChange={setPromoting}
        discussionId={discussion.id}
        suggestedTitle={`Follow-up on: ${discussion.title}`}
      />
    </div>
  );
}
