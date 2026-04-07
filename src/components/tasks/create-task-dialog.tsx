"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ModalForm,
    ModalFormBody,
    ModalFormFooter,
    ModalFormSection,
} from "@/components/ui/modal-form-layout";
import { CalendarIcon, Loader2, Plus, UserCircle, Flag, Check, CircleDashed, CircleCheck, ChevronDown, ChevronUp, ChevronsUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { createTask } from "@/lib/actions/task-actions";
import { toast } from "@/lib/toast";
import { createClient } from "@/lib/supabase/client";

interface CreateTaskDialogProps {
    children?: React.ReactNode;
    context?: {
        meeting_id?: string;
        agenda_item_id?: string;
        discussion_id?: string;
        business_item_id?: string;
    };
    onTaskCreated?: () => void;
}

export function CreateTaskDialog({ children, context, onTaskCreated }: CreateTaskDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [profiles, setProfiles] = useState<{ id: string; full_name: string }[]>([]);

    // Form State
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignee, setAssignee] = useState<string>("");
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [status, setStatus] = useState<string>("pending");

    const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
    const [assigneeSearch, setAssigneeSearch] = useState("");

    // Load available profiles (members) for assignment
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

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title) return;

        setLoading(true);
        const result = await createTask({
            title,
            description,
            assigned_to: assignee || undefined,
            due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
            priority,
            status,
            ...context
        });

        setLoading(false);

        if (result.error) {
            toast.error("Error creating task", { description: result.error });
        } else {
            toast.success("Task created", { description: assignee ? "Email notification sent to assignee." : "Task added to list." });
            setOpen(false);
            // Reset form
            setTitle("");
            setDescription("");
            setAssignee("");
            setDueDate(undefined);
            setPriority('medium');
            setStatus('pending');
            setAssigneeSearch("");
            if (onTaskCreated) onTaskCreated();
        }
    };

    const filteredProfiles = useMemo(() => {
        if (!assigneeSearch) return profiles;
        return profiles.filter(p => p.full_name.toLowerCase().includes(assigneeSearch.toLowerCase()));
    }, [profiles, assigneeSearch]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        New Task
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl overflow-hidden p-0 gap-0">
                <DialogHeader className="px-5 py-5 pb-0">
                    <DialogTitle className="text-xl">Create New Task</DialogTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                        Add a new task and assign it to a team member.
                    </p>
                </DialogHeader>

                <ModalForm onSubmit={handleSubmit} className="flex-1 overflow-hidden">
                    <ModalFormBody className="p-0">
                        <ModalFormSection className="px-5 pt-4 pb-2 space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className="text-sm font-medium">Title*</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Set up microphones"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="h-10 border-border/60 shadow-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="description" className="text-sm font-medium">Details</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Task details..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="border-border/60 shadow-sm min-h-[100px] resize-none"
                                />
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2">
                                {/* Status Pill (Select) */}
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger
                                        className={cn(
                                            "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors [&>svg]:hidden",
                                            status !== 'pending'
                                                ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                                                : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                                        )}
                                    >
                                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                                            {status === 'pending' ? (
                                                <CircleDashed className="h-2.5 w-2.5 shrink-0" />
                                            ) : status === 'completed' ? (
                                                <CircleCheck className="h-2.5 w-2.5 shrink-0" />
                                            ) : (
                                                <CircleDashed className="h-2.5 w-2.5 shrink-0" />
                                            )}
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">
                                            <div className="flex items-center gap-2">
                                                <CircleDashed className="h-3 w-3" />
                                                Pending
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="completed">
                                            <div className="flex items-center gap-2">
                                                <CircleCheck className="h-3 w-3" />
                                                Completed
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Assignee Pill (Popover) */}
                                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                                                assignee
                                                    ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                                                    : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                                            )}
                                        >
                                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                                                {assignee ? (
                                                    <Check className="h-2.5 w-2.5 shrink-0" />
                                                ) : (
                                                    <UserCircle className="h-2.5 w-2.5 shrink-0" />
                                                )}
                                                {assignee ? profiles.find(p => p.id === assignee)?.full_name : "Assignee"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-1" align="start">
                                        <div className="px-2 pb-1.5 pt-1">
                                            <Input
                                                placeholder="Search members..."
                                                value={assigneeSearch}
                                                onChange={(e) => setAssigneeSearch(e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>
                                        <div style={{ maxHeight: 200, overflowY: "auto" }}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAssignee("");
                                                    setAssigneePopoverOpen(false);
                                                    setAssigneeSearch("");
                                                }}
                                                className={cn(
                                                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                                                    !assignee
                                                        ? "bg-accent text-accent-foreground font-medium"
                                                        : "text-foreground hover:bg-accent/50"
                                                )}
                                            >
                                                <span className="inline-flex h-4 w-4 items-center justify-center">
                                                    {!assignee && <Check className="h-3 w-3" />}
                                                </span>
                                                Unassigned
                                            </button>
                                            {filteredProfiles.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setAssignee(p.id);
                                                        setAssigneePopoverOpen(false);
                                                        setAssigneeSearch("");
                                                    }}
                                                    className={cn(
                                                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                                                        assignee === p.id
                                                            ? "bg-accent text-accent-foreground font-medium"
                                                            : "text-foreground hover:bg-accent/50"
                                                    )}
                                                >
                                                    <span className="inline-flex h-4 w-4 items-center justify-center">
                                                        {assignee === p.id && <Check className="h-3 w-3" />}
                                                    </span>
                                                    {p.full_name}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {/* Priority Pill (Select) */}
                                <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'medium' | 'high')}>
                                    <SelectTrigger
                                        className={cn(
                                            "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors [&>svg]:hidden",
                                            priority !== 'medium'
                                                ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                                                : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                                        )}
                                    >
                                        <div className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                                            {priority === 'low' ? (
                                                <ChevronDown className="h-3 w-3 shrink-0" />
                                            ) : priority === 'medium' ? (
                                                <ChevronUp className="h-3 w-3 shrink-0" />
                                            ) : (
                                                <ChevronsUp className="h-3 w-3 shrink-0" />
                                            )}
                                            {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">
                                            <div className="flex items-center gap-2">
                                                <ChevronDown className="h-3 w-3" />
                                                Low
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="medium">
                                            <div className="flex items-center gap-2">
                                                <ChevronUp className="h-3 w-3" />
                                                Medium
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="high">
                                            <div className="flex items-center gap-2">
                                                <ChevronsUp className="h-3 w-3" />
                                                High
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>

                                {/* Due Date Pill (Popover + Calendar) */}
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "h-7 w-auto rounded-full px-2.5 text-[11px] font-medium shadow-sm transition-colors",
                                                dueDate
                                                    ? "border-transparent bg-[hsl(var(--chip-active-bg))] text-[hsl(var(--chip-active-text))]"
                                                    : "border-[hsl(var(--chip-border))] bg-background text-[hsl(var(--chip-text))] hover:bg-[hsl(var(--chip-hover-bg))]"
                                            )}
                                        >
                                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap leading-none">
                                                {dueDate ? <Check className="h-2.5 w-2.5 shrink-0" /> : <CalendarIcon className="h-2.5 w-2.5 shrink-0" />}
                                                {dueDate ? format(dueDate, "MMM d, yyyy") : "Due date"}
                                            </span>
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </ModalFormSection>
                    </ModalFormBody>
                    <ModalFormFooter className="bg-transparent border-t-0 px-5 pt-0 pb-5 h-auto relative bg-none backdrop-blur-none">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="px-4 hover:bg-transparent font-medium hover:text-foreground/80">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!title || loading} className="rounded-full px-5">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Task
                        </Button>
                    </ModalFormFooter>
                </ModalForm>
            </DialogContent>
        </Dialog>
    );
}

