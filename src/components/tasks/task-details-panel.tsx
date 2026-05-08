"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    DetailsPanel,
    DetailsPanelSection,
    DetailsPanelField,
} from "@/components/ui/details-panel";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Send,
    MessageSquare,
    Activity as ActivityIcon,
    Loader2,
    CalendarIcon,
    CircleDashed,
    CircleCheck,
    CircleX,
    PlayCircle,
    ChevronDown,
    ChevronUp,
    ChevronsUp,
    UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import {
    addTaskComment,
    getTaskActivity,
    updateTask,
    deleteTask,
} from "@/lib/actions/task-actions";
import { cn } from "@/lib/utils";
import type { Task } from "@/components/tasks/tasks-table";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
    { value: "pending", label: "Pending", icon: CircleDashed },
    { value: "in_progress", label: "In Progress", icon: PlayCircle },
    { value: "completed", label: "Completed", icon: CircleCheck },
    { value: "cancelled", label: "Cancelled", icon: CircleX },
];

const PRIORITY_OPTIONS = [
    { value: "low", label: "Low", icon: ChevronDown },
    { value: "medium", label: "Medium", icon: ChevronUp },
    { value: "high", label: "High", icon: ChevronsUp },
];

const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
};

// ── Types ────────────────────────────────────────────────────────────────────

interface TaskDetailsPanelProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task | null;
}

interface TimelineItem {
    id: string;
    created_at: string;
    type: "comment" | "activity";
    activity_type?: string;
    content?: string;
    user?: { full_name: string } | null;
    details?: { from?: string; to?: string; snippet?: string };
}

// ── Shared control styles ────────────────────────────────────────────────────

const inlineSelectTrigger =
    "h-7 border-0 bg-transparent shadow-none px-1.5 hover:bg-muted/50 rounded-md focus:ring-0 text-drawer-value font-medium";
const selectContentClass =
    "rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg";
const selectItemClass =
    "rounded-md px-2.5 py-1.5 text-drawer-menu-item font-medium leading-none tracking-normal focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-text))]";

// ── Component ────────────────────────────────────────────────────────────────

