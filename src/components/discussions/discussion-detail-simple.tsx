"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ListChecks, Plus, Sparkles, Lightbulb, HelpCircle, AlertTriangle, CheckSquare, Pin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";

interface Note {
  id: string;
  content: string;
  note_kind?: string;
  created_by: string;
  created_at: string;
  creator?: { full_name: string };
  meeting?: { title: string; scheduled_date: string };
}

interface Task {
  id: string;
  title: string;
  status: string;
  assignee?: { full_name: string } | null;
}

interface Activity {
  id: string;
  activity_type: string;
  created_at: string;
  user?: { full_name: string } | null;
}

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
}

interface Props {
  discussion: Discussion;
  notes: Note[];
  tasks: Task[];
  activities: Activity[];
  impressions: Array<{ id: string; content: string; created_at: string }>;
  currentUserId: string;
}

const NOTE_KINDS = [
  { value: "idea", label: "Idea", Icon: Lightbulb },
  { value: "question", label: "Question", Icon: HelpCircle },
  { value: "risk", label: "Risk", Icon: AlertTriangle },
  { value: "proposal", label: "Proposal", Icon: CheckSquare },
  { value: "key_point", label: "Key point", Icon: Pin },
];

export function DiscussionDetailSimple({ discussion, notes: initialNotes, tasks, activities, impressions: initialImpressions, currentUserId }: Props) {
  const router = useRouter();
  const [noteKind, setNoteKind] = useState("key_point");
  const [noteBody, setNoteBody] = useState("");
  const [impressionBody, setImpressionBody] = useState("");
  const [impressions, setImpressions] = useState(initialImpressions);

  const orderedNotes = [...initialNotes].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleAddNote = async () => {
    const body = noteBody.trim();
    if (!body) return;

    const supabase = createClient();
    const { error } = await (supabase.from("discussion_notes") as ReturnType<typeof supabase.from>).insert({
      discussion_id: discussion.id,
      content: body,
      note_kind: noteKind,
      created_by: currentUserId,
    });

    if (error) {
      toast.error("Failed to add note");
      return;
    }

    setNoteBody("");
    router.refresh();
  };

  const handleAddImpression = async () => {
    const body = impressionBody.trim();
    if (!body) return;

    const supabase = createClient();
    const { data, error } = await (supabase
      .from("spiritual_impressions") as ReturnType<typeof supabase.from>)
      .insert({
        discussion_id: discussion.id,
        content: body,
        author_id: currentUserId,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to add impression");
      return;
    }

    setImpressionBody("");
    setImpressions([...impressions, data]);
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

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px] text-muted-foreground border-b border-border pb-4">
        {discussion.due_date && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" /> Due {new Date(discussion.due_date).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-3">
          <span><span className="tabular-nums">{initialNotes.length}</span> notes</span>
          <span><span className="tabular-nums">{tasks.length}</span> tasks</span>
        </span>
      </div>

      <div className="mt-8 grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-4">
          {discussion.status !== "closed" && (
            <div className="rounded-xl border border-border/70 bg-background p-3">
              <Textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleAddNote();
                }}
                placeholder="Add a note. Use @ to mention. ⌘+Enter to post."
                rows={3}
                className="resize-none border-0 bg-transparent px-1 py-1 text-[13px] leading-relaxed focus-visible:ring-0"
              />
              <div className="mt-2 flex items-center gap-1.5 border-t border-border/70 pt-2">
                <div className="flex gap-1">
                  {NOTE_KINDS.map((k) => {
                    const Icon = k.Icon;
                    return (
                      <button
                        key={k.value}
                        onClick={() => setNoteKind(k.value)}
                        className={cn(
                          "h-7 px-2 rounded-md text-[11.5px] inline-flex items-center gap-1",
                          noteKind === k.value
                            ? "bg-brand/10 text-brand border border-brand/30"
                            : "text-muted-foreground hover:bg-surface-hover"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        <span>{k.label}</span>
                      </button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!noteBody.trim()}
                  className="ml-auto h-7 bg-brand px-3 text-[11.5px]"
                >
                  Post
                </Button>
              </div>
            </div>
          )}

          {orderedNotes.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-background px-5 py-10 text-center">
              <p className="font-serif italic text-[15px]">A blank page awaits.</p>
              <p className="text-[12px] text-muted-foreground mt-1">
                Notes, ideas, questions, and proposals will live here.
              </p>
            </div>
          ) : (
            orderedNotes.map((note) => {
              const kind = NOTE_KINDS.find((k) => k.value === note.note_kind);
              const Icon = kind?.Icon;
              return (
                <article key={note.id} className="rounded-xl border border-border/70 bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="font-medium">{note.creator?.full_name ?? "Unknown"}</span>
                        {kind && Icon && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-raised border border-border/70 text-[11px]">
                            <Icon className="h-3 w-3" />
                            {kind.label}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>

        <aside className="col-span-12 lg:col-span-4 space-y-5">
          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              <h3 className="font-serif italic text-[15px]">Spiritual impressions</h3>
              <span className="ml-auto text-[10.5px] text-muted-foreground">Private</span>
            </header>
            <div className="p-3 space-y-3">
              {impressions.map((imp) => (
                <div key={imp.id} className="rounded-lg p-3 bg-surface-raised border border-border/70">
                  <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{imp.content}</p>
                  <span className="text-[10.5px] text-muted-foreground mt-2 block">
                    {new Date(imp.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
              <Textarea
                value={impressionBody}
                onChange={(e) => setImpressionBody(e.target.value)}
                placeholder="An impression, even half-formed..."
                rows={2}
                className="resize-none text-[12.5px]"
              />
              <Button
                onClick={handleAddImpression}
                disabled={!impressionBody.trim()}
                size="sm"
                className="h-7 bg-brand px-3 text-[11.5px] w-full"
              >
                Record privately
              </Button>
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70 flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-brand" />
              <h3 className="font-serif italic text-[15px]">Tasks</h3>
              <Button variant="ghost" size="icon" className="ml-auto h-6 w-6">
                <Plus className="h-3.5 w-3.5" />
              </Button>
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
                          t.status === "done" ? "bg-[hsl(var(--cp-success))]" : "bg-brand"
                        )}
                      />
                      <span className="text-[12.5px] truncate flex-1">{t.title}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-border/70 bg-background">
            <header className="px-4 py-3 border-b border-border/70">
              <h3 className="font-serif italic text-[15px]">Timeline</h3>
            </header>
            <div className="p-4">
              <ol className="relative space-y-3">
                <span className="absolute bottom-1 left-[11px] top-1 w-px bg-border" />
                {activities.map((event) => (
                  <li key={event.id} className="relative pl-8">
                    <span className="absolute left-0 top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border/70 bg-background">
                      <span className="h-2 w-2 rounded-full bg-brand" />
                    </span>
                    <div className="text-[12.5px] leading-snug">
                      {event.activity_type.replace(/_/g, " ")}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                      {event.user && <span>{event.user.full_name}</span>}
                      <span>·</span>
                      <span>{new Date(event.created_at).toLocaleDateString()}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
