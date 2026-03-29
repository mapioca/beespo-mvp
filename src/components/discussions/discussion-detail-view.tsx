"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { AutoSaveTextarea } from "@/components/ui/auto-save-textarea";
import { DiscussionNotesSection } from "./discussion-notes-section";
import { DiscussionTasksSection } from "./discussion-tasks-section";
import { DiscussionActivitySection } from "./discussion-activity-section";
import { CreateTaskDialog } from "@/components/tasks/create-task-dialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { logDiscussionActivity } from "@/lib/actions/discussion-actions";
import { Database } from "@/types/database";

type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  assignee?: { full_name: string } | null;
};

interface Note {
  id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  meeting_id: string | null;
  creator?: { full_name: string };
  meeting?: { title: string; scheduled_date: string };
}

interface Activity {
  id: string;
  user_id: string | null;
  activity_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
  user?: { full_name: string } | null;
}

interface Discussion {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  due_date: string | null;
  workspace_discussion_id: string | null;
  created_at: string;
  created_by: string | null;
}

interface DiscussionDetailViewProps {
  discussion: Discussion;
  creatorName: string | null;
  initialNotes: Note[];
  initialTasks: Task[];
  initialActivities: Activity[];
  currentUserId: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "active", label: "Active" },
  { value: "decision_required", label: "Decision Required" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
  { value: "deferred", label: "Deferred" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const CATEGORY_OPTIONS = [
  { value: "member_concerns", label: "Member Concerns" },
  { value: "activities", label: "Activities" },
  { value: "service_opportunities", label: "Service Opportunities" },
  { value: "callings", label: "Callings" },
  { value: "temple_work", label: "Temple Work" },
  { value: "budget", label: "Budget" },
  { value: "facilities", label: "Facilities" },
  { value: "youth", label: "Youth" },
  { value: "mission_work", label: "Mission Work" },
  { value: "other", label: "Other" },
];

export function DiscussionDetailView({
  discussion,
  creatorName,
  initialNotes,
  initialTasks,
  initialActivities,
  currentUserId,
}: DiscussionDetailViewProps) {
  const router = useRouter();
  const [title, setTitle] = useState(discussion.title);
  const [savedTitle, setSavedTitle] = useState(discussion.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);

  const [status, setStatus] = useState(discussion.status);
  const [priority, setPriority] = useState(discussion.priority);
  const [category, setCategory] = useState(discussion.category);
  const [dueDate, setDueDate] = useState(discussion.due_date?.split("T")[0] ?? "");

  const updateField = async (field: string, value: string | null) => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("discussions") as any)
      .update({ [field]: value })
      .eq("id", discussion.id);

    if (error) {
      toast.error("Failed to update.");
      return false;
    }
    router.refresh();
    return true;
  };

  const handleTitleBlur = async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === savedTitle) return;
    setIsSavingTitle(true);
    const ok = await updateField("title", trimmed);
    if (ok) {
      setSavedTitle(trimmed);
      logDiscussionActivity(discussion.id, "title_changed");
    } else {
      setTitle(savedTitle);
    }
    setIsSavingTitle(false);
  };

  const handleStatusChange = async (value: string) => {
    const prev = status;
    setStatus(value);
    const ok = await updateField("status", value);
    if (ok) {
      logDiscussionActivity(discussion.id, "status_changed", { from: prev, to: value });
    } else {
      setStatus(prev);
    }
  };

  const handlePriorityChange = async (value: string) => {
    const prev = priority;
    setPriority(value);
    const ok = await updateField("priority", value);
    if (ok) {
      logDiscussionActivity(discussion.id, "priority_changed", { from: prev, to: value });
    } else {
      setPriority(prev);
    }
  };

  const handleCategoryChange = async (value: string) => {
    const prev = category;
    setCategory(value);
    const ok = await updateField("category", value);
    if (ok) {
      logDiscussionActivity(discussion.id, "category_changed", { from: prev, to: value });
    } else {
      setCategory(prev);
    }
  };

  const handleDueDateChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const prev = dueDate;
    setDueDate(value);
    const ok = await updateField("due_date", value || null);
    if (ok) {
      logDiscussionActivity(discussion.id, "due_date_changed", { to: value || null });
    } else {
      setDueDate(prev);
    }
  };

  const handleSaveDescription = async (value: string) => {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("discussions") as any)
      .update({ description: value.trim() || null })
      .eq("id", discussion.id);

    if (error) {
      toast.error("Failed to save description.");
      throw error;
    }
    logDiscussionActivity(discussion.id, "description_changed");
    router.refresh();
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Breadcrumb */}
      <Breadcrumbs
        items={[
          { label: "Meetings", href: "/meetings/agendas", icon: <CalendarDays className="h-4 w-4 stroke-[1.6]" /> },
          { label: "Discussions", href: "/meetings/discussions", icon: <MessageSquare className="h-4 w-4 stroke-[1.6]" /> },
          { label: title },
        ]}
        className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
          {/* Header card */}
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            {/* Inline-editable Title */}
            <div className="relative">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                disabled={isSavingTitle}
                className="w-full text-2xl font-semibold bg-transparent border border-transparent rounded-md hover:border-border/50 focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-transparent px-2 py-1 -mx-2 transition-all duration-150 disabled:opacity-60"
              />
            </div>

            {/* Properties Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status</span>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-7 w-auto rounded-full border border-border/40 bg-muted/40 hover:bg-muted/60 shadow-none text-xs font-medium px-3 focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-border/50 text-xs">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Priority</span>
              <Select value={priority} onValueChange={handlePriorityChange}>
                <SelectTrigger className="h-7 w-auto rounded-full border border-border/40 bg-muted/40 hover:bg-muted/60 shadow-none text-xs font-medium px-3 focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-border/50 text-xs">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Category</span>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger className="h-7 w-auto rounded-full border border-border/40 bg-muted/40 hover:bg-muted/60 shadow-none text-xs font-medium px-3 focus:ring-0 focus:ring-offset-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-border/50 text-xs">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Due</span>
              <input
                type="date"
                value={dueDate}
                onChange={handleDueDateChange}
                className="h-7 bg-muted/40 border border-border/40 hover:bg-muted/60 rounded-full text-xs font-medium px-3 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-border/40 transition-all"
              />
            </div>

            <span className="text-border/50 text-xs">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Created</span>
              <span className="text-xs font-medium">
                {format(new Date(discussion.created_at), "MMM d, yyyy")}
              </span>
            </div>

            {creatorName && (
              <>
                <span className="text-border/50 text-xs">·</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">By</span>
                  <span className="text-xs font-medium">{creatorName}</span>
                </div>
              </>
            )}
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em] mb-3">Description</p>
            <AutoSaveTextarea
              initialValue={discussion.description ?? ""}
              onSave={handleSaveDescription}
              placeholder="Add a description..."
              minRows={1}
            />
          </div>

          {/* Notes */}
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <DiscussionNotesSection
              discussionId={discussion.id}
              initialNotes={initialNotes}
              currentUserId={currentUserId}
            />
          </div>

          {/* Tasks */}
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.2em]">
                Tasks{initialTasks.length > 0 ? ` (${initialTasks.length})` : ""}
              </p>
              <CreateTaskDialog
                context={{ discussion_id: discussion.id }}
                onTaskCreated={() => router.refresh()}
              >
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                  <Plus className="h-3.5 w-3.5 stroke-[1.6]" />
                </Button>
              </CreateTaskDialog>
            </div>
            {initialTasks.length > 0 ? (
              <DiscussionTasksSection initialTasks={initialTasks} />
            ) : (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            )}
          </div>

          {/* Activity */}
          <div className="rounded-2xl border border-border/60 bg-background/80 p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)] pb-6">
            <DiscussionActivitySection activities={initialActivities} />
          </div>

        </div>
      </div>
    </div>
  );
}
