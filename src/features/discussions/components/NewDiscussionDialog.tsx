"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDiscussions } from "../lib/store";
import type { DiscussionPriority } from "../data/types";
import { PRIORITY_LABEL } from "../lib/meta";

const PRIORITY_OPTIONS: DiscussionPriority[] = ["urgent", "high", "medium", "low"];

export function NewDiscussionDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
}) {
  const { createDiscussion } = useDiscussions();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<DiscussionPriority>("medium");
  const [tags, setTags] = useState("");
  const [asDraft, setAsDraft] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setTags("");
    setAsDraft(false);
  };

  const submit = () => {
    if (!title.trim()) return;
    const id = createDiscussion({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      tags: tags
        .split(",")
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean),
      state: asDraft ? "draft" : "active",
    });
    reset();
    onOpenChange(false);
    onCreated?.(id);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-w-[560px] border-border/70 bg-background p-0">
        <DialogHeader className="px-6 pb-3 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">New discussion</div>
          <DialogTitle className="font-serif text-2xl font-normal italic">What needs deliberation?</DialogTitle>
          <DialogDescription className="sr-only">Create a discussion item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          <Input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="A short, clear title"
            className="h-10 rounded-[8px] border-border/80 bg-surface-sunken text-[14px]"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Context (optional). What's the situation, who's affected, what outcome are we hoping for?"
            rows={4}
            className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[13px] leading-relaxed"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</div>
              <Select value={priority} onValueChange={(value) => setPriority(value as DiscussionPriority)}>
                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item} className="text-[12.5px]">
                      {PRIORITY_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Tags</div>
              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="comma, separated"
                className="h-9 rounded-[8px] border-border/80 bg-surface-sunken text-[12.5px]"
              />
            </div>
          </div>

          <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] text-muted-foreground">
            <input
              type="checkbox"
              checked={asDraft}
              onChange={(event) => setAsDraft(event.target.checked)}
              className="accent-brand"
            />
            Save as draft
          </label>
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
            className="text-[12.5px]"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!title.trim()}
            className="bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
          >
            Open discussion
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
