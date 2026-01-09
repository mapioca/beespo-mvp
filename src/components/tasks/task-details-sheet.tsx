"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Loader2, Send, MessageSquare, Activity as ActivityIcon, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { addTaskComment, getTaskActivity, updateTask } from "@/lib/actions/task-actions";
import { useToast } from "@/lib/hooks/use-toast";
import { Database } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type TaskWithDetails = Database['public']['Tables']['tasks']['Row'] & {
    assignee?: { full_name: string } | null;
    assignee_id?: string; // fallback
};

interface TaskDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskWithDetails | null;
}

interface TimelineItem {
    id: string;
    created_at: string;
    type: 'comment' | 'activity';
    content?: string;
    user?: { full_name: string } | null;
    details?: { from?: string; to?: string; snippet?: string };
}

export function TaskDetailsSheet({ open, onOpenChange, task }: TaskDetailsSheetProps) {
    const [newComment, setNewComment] = useState("");
    const [sending, setSending] = useState(false);
    const [activityLoading, setActivityLoading] = useState(false);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

    // Editing state
    const [editTitle, setEditTitle] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editAssignee, setEditAssignee] = useState<string | null>(null);
    const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
    const [editStatus, setEditStatus] = useState<string>("");

    const [isSaving, setIsSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    const { toast } = useToast();

    // Load available profiles
    useEffect(() => {
        if (open) {
            const fetchProfiles = async () => {
                const supabase = createClient();
                const { data } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .order('full_name');
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
            ...(comments || []).map(c => ({ ...(c as Record<string, unknown>), type: 'comment' as const } as unknown as TimelineItem)),
            ...(activities || []).map(a => ({ ...(a as Record<string, unknown>), type: 'activity' as const } as unknown as TimelineItem))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setTimeline(combined);
        setActivityLoading(false);
    }, [task]);

    const handleChange = (field: 'title' | 'description' | 'assignee' | 'date' | 'status', value: string | Date | null | undefined) => {
        if (field === 'title') setEditTitle(value as string);
        if (field === 'description') setEditDescription(value as string);
        if (field === 'assignee') setEditAssignee(value === "unassigned" ? null : value as string);
        if (field === 'date') setEditDueDate(value as Date);
        if (field === 'status') setEditStatus(value as string);
        setIsDirty(true);
    };

    useEffect(() => {
        if (open && task) {
            setEditTitle(task.title);
            setEditDescription(task.description || "");
            setEditAssignee(task.assigned_to || "unassigned");
            setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
            setEditStatus(task.status === 'in_progress' ? 'pending' : task.status);
            setIsDirty(false);
            fetchActivity();
        }
    }, [open, task, fetchActivity]);

    const handleDiscard = () => {
        if (!task) return;
        setEditTitle(task.title);
        setEditDescription(task.description || "");
        setEditAssignee(task.assigned_to || "unassigned");
        setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
        setEditStatus(task.status);
        setIsDirty(false);
    };

    const handleSaveChanges = async () => {
        if (!task) return;
        setIsSaving(true);
        const result = await updateTask(task.id, {
            title: editTitle,
            description: editDescription,
            assigned_to: editAssignee === "unassigned" ? null : editAssignee,
            due_date: editDueDate ? format(editDueDate, 'yyyy-MM-dd') : null,
            status: editStatus
        });
        setIsSaving(false);

        if (result.error) {
            toast({ title: "Failed to update task", description: result.error, variant: "destructive" });
        } else {
            toast({ title: "Task updated" });
            setIsDirty(false);
        }
    };

    const handleSendComment = async () => {
        if (!task || !newComment.trim()) return;
        setSending(true);
        const result = await addTaskComment(task.id, newComment);
        setSending(false);

        if (result.error) {
            toast({ title: "Failed to send comment", variant: "destructive" });
        } else {
            setNewComment("");
            toast({ title: "Comment added" });
            fetchActivity();
        }
    };

    if (!task) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[400px] sm:w-[540px] flex flex-col h-full">
                <SheetHeader className="mb-4 space-y-4">
                    <SheetTitle className="sr-only">Task Details</SheetTitle>
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 space-y-2">
                            <Input
                                value={editTitle}
                                onChange={(e) => handleChange('title', e.target.value)}
                                className="font-semibold text-lg border-transparent hover:border-input focus:border-input px-2 -ml-2 h-auto py-1"
                            />
                        </div>
                        <Select
                            value={editStatus}
                            onValueChange={(val) => handleChange('status', val)}
                        >
                            <SelectTrigger className="h-7 w-auto border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:ring-0 px-2">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pending">Todo</SelectItem>
                                <SelectItem value="completed">Done</SelectItem>
                                <SelectItem value="cancelled">Canceled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative">
                        <Textarea
                            value={editDescription}
                            onChange={(e) => handleChange('description', e.target.value)}
                            placeholder="Add a description..."
                            className="resize-none min-h-[60px] text-sm text-muted-foreground border-transparent hover:border-input focus:border-input px-2 -ml-2 py-1"
                        />
                        {isDirty && (
                            <div className="absolute right-0 -bottom-10 shadow-lg flex gap-2 z-10">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleDiscard}
                                    disabled={isSaving}
                                >
                                    <X className="w-4 h-4 mr-2" />
                                    Discard
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveChanges}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                                    Save
                                </Button>
                            </div>
                        )}
                    </div>
                </SheetHeader>

                <div className="space-y-6 flex-1 overflow-y-auto pr-2 mt-8">
                    {/* Meta Data */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-muted/30 p-2 rounded space-y-2">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Assignee</span>
                            <Select
                                value={editAssignee || "unassigned"}
                                onValueChange={(val) => handleChange('assignee', val)}
                            >
                                <SelectTrigger className="h-8 w-full border-transparent bg-transparent hover:bg-background hover:border-input focus:bg-background focus:ring-0 px-2 -ml-2">
                                    <SelectValue placeholder="Unassigned" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {profiles.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="bg-muted/30 p-2 rounded space-y-2">
                            <span className="text-muted-foreground block text-xs uppercase tracking-wider">Due Date</span>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"ghost"}
                                        className={cn(
                                            "h-8 w-full justify-start text-left font-normal border-transparent hover:bg-background hover:border-input px-2 -ml-2",
                                            !editDueDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-3 w-3" />
                                        {editDueDate ? format(editDueDate, "MMM d, yyyy") : <span>Set Date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={editDueDate}
                                        onSelect={(date) => handleChange('date', date)}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-semibold flex items-center gap-2">
                                <ActivityIcon className="w-4 h-4" /> Activity & Comments
                            </h4>
                            {activityLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                        </div>

                        <div className="space-y-4">
                            {timeline.length > 0 ? (
                                timeline.map((item) => (
                                    <div key={item.id} className="flex gap-3 text-sm">
                                        <div className="mt-1">
                                            {item.type === 'comment' ? (
                                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                            ) : (
                                                <ActivityIcon className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold text-xs text-foreground/80">
                                                    {item.user?.full_name || "System"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {format(new Date(item.created_at), "MMM d, h:mm a")}
                                                </span>
                                            </div>

                                            {item.type === 'comment' ? (
                                                <div className="bg-blue-50/50 p-3 rounded-lg text-foreground/90">
                                                    {item.content}
                                                </div>
                                            ) : (
                                                <div className="text-muted-foreground text-xs italic">
                                                    Changed status from <strong>{item.details?.from}</strong> to <strong>{item.details?.to}</strong>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-muted-foreground opacity-50 text-sm border border-dashed rounded-lg">
                                    No activity yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <SheetFooter className="mt-4 pt-4 border-t">
                    <div className="w-full space-y-2">
                        <Textarea
                            placeholder="Type a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="min-h-[80px]"
                        />
                        <div className="flex justify-end">
                            <Button size="sm" onClick={handleSendComment} disabled={sending || !newComment.trim()}>
                                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Post Comment
                            </Button>
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