export function TaskDetailsPanel({
    open,
    onOpenChange,
    task,
}: TaskDetailsPanelProps) {
    const router = useRouter();

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("pending");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [assignee, setAssignee] = useState("unassigned");
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

    // UI state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Activity state
    const [newComment, setNewComment] = useState("");
    const [sending, setSending] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);

    // Profiles for assignee dropdown
    const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

    // ── Data fetching ───────────────────────────────────────────────────

    useEffect(() => {
        if (open) {
            const fetchProfiles = async () => {
                const supabase = createClient();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data } = await (supabase.from("profiles") as any)
                    .select("id, full_name")
                    .order("full_name");
                if (data) setProfiles(data);
            };
            fetchProfiles();
        }
    }, [open]);

    const fetchActivity = useCallback(async () => {
        if (!task) return;
        setActivityLoading(true);
        const { comments, activities } = await getTaskActivity(task.id);
        const combined: TimelineItem[] = [
            ...(comments || []).map(
                (c) =>
                    ({
                        ...(c as Record<string, unknown>),
                        type: "comment" as const,
                    } as unknown as TimelineItem)
            ),
            ...(activities || [])
                .filter((a) => a.activity_type !== "comment")
                .map(
                    (a) =>
                        ({
                            ...(a as Record<string, unknown>),
                            type: "activity" as const,
                        } as unknown as TimelineItem)
                ),
        ].sort(
            (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
        );
        setTimeline(combined);
        setActivityLoading(false);
    }, [task]);

    // Sync form state when task changes
    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || "");
            setStatus(task.status);
            setPriority(
                (task.priority as "low" | "medium" | "high") ?? "medium"
            );
            setAssignee(task.assigned_to || "unassigned");
            setDueDate(
                task.due_date
                    ? new Date(task.due_date + "T00:00:00")
                    : undefined
            );
        }
    }, [task]);

    useEffect(() => {
        if (open && task) fetchActivity();
    }, [open, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-save ───────────────────────────────────────────────────────

    const saveField = useCallback(
        async (field: string, value: unknown) => {
            if (!task) return;
            const result = await updateTask(task.id, { [field]: value });
            if (result.error) {
                toast.error("Failed to save", { description: result.error });
            } else {
                router.refresh();
            }
        },
        [task, router]
    );

    const handleStatusChange = (val: string) => {
        setStatus(val);
        saveField("status", val);
    };

    const handlePriorityChange = (val: string) => {
        setPriority(val as "low" | "medium" | "high");
        saveField("priority", val);
    };

    const handleAssigneeChange = (val: string) => {
        setAssignee(val);
        saveField("assigned_to", val === "unassigned" ? null : val);
    };

    const handleDueDateChange = (date: Date | undefined) => {
        setDueDate(date);
        saveField("due_date", date ? format(date, "yyyy-MM-dd") : null);
    };

    const handleTitleBlur = () => {
        if (!task || title.trim() === task.title) return;
        if (!title.trim()) {
            setTitle(task.title);
            return;
        }
        saveField("title", title.trim());
    };

    const handleDescriptionBlur = () => {
        if (!task || description.trim() === (task.description || "")) return;
        saveField("description", description.trim() || undefined);
    };

    // ── Delete ──────────────────────────────────────────────────────────

    const handleDelete = async () => {
        if (!task) return;
        setIsDeleting(true);
        const result = await deleteTask(task.id);
        setIsDeleting(false);
        setShowDeleteDialog(false);

        if (result.success) {
            toast.success("Task deleted.");
            onOpenChange(false);
            router.refresh();
        } else {
            toast.error(result.error || "Failed to delete task");
        }
    };

    // ── Comment ─────────────────────────────────────────────────────────

    const handleSendComment = async () => {
        if (!task || !newComment.trim()) return;
        setSending(true);
        const result = await addTaskComment(task.id, newComment);
        setSending(false);

        if (result.error) {
            toast.error("Failed to send comment");
        } else {
            setNewComment("");
            fetchActivity();
        }
    };

    // ── Render ───────────────────────────────────────────────────────────

    return (
        <>
            <DetailsPanel
                open={open}
                onOpenChange={onOpenChange}
                onDelete={() => setShowDeleteDialog(true)}
            >
                {/* Title + Description */}
                <DetailsPanelSection>
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        placeholder="Task title"
                        className="border-0 bg-transparent shadow-none px-0 h-auto text-[15px] font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
                    />
                    <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleDescriptionBlur}
                        placeholder="Add a description..."
                        rows={2}
                        className="border-0 bg-transparent shadow-none px-0 resize-none text-drawer-meta text-muted-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 min-h-0"
                    />
                </DetailsPanelSection>

                <Separator />

                {/* Attributes */}
                <DetailsPanelSection title="Attributes">
                    <DetailsPanelField label="Status">
                        <Select
                            value={status}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className={inlineSelectTrigger}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {STATUS_OPTIONS.map((opt) => {
                                    const IconComponent = opt.icon;
                                    return (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className={selectItemClass}
                                        >
                                            <div className="flex items-center gap-2">
                                                <IconComponent className="h-3 w-3" />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </DetailsPanelField>

                    <DetailsPanelField label="Priority">
                        <Select
                            value={priority}
                            onValueChange={handlePriorityChange}
                        >
                            <SelectTrigger className={inlineSelectTrigger}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                {PRIORITY_OPTIONS.map((opt) => {
                                    const IconComponent = opt.icon;
                                    return (
                                        <SelectItem
                                            key={opt.value}
                                            value={opt.value}
                                            className={selectItemClass}
                                        >
                                            <div className="flex items-center gap-2">
                                                <IconComponent className="h-3 w-3" />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </DetailsPanelField>

                    <DetailsPanelField label="Assignee">
                        <Select
                            value={assignee}
                            onValueChange={handleAssigneeChange}
                        >
                            <SelectTrigger className={inlineSelectTrigger}>
                                <SelectValue placeholder="Unassigned" />
                            </SelectTrigger>
                            <SelectContent className={selectContentClass}>
                                <SelectItem
                                    value="unassigned"
                                    className={selectItemClass}
                                >
                                    <div className="flex items-center gap-2">
                                        <UserCircle className="h-3 w-3" />
                                        Unassigned
                                    </div>
                                </SelectItem>
                                {profiles.map((p) => (
                                    <SelectItem
                                        key={p.id}
                                        value={p.id}
                                        className={selectItemClass}
                                    >
                                        <div className="flex items-center gap-2">
                                            <UserCircle className="h-3 w-3" />
                                            {p.full_name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </DetailsPanelField>

                    <DetailsPanelField label="Due date">
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={cn(
                                        "inline-flex items-center gap-1.5 h-7 rounded-md px-1.5 text-drawer-value font-medium hover:bg-muted/50 transition-colors",
                                        !dueDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="h-3 w-3" />
                                    {dueDate
                                        ? format(dueDate, "MMM d, yyyy")
                                        : "Set date"}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto p-0"
                                align="start"
                            >
                                <Calendar
                                    mode="single"
                                    selected={dueDate}
                                    onSelect={handleDueDateChange}
                                />
                            </PopoverContent>
                        </Popover>
                    </DetailsPanelField>

                    {task && (
                        <DetailsPanelField label="Created">
                            <span className="text-drawer-meta text-muted-foreground">
                                {format(
                                    new Date(task.created_at),
                                    "MMM d, yyyy"
                                )}
                            </span>
                        </DetailsPanelField>
                    )}
                </DetailsPanelSection>

                <Separator />


                {/* Activity */}
                <DetailsPanelSection title="Activity">
                    {activityLoading && (
                        <div className="flex justify-center py-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    <div className="space-y-3">
                        {timeline.length > 0
                            ? timeline.map((item) => (
                                  <div
                                      key={item.id}
                                      className="flex gap-2 text-sm"
                                  >
                                      <div className="mt-0.5 shrink-0">
                                          {item.type === "comment" ? (
                                              <MessageSquare className="w-3 h-3 text-foreground/45" />
                                          ) : (
                                              <ActivityIcon className="w-3 h-3 text-foreground/35" />
                                          )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex justify-between items-baseline gap-2 mb-0.5">
                                              <span className="text-[12px] font-medium text-foreground/70 truncate">
                                                  {item.user?.full_name ||
                                                      "System"}
                                              </span>
                                              <span className="text-[11px] text-muted-foreground shrink-0">
                                                  {format(
                                                      new Date(
                                                          item.created_at
                                                      ),
                                                      "MMM d, h:mm a"
                                                  )}
                                              </span>
                                          </div>
                                          {item.type === "comment" ? (
                                              <p className="text-[12.5px] text-foreground/80 leading-relaxed">
                                                  {item.content}
                                              </p>
                                          ) : item.activity_type ===
                                            "status_change" ? (
                                              <p className="text-[12px] text-muted-foreground italic">
                                                  {STATUS_LABELS[
                                                      item.details?.from || ""
                                                  ] || item.details?.from}
                                                  {" \u2192 "}
                                                  {STATUS_LABELS[
                                                      item.details?.to || ""
                                                  ] || item.details?.to}
                                              </p>
                                          ) : (
                                              <p className="text-[12px] text-muted-foreground italic">
                                                  Updated task
                                              </p>
                                          )}
                                      </div>
                                  </div>
                              ))
                            : !activityLoading && (
                                  <p className="text-[12px] text-muted-foreground text-center py-1">
                                      No activity yet.
                                  </p>
                              )}
                    </div>

                    {/* Comment input */}
                    <div className="flex items-end gap-2 pt-1">
                        <Textarea
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="flex-1 resize-none border-0 bg-muted/30 shadow-none text-[13px] placeholder:text-muted-foreground/40 focus-visible:ring-0 min-h-0 rounded-lg px-2.5 py-2"
                            rows={1}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={handleSendComment}
                            disabled={sending || !newComment.trim()}
                        >
                            {sending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Send className="w-3.5 h-3.5" />
                            )}
                        </Button>
                    </div>
                </DetailsPanelSection>

            </DetailsPanel>

            <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;
                            {task?.title}&quot;? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
