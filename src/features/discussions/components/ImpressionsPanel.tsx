"use client";

import { useState } from "react";
import { Lock, Pencil, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "../lib/meta";
import { useDiscussions } from "../lib/store";
import type { Discussion } from "../data/types";

export function ImpressionsPanel({ discussion }: { discussion: Discussion }) {
  const { currentUserId, addImpression, updateImpression, deleteImpression, promoteImpression } = useDiscussions();
  const own = discussion.impressions.filter((item) => item.authorId === currentUserId);
  const [body, setBody] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const submit = () => {
    const value = body.trim();
    if (!value) return;
    addImpression(discussion.id, value);
    setBody("");
  };

  return (
    <section className="overflow-hidden rounded-[8px] border border-border/70 bg-background">
      <header className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <Sparkles className="h-3.5 w-3.5 text-brand" />
        <h3 className="font-serif text-[15px] italic">Spiritual impressions</h3>
        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <Lock className="h-3 w-3" />
          Private to you
        </span>
      </header>

      <div className="space-y-3 p-3">
        {own.length === 0 ? (
          <p className="px-1 font-serif text-[12px] italic text-muted-foreground">
            Quiet thoughts you&#39;re still listening to. Nothing here is shared.
          </p>
        ) : null}
        {own.map((item) => {
          const isEditing = editingId === item.id;
          return (
            <div key={item.id} className="rounded-[8px] border border-border/70 bg-surface-raised p-3">
              {isEditing ? (
                <>
                  <Textarea
                    value={editBody}
                    onChange={(event) => setEditBody(event.target.value)}
                    rows={3}
                    className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[12.5px]"
                  />
                  <div className="mt-2 flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-[11.5px]" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 bg-brand px-3 text-[11.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
                      onClick={() => {
                        updateImpression(discussion.id, item.id, editBody.trim());
                        setEditingId(null);
                      }}
                    >
                      Save
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{item.body}</p>
                  <div className="mt-2 flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <span>{timeAgo(item.updatedAt)}</span>
                    {item.promotedNoteId ? (
                      <span className="ml-2 font-serif italic text-brand">shared as a note</span>
                    ) : null}
                    <div className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Edit"
                        className="rounded-[6px] p-1 hover:bg-surface-hover hover:text-foreground"
                        onClick={() => {
                          setEditingId(item.id);
                          setEditBody(item.body);
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        className="rounded-[6px] p-1 hover:bg-surface-hover hover:text-destructive"
                        onClick={() => deleteImpression(discussion.id, item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      {!item.promotedNoteId ? (
                        <button
                          type="button"
                          className="ml-1 rounded-[6px] px-1.5 py-0.5 text-[10.5px] hover:bg-brand/10 hover:text-brand"
                          onClick={() => promoteImpression(discussion.id, item.id, "key_point")}
                        >
                          Share publicly
                        </button>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}

        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="An impression, even half-formed..."
          rows={2}
          className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[12.5px] leading-relaxed"
        />
        <div className="flex justify-end">
          <Button
            onClick={submit}
            disabled={!body.trim()}
            size="sm"
            className="h-7 bg-brand px-3 text-[11.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
          >
            Record privately
          </Button>
        </div>
      </div>
    </section>
  );
}
