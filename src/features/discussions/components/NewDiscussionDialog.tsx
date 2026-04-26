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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { DiscussionPriority } from "../data/types";
import { PRIORITY_LABEL } from "../lib/meta";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<DiscussionPriority>("medium");
  const [asDraft, setAsDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAsDraft(false);
  };

  const submit = async () => {
    if (!title.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/discussions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          state: asDraft ? "draft" : "active",
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.error("Failed to create discussion:", result.error);
        return;
      }

      reset();
      onOpenChange(false);
      router.refresh();
      onCreated?.(result.data.id);
    } catch (error) {
      console.error("Failed to create discussion:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogContent className="max-w-[560px] p-0">
        <DialogHeader className="px-6 pb-3 pt-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New discussion</div>
          <DialogTitle className="font-serif text-2xl font-normal italic">What needs deliberation?</DialogTitle>
          <DialogDescription className="sr-only">Create a discussion item.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="A short, clear title"
            className="h-10"
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context (optional). What's the situation, who's affected, what outcome are we hoping for?"
            rows={4}
            className="resize-none text-sm leading-relaxed"
          />

          <div>
            <Label className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as DiscussionPriority)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {PRIORITY_LABEL[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="draft"
              checked={asDraft}
              onCheckedChange={(checked) => setAsDraft(checked === true)}
            />
            <Label htmlFor="draft" className="text-sm text-muted-foreground cursor-pointer">
              Save as draft
            </Label>
          </div>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!title.trim() || isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Open discussion"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
