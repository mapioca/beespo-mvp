"use client";

import { useState } from "react";
import { CornerDownRight, ListChecks, MessageSquareReply, MoreHorizontal, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NOTE_KIND_META, type DiscussionNote } from "../data/types";
import { timeAgo } from "../lib/meta";
import { useDiscussions } from "../lib/store";
import { Avatar, Pill } from "./shared";
import { PromoteToTaskDialog } from "./PromoteToTaskDialog";

export function NoteCard({ discussionId, note }: { discussionId: string; note: DiscussionNote }) {
  const { users, meetings, addReply, openVote } = useDiscussions();
  const author = users.find((user) => user.id === note.authorId);
  const meeting = note.meetingId ? meetings.find((item) => item.id === note.meetingId) : undefined;
  const meta = NOTE_KIND_META[note.kind];
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [promoting, setPromoting] = useState(false);

  const submitReply = () => {
    const value = reply.trim();
    if (!value) return;
    addReply(discussionId, note.id, value);
    setReply("");
    setReplyOpen(false);
  };

  return (
    <article className="rounded-[8px] border border-border/70 bg-background p-4">
      <header className="flex items-start gap-3">
        {author ? <Avatar name={author.name} size={28} /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[13px] font-medium">{author?.name ?? "Unknown"}</span>
            <Pill tone={meta.tone}>
              <span>{meta.icon}</span>
              {meta.label}
            </Pill>
            <span className="text-[11px] text-muted-foreground">{timeAgo(note.createdAt)}</span>
            {meeting ? (
              <span className="font-serif text-[10.5px] italic text-muted-foreground">
                added during {meeting.title}
              </span>
            ) : null}
            {note.promotedTaskId ? (
              <Pill tone="success">
                <ListChecks className="h-3 w-3" />
                Task created
              </Pill>
            ) : null}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed">{note.body}</p>

          <div className="-ml-2 mt-3 flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setReplyOpen((open) => !open)}
              className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11.5px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
            >
              <MessageSquareReply className="h-3 w-3" />
              Reply
              {note.replies.length > 0 ? <span className="tabular-nums opacity-70">- {note.replies.length}</span> : null}
            </button>
            <button
              type="button"
              onClick={() => setPromoting(true)}
              className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11.5px] text-muted-foreground hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
              disabled={Boolean(note.promotedTaskId)}
            >
              <ListChecks className="h-3 w-3" />
              Promote to task
            </button>
            {note.kind === "proposal" ? (
              <button
                type="button"
                onClick={() => openVote(discussionId, note.id)}
                className="inline-flex items-center gap-1.5 rounded-[6px] px-2 py-1 text-[11.5px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              >
                <Vote className="h-3 w-3" />
                Call a vote
              </button>
            ) : null}
          </div>
        </div>
        <button type="button" className="-mr-1 p-1 text-muted-foreground hover:text-foreground" aria-label="More">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </header>

      {note.replies.length > 0 || replyOpen ? (
        <div className="mt-3 space-y-2.5 pl-9">
          {note.replies.map((item) => {
            const replyAuthor = users.find((user) => user.id === item.authorId);
            return (
              <div key={item.id} className="flex items-start gap-2.5">
                <CornerDownRight className="mt-1.5 h-3 w-3 shrink-0 text-muted-foreground" />
                {replyAuthor ? <Avatar name={replyAuthor.name} size={20} /> : null}
                <div className={cn("min-w-0 flex-1 rounded-[8px] border border-border/70 bg-surface-raised px-3 py-2")}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium">{replyAuthor?.name ?? "Unknown"}</span>
                    <span className="text-[10.5px] text-muted-foreground">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12.5px] leading-relaxed">{item.body}</p>
                </div>
              </div>
            );
          })}

          {replyOpen ? (
            <div className="flex items-start gap-2.5">
              <CornerDownRight className="mt-2 h-3 w-3 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <Textarea
                  autoFocus
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submitReply();
                  }}
                  placeholder="Write a reply..."
                  rows={2}
                  className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[12.5px] leading-relaxed"
                />
                <div className="mt-1.5 flex items-center gap-2">
                  <Button
                    onClick={submitReply}
                    disabled={!reply.trim()}
                    size="sm"
                    className="h-7 bg-brand px-3 text-[11.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                  >
                    Reply
                  </Button>
                  <Button
                    onClick={() => {
                      setReplyOpen(false);
                      setReply("");
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-[11.5px]"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <PromoteToTaskDialog
        open={promoting}
        onOpenChange={setPromoting}
        discussionId={discussionId}
        noteId={note.id}
        suggestedTitle={note.body.slice(0, 80)}
      />
    </article>
  );
}
