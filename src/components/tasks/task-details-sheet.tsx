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
import { LinkedNotesList } from "@/components/notes/linked-notes-list";

type TaskWithDetails = Database["public"]["Tables"]["tasks"]["Row"] & {
    assignee?: { full_name: string } | null;
    workspace_task_id?: string | null;
    priority?: "low" | "medium" | "high";
    labels?: Array<{ id: string; name: string; color: string }>;
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
            ...(activities || []).map(
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
            setDueDate(task.due_date ? new Date(task.due_date) : undefined);
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
                            <SheetTitle className="text-sm font-semibold">Task Details</SheetTitle>
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
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Task
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Title</label>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-8 text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Description</label>
                                <Textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Add a description..."
                                    className="text-sm resize-none"
                                    rows={3}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* DETAILS section */}
                        <div className="px-5 py-4 space-y-4">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                                Details
                            </p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Status</label>
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Todo</SelectItem>
                                        <SelectItem value="completed">Done</SelectItem>
                                        <SelectItem value="cancelled">Canceled</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Priority</label>
                                <Select value={priority} onValueChange={(val) => setPriority(val as "low" | "medium" | "high")}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Assignee</label>
                                <Select value={assignee} onValueChange={setAssignee}>
                                    <SelectTrigger className="h-8 text-sm">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {profiles.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium">Due Date</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={cn(
                                                "w-full h-8 justify-start text-sm font-normal",
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
                                    <span className="text-xs text-muted-foreground shrink-0">
                                        Created at
                                    </span>
                                    <span className="text-xs text-right">
                                        {format(
                                            new Date(task.created_at),
                                            "MMM d, yyyy 'at' h:mm a"
                                        )}
                                    </span>
                                </div>
                            )}
                        </div>

                        <Separator />

                        {/* LINKED NOTES section */}
                        {task && (
                            <div className="px-5 py-4">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                                    Linked Notes
                                </p>
                                <LinkedNotesList
                                    entityId={task.id}
                                    entityType="task"
                                    className="border-none shadow-none p-0"
                                />
                            </div>
                        )}

                        <Separator />

                        {/* ACTIVITY section */}
                        <div className="px-5 py-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                                                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                                ) : (
                                                    <ActivityIcon className="w-3.5 h-3.5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline mb-1 gap-2">
                                                    <span className="font-medium text-xs text-foreground/80 truncate">
                                                        {item.user?.full_name || "System"}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground shrink-0">
                                                        {format(
                                                            new Date(item.created_at),
                                                            "MMM d, h:mm a"
                                                        )}
                                                    </span>
                                                </div>
                                                {item.type === "comment" ? (
                                                    <div className="bg-blue-50/50 p-2 rounded text-xs text-foreground/90">
                                                        {item.content}
                                                    </div>
                                                ) : (
                                                    <div className="text-muted-foreground text-xs italic">
                                                        Changed status from{" "}
                                                        <strong>{item.details?.from}</strong> to{" "}
                                                        <strong>{item.details?.to}</strong>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    !activityLoading && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
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
                                    className="text-sm resize-none"
                                    rows={2}
                                />
                                <Button
                                    size="sm"
                                    className="w-full h-7 text-xs"
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
                            className="w-full h-8 text-xs"
                        >
                            {isSaving ? "Saving..." : "Save Changes"}
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
