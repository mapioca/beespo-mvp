"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TaskPriority } from "../data/types";
import { PRIORITY_LABEL, TASK_PRIORITY_ORDER } from "../lib/meta";
import { useDiscussions } from "../lib/store";

export function PromoteToTaskDialog({
  open,
  onOpenChange,
  discussionId,
  noteId,
  suggestedTitle,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discussionId: string;
  noteId?: string;
  suggestedTitle?: string;
}) {
  const { users, currentUserId, addTask, promoteNoteToTask, linkTaskToDiscussion } = useDiscussions();
  const [assignee, setAssignee] = useState(currentUserId);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueAt, setDueAt] = useState<Date | undefined>();

  const submit = () => {
    if (noteId) {
      promoteNoteToTask(discussionId, noteId, {
        assigneeId: assignee,
        priority,
        dueAt: dueAt?.toISOString(),
      });
    } else if (suggestedTitle) {
      const id = addTask({
        title: suggestedTitle.slice(0, 80),
        assigneeId: assignee,
        priority,
        dueAt: dueAt?.toISOString(),
        tags: ["discussion"],
      });
      linkTaskToDiscussion(discussionId, id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] border-border/70 bg-background p-0">
        <DialogHeader className="px-6 pb-3 pt-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Promote to task</div>
          <DialogTitle className="font-serif text-2xl font-normal italic">Make it actionable</DialogTitle>
          <DialogDescription className="sr-only">Create a task linked to this discussion.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-5">
          {suggestedTitle ? (
            <div className="rounded-[8px] border border-border/70 bg-surface-raised p-3 font-serif text-[12.5px] italic leading-relaxed text-muted-foreground">
              {suggestedTitle.length > 140 ? `${suggestedTitle.slice(0, 140)}...` : suggestedTitle}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assignee</div>
              <Select value={assignee} onValueChange={setAssignee}>
                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id} className="text-[12.5px]">
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Priority</div>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
                <SelectTrigger className="h-9 bg-surface-sunken text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITY_ORDER.map((item) => (
                    <SelectItem key={item} value={item} className="text-[12.5px]">
                      {PRIORITY_LABEL[item]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Due date</div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-9 w-full justify-start rounded-[8px] border border-border bg-surface-sunken text-left text-[12.5px] font-normal",
                      !dueAt && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-70" />
                    {dueAt ? format(dueAt, "PPP") : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueAt} onSelect={setDueAt} initialFocus className="p-3" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border/70 px-6 py-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[12.5px]">
            Cancel
          </Button>
          <Button onClick={submit} className="bg-brand text-[12.5px] text-brand-foreground hover:bg-[hsl(var(--brand-hover))]">
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
