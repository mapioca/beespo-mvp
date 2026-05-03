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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { RESOLUTION_LABEL, type DiscussionResolution } from "../data/types";
import { useDiscussions } from "../lib/store";

const OPTIONS: Array<{ value: DiscussionResolution; description: string }> = [
  { value: "decision_made", description: "We reached a clear outcome and want it on the record." },
  { value: "deferred", description: "Pause for now and bring this back later." },
  { value: "no_decision_needed", description: "The discussion was informational. Nothing needs action." },
];

export function CloseDiscussionDialog({
  open,
  onOpenChange,
  discussionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discussionId: string;
}) {
  const { closeDiscussion } = useDiscussions();
  const [resolution, setResolution] = useState<DiscussionResolution>("decision_made");
  const [decision, setDecision] = useState("");

  const submit = () => {
    closeDiscussion(discussionId, resolution, resolution === "decision_made" ? decision.trim() : undefined);
    onOpenChange(false);
    setDecision("");
    setResolution("decision_made");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] border-border/70 bg-background p-0">
        <DialogHeader className="px-6 pb-3 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Close discussion</div>
          <DialogTitle className="font-serif text-2xl font-normal italic">Record the outcome</DialogTitle>
          <DialogDescription className="sr-only">Choose how this discussion concluded.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          <div className="space-y-2">
            {OPTIONS.map((option) => {
              const active = resolution === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setResolution(option.value)}
                  className={cn(
                    "w-full rounded-[8px] border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-brand/50 bg-brand/10"
                      : "border-border/70 bg-surface-raised hover:bg-surface-hover",
                  )}
                >
                  <div className={cn("text-[13px] font-medium", active && "text-brand")}>
                    {RESOLUTION_LABEL[option.value]}
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{option.description}</div>
                </button>
              );
            })}
          </div>

          {resolution === "decision_made" ? (
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Decision</div>
              <Textarea
                value={decision}
                onChange={(event) => setDecision(event.target.value)}
                rows={4}
                placeholder="Summarize what was decided. Be specific with names, dates, and owners."
                className="resize-none rounded-[8px] border-border/80 bg-surface-sunken text-[13px] leading-relaxed"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[12.5px]">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={resolution === "decision_made" && !decision.trim()}
            className="bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]"
          >
            Close and archive
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
