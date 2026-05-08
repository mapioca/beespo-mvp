"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    Sheet,
    SheetContent,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
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
    CheckSquare,
    Trash2,
    Send,
    MessageSquare,
    Activity as ActivityIcon,
    Loader2,
    Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
    addTaskComment,
    getTaskActivity,
    updateTask,
    deleteTask,
} from "@/lib/actions/task-actions";
import { Database } from "@/types/database";
import { cn } from "@/lib/utils";

type TaskWithDetails = Database["public"]["Tables"]["tasks"]["Row"] & {
    assignee?: { full_name: string } | null;
    workspace_task_id?: string | null;
    priority?: "low" | "medium" | "high";
    labels?: Array<{ id: string; name: string; color: string }>;
};

const statusLabels = {
    pending: "Todo",
    in_progress: "In Progress",
    completed: "Done",
    cancelled: "Canceled",
};

interface TaskDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskWithDetails | null;
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

export function TaskDetailsSheet({
    open,
    onOpenChange,
    task,
}: TaskDetailsSheetProps) {
    const router = useRouter();
    const sectionHeaderClass =
        "text-drawer-section font-semibold tracking-[0.02em] text-foreground/60";
    const propertyLabelClass =
        "text-drawer-label font-medium leading-none text-muted-foreground";
    const propertyValueClass =
        "text-drawer-value font-medium leading-none tracking-normal";
    const inputClass =
        "h-8 bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30";
    const selectTriggerClass =
        "h-8 bg-control border-control focus:ring-0 focus:border-foreground/30";
    const selectContentClass =
        "rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg";
    const selectItemClass =
        "rounded-md px-2.5 py-1.5 text-drawer-menu-item font-medium leading-none tracking-normal focus:bg-[hsl(var(--menu-hover))] focus:text-[hsl(var(--menu-text))]";

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("pending");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [assignee, setAssignee] = useState("unassigned");
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

    // UI state
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Activity state
    const [newComment, setNewComment] = useState("");
    const [sending, setSending] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);

    // Profiles for assignee dropdown
    const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

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
                    ({ ...(c as Record<string, unknown>), type: "comment" as const } as unknown as TimelineItem)
            ),
            ...(activities || [])
                .filter(a => a.activity_type !== 'comment')
                .map(
                    (a) =>
                        ({ ...(a as Record<string, unknown>), type: "activity" as const } as unknown as TimelineItem)
                ),
        ].sort(
            (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setTimeline(combined);
        setActivityLoading(false);
    }, [task]);

    useEffect(() => {
        if (task) {
            setTitle(task.title);
            setDescription(task.description || "");
            setStatus(
                ["pending", "in_progress"].includes(task.status)
                    ? "pending"
                    : task.status
            );
            setPriority(task.priority ?? "medium");
            setAssignee(task.assigned_to || "unassigned");
            setDueDate(task.due_date ? new Date(task.due_date + "T00:00:00") : undefined);
        }
    }, [task]);

    useEffect(() => {
        if (open && task) {
            fetchActivity();
        }
    }, [open, task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSave = async () => {
        if (!task || !title.trim()) return;
        setIsSaving(true);
        const result = await updateTask(task.id, {
            title: title.trim(),
            description: description.trim() || undefined,
            status,
            priority,
            assigned_to: assignee === "unassigned" ? null : assignee,
            due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        });
        setIsSaving(false);

        if (result.error) {
            toast.error("Failed to update task", { description: result.error });
        } else {
            toast.success("Task updated.");
            router.refresh();
        }
    };

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

    const handleSendComment = async () => {
        if (!task || !newComment.trim()) return;
        setSending(true);
        const result = await addTaskComment(task.id, newComment);
        setSending(false);

        if (result.error) {
            toast.error("Failed to send comment");
        } else {
            setNewComment("");
            toast.success("Comment added");
            fetchActivity();
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-sm flex flex-col gap-0 p-0 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 pr-12 shrink-0">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                            <SheetTitle className="text-drawer-title font-semibold">Task Details</SheetTitle>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setShowDeleteDialog(true)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <SheetDescription className="sr-only">
                        Task details for {task?.title}
                    </SheetDescription>

                    <Separator />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto">
                        {/* TASK section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>
                                Task
                            </p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className={`${inputClass} ${propertyValueClass} placeholder:text-[length:var(--drawer-text-value)] placeholder:font-normal`}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    className={`resize-none bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass} placeholder:text-[length:var(--drawer-text-value)] placeholder:font-normal`}
                                    rows={3}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className={sectionHeaderClass}>
                                Details
                            </p>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className={`${selectTriggerClass} ${propertyValueClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="pending" className={selectItemClass}>Todo</SelectItem>
                                        <SelectItem value="completed" className={selectItemClass}>Done</SelectItem>
                                        <SelectItem value="cancelled" className={selectItemClass}>Canceled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Priority</label>
                                <Select value={priority} onValueChange={(val) => setPriority(val as "low" | "medium" | "high")}>
                                    <SelectTrigger className={`${selectTriggerClass} ${propertyValueClass}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="low" className={selectItemClass}>Low</SelectItem>
                                        <SelectItem value="medium" className={selectItemClass}>Medium</SelectItem>
                                        <SelectItem value="high" className={selectItemClass}>High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Assignee</label>
                                <Select value={assignee} onValueChange={setAssignee}>
                                    <SelectTrigger className={`${selectTriggerClass} ${propertyValueClass}`}>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent className={selectContentClass}>
                                        <SelectItem value="unassigned" className={selectItemClass}>Unassigned</SelectItem>
                                        {profiles.map((p) => (
                                            <SelectItem key={p.id} value={p.id} className={selectItemClass}>
                                                {p.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className={propertyLabelClass}>Due Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                `w-full h-8 justify-start bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass}`,
                                                !dueDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-3 w-3" />
                                            {dueDate
                                                ? format(dueDate, "MMM d, yyyy")
                                                : "Set date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            {task && (
                                <div className="flex items-start justify-between gap-4">
                                    <span className="text-drawer-meta text-muted-foreground shrink-0">
                                        Created at
                                    </span>
                                    <span className="text-drawer-meta text-right">
                                        {format(
                                            new Date(task.created_at),
                                            "MMM d, yyyy 'at' h:mm a"
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* ACTIVITY section */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className={sectionHeaderClass}>
                                    Activity
                                </p>
                                {activityLoading && (
                                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="space-y-3">
                                {timeline.length > 0 ? (
                                    timeline.map((item) => (
                                        <div key={item.id} className="flex gap-2 text-sm">
                                            <div className="mt-0.5 shrink-0">
                                                {item.type === "comment" ? (
                                                    <MessageSquare className="w-3.5 h-3.5 text-foreground/55" />
                                                ) : (
                                                    <ActivityIcon className="w-3.5 h-3.5 text-foreground/45" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1 gap-2">
                                                    <span className="text-drawer-meta font-medium text-foreground/80 truncate">
                                                        {item.user?.full_name || "System"}
                                                    </span>
                                                    <span className="text-drawer-label text-muted-foreground shrink-0">
                                                        {format(
                                                            new Date(item.created_at),
                                                            "MMM d, h:mm a"
                                                        )}
                                                    </span>
                                                </div>
                                                {item.type === "comment" ? (
                                                    <div className="rounded-xl border border-border/70 bg-muted/20 p-2 text-drawer-meta text-foreground/90">
                                                        {item.content}
                                                    </div>
                                                ) : item.activity_type === "status_change" ? (
                                                    <div className="text-drawer-meta text-muted-foreground italic">
                                                        Changed status from{" "}
                                                        <strong>{statusLabels[item.details?.from as keyof typeof statusLabels] || item.details?.from}</strong> to{" "}
                                                        <strong>{statusLabels[item.details?.to as keyof typeof statusLabels] || item.details?.to}</strong>
                                                    </div>
                                                ) : (
                                                    <div className="text-drawer-meta text-muted-foreground italic">
                                                        Updated task details
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    !activityLoading && (
                                        <p className="text-drawer-meta text-muted-foreground text-center py-2">
                                            No activity yet.
                                        </p>
                                    )
                                )}
                            </div>

                            {/* Comment input */}
                            <div className="space-y-2 pt-1">
                                <Textarea
                                    placeholder="Add a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className={`resize-none bg-control border-control focus-visible:ring-0 focus-visible:border-foreground/30 ${propertyValueClass} placeholder:text-[length:var(--drawer-text-value)] placeholder:font-normal`}
                                    rows={2}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full h-8 border-border/60 text-[12px] font-medium hover:bg-control-hover"
                                    onClick={handleSendComment}
                                    disabled={sending || !newComment.trim()}
                                >
                                    {sending ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <Send className="w-3 h-3 mr-1" />
                                    )}
                                    Post Comment
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <Separator />
                    <div className="px-5 py-4 shrink-0">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !title.trim()}
                            className="w-full h-9 rounded-full text-[12px] font-semibold"
                        >
                            {isSaving ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete &quot;{task?.title}&quot;? This
                            action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
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
