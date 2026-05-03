"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NOTE_KIND_META, type NoteKind } from "../data/types";

const KINDS: NoteKind[] = ["idea", "question", "risk", "proposal", "key_point"];

export function NoteComposer({
  onSubmit,
  placeholder = "Add a note...",
  defaultKind = "idea",
  compact,
}: {
  onSubmit: (kind: NoteKind, body: string) => void;
  placeholder?: string;
  defaultKind?: NoteKind;
  compact?: boolean;
}) {
  const [kind, setKind] = useState<NoteKind>(defaultKind);
  const [body, setBody] = useState("");

  const submit = () => {
    const value = body.trim();
    if (!value) return;
    onSubmit(kind, value);
    setBody("");
  };

  return (
    <div className={cn("rounded-[8px] border border-border/70 bg-background p-3", compact && "p-2.5")}>
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") submit();
        }}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="resize-none border-0 bg-transparent px-1 py-1 text-[13px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <div className="mt-2 flex items-center gap-1.5 border-t border-border/70 pt-2">
        <div className="flex flex-wrap items-center gap-1">
          {KINDS.map((item) => {
            const meta = NOTE_KIND_META[item];
            const active = kind === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                title={meta.label}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[6px] border px-2 text-[11.5px] transition-colors",
                  active
                    ? "border-brand/30 bg-brand/10 text-brand"
                    : "border-transparent text-muted-foreground hover:bg-surface-hover hover:text-foreground",
                )}
              >
                <span className="text-[10.5px]">{meta.icon}</span>
                {!compact ? <span>{meta.label}</span> : null}
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-[10.5px] text-muted-foreground md:inline">Cmd + Enter</span>
          <Button
            size="sm"
            onClick={submit}
            disabled={!body.trim()}
            className="h-7 bg-brand px-3 text-[11.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
          >
            <Send className="mr-1 h-3 w-3" />
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
