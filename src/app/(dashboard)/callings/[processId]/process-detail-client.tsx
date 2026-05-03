"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileText,
    ListPlus,
    MoreHorizontal,
    Send,
    Users,
    X,
} from "lucide-react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import {
    setProcessStageStatus,
    dropProcess,
    addCallingComment,
    createCallingTask,
    createCallingBusinessItem,
    getWorkspaceAssignees,
} from "@/lib/actions/calling-actions";
import {
    getAllStages,
    getStageInfo,
    countCompletedStages,
    firstPendingStage,
} from "@/lib/calling-utils";
import type { CallingProcessStage, CallingStageStatus } from "@/types/database";

const ALL_STAGES = getAllStages();

interface ProcessData {
    id: string;
    current_stage: CallingProcessStage;
    status: "active" | "completed" | "dropped" | "declined";
    stage_statuses: Record<CallingProcessStage, CallingStageStatus>;
    dropped_reason: string | null;
    created_at: string;
    updated_at: string;
    candidate: { id: string; name: string } | null;
    calling: { id: string; title: string; organization: string | null } | null;
}

interface HistoryEntry {
    id: string;
    action: string;
    from_value: string | null;
    to_value: string | null;
    notes: string | null;
    created_at: string;
    created_by_user?: { full_name: string | null } | null;
}

interface CommentEntry {
    id: string;
    content: string;
    created_at: string;
    created_by_user?: { full_name: string | null } | null;
}

interface TaskEntry {
    id: string;
    title: string;
    status: string;
    due_date: string | null;
    workspace_task_id: number | null;
    assignee?: { full_name: string | null } | null;
}

interface Assignee {
    id: string;
    full_name: string | null;
    email: string;
    role: string;
}

type TaskPriority = "low" | "medium" | "high";

interface ProcessDetailClientProps {
    process: ProcessData;
    initialHistory: HistoryEntry[];
    initialComments: CommentEntry[];
    initialTasks: TaskEntry[];
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function timeAgo(date: string) {
    const diff = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
}

function formatTime(date: string) {
    return new Date(date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}


export function ProcessDetailClient({
    process,
    initialHistory,
    initialComments,
    initialTasks,
}: ProcessDetailClientProps) {
    const router = useRouter();
    const [commentText, setCommentText] = useState("");
    const [isMutating, setIsMutating] = useState(false);
    const [showDropDialog, setShowDropDialog] = useState(false);
    const [dropReason, setDropReason] = useState("");
    const [showDeclineDialog, setShowDeclineDialog] = useState(false);
    const [declineReason, setDeclineReason] = useState("");
    const [declineStage, setDeclineStage] = useState<CallingProcessStage | null>(null);

    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [taskStage, setTaskStage] = useState<CallingProcessStage | null>(null);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskAssignee, setTaskAssignee] = useState<string>("");
    const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
    const [taskDueDate, setTaskDueDate] = useState("");
    const [assignees, setAssignees] = useState<Assignee[]>([]);
    const [assigneesLoaded, setAssigneesLoaded] = useState(false);

    const [showBusinessDialog, setShowBusinessDialog] = useState(false);
    const [businessNotes, setBusinessNotes] = useState("");

    const candidateName = process.candidate?.name || "Unknown member";
    const callingTitle = process.calling?.title || "Unknown calling";
    const organization = process.calling?.organization || "";
    const isDropped = process.status === "dropped";
    const isComplete = process.status === "completed";
    const isDeclined = process.status === "declined";
    const stageStatuses = process.stage_statuses;
    const completedCount = countCompletedStages(stageStatuses);
    const nextPendingStage = firstPendingStage(stageStatuses);
    // Index where the drop indicator goes: first pending stage when dropped,
    // otherwise off the end.
    const droppedAtIndex = isDropped && nextPendingStage
        ? ALL_STAGES.indexOf(nextPendingStage)
        : -1;

    // Merge history + comments chronologically for the activity log.
    const activity = useMemo(() => {
        const historyItems = initialHistory.map((h) => ({
            kind: "history" as const,
            id: `h-${h.id}`,
            createdAt: h.created_at,
            actorName: h.created_by_user?.full_name || "Someone",
            action: h.action,
            fromValue: h.from_value,
            toValue: h.to_value,
            notes: h.notes,
        }));
        const commentItems = initialComments.map((c) => ({
            kind: "comment" as const,
            id: `c-${c.id}`,
            createdAt: c.created_at,
            actorName: c.created_by_user?.full_name || "Someone",
            content: c.content,
        }));
        return [...historyItems, ...commentItems].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [initialHistory, initialComments]);

    const handleToggleStage = async (
        stage: CallingProcessStage,
        status: CallingStageStatus,
        opts?: { reason?: string }
    ) => {
        const label = getStageInfo(stage).label;
        const loadingMsg =
            status === "complete"
                ? `Marking ${label} complete…`
                : status === "declined"
                    ? `Marking ${label} declined…`
                    : `Marking ${label} undone…`;
        const successMsg =
            status === "complete"
                ? `${label} marked complete`
                : status === "declined"
                    ? `${label} marked declined`
                    : `${label} marked undone`;
        const errorLabel =
            status === "complete"
                ? "Unable to mark stage complete"
                : status === "declined"
                    ? "Unable to mark stage declined"
                    : "Unable to mark stage undone";

        setIsMutating(true);
        const toastId = toast.loading(loadingMsg);
        const result = await setProcessStageStatus(process.id, stage, status, opts);
        setIsMutating(false);
        if (result.error) {
            toast.error(errorLabel, { description: result.error, id: toastId });
            return;
        }
        toast.success(successMsg, { id: toastId });
        router.refresh();
    };

    const openDeclineDialog = (stage: CallingProcessStage) => {
        setDeclineStage(stage);
        setDeclineReason("");
        setShowDeclineDialog(true);
    };

    const loadAssignees = async () => {
        if (assigneesLoaded) return;
        const result = await getWorkspaceAssignees();
        if (result.success) {
            setAssignees(result.assignees);
            setAssigneesLoaded(true);
        }
    };

    const getStageTaskTemplate = (stage: CallingProcessStage) => {
        switch (stage) {
            case "extended":
                return {
                    title: `Interview ${candidateName} and extend the calling of ${callingTitle}`,
                    description: `The bishopric has approved ${candidateName} for the calling of ${callingTitle}${organization ? ` (${organization})` : ""}. Please schedule a time to interview ${candidateName} and extend the calling.`,
                };
            default: {
                const label = getStageInfo(stage).label;
                return {
                    title: `${label}: ${candidateName} → ${callingTitle}`,
                    description: getStageInfo(stage).description,
                };
            }
        }
    };

    const openTaskDialog = (stage: CallingProcessStage) => {
        const template = getStageTaskTemplate(stage);
        setTaskStage(stage);
        setTaskTitle(template.title);
        setTaskDescription(template.description);
        setTaskAssignee("");
        setTaskPriority("medium");
        setTaskDueDate("");
        setShowTaskDialog(true);
        void loadAssignees();
    };

    const openBusinessDialog = () => {
        setBusinessNotes(
            `Sustaining for ${candidateName} as ${callingTitle}${organization ? ` (${organization})` : ""}.`
        );
        setShowBusinessDialog(true);
    };

    const handleConfirmCreateBusinessItem = async () => {
        setShowBusinessDialog(false);
        setIsMutating(true);
        const toastId = toast.loading(`Creating sustaining item for ${candidateName}…`);
        const result = await createCallingBusinessItem(process.id, {
            category: "sustaining",
            notes: businessNotes.trim() || undefined,
        });
        setIsMutating(false);
        if (result.error) {
            toast.error("Unable to create business item", { description: result.error, id: toastId });
            return;
        }
        toast.success("Sustaining item added to sacrament meeting business", { id: toastId });
        router.refresh();
    };

    const handleConfirmCreateTask = async () => {
        if (!taskStage || !taskTitle.trim()) return;
        const title = taskTitle.trim();
        setShowTaskDialog(false);
        setIsMutating(true);
        const toastId = toast.loading(`Creating task "${title}"…`);
        const result = await createCallingTask(process.id, {
            title,
            description: taskDescription.trim() || undefined,
            assigned_to: taskAssignee || undefined,
            due_date: taskDueDate || undefined,
            priority: taskPriority,
        });
        setIsMutating(false);
        if (result.error) {
            toast.error("Unable to create task", { description: result.error, id: toastId });
            return;
        }
        toast.success(`Task created`, { id: toastId });
        router.refresh();
    };

    const handleConfirmDecline = async () => {
        if (!declineStage) return;
        const stage = declineStage;
        const reason = declineReason.trim() || undefined;
        setShowDeclineDialog(false);
        setDeclineStage(null);
        setDeclineReason("");
        await handleToggleStage(stage, "declined", { reason });
    };

    const handleDrop = async () => {
        const reason = dropReason.trim() || undefined;
        setShowDropDialog(false);
        setDropReason("");
        setIsMutating(true);
        const toastId = toast.loading("Dropping process…");
        const result = await dropProcess(process.id, reason);
        setIsMutating(false);
        if (result.error) {
            toast.error("Unable to drop process", { description: result.error, id: toastId });
            return;
        }
        toast.success("Process dropped", { id: toastId });
        router.refresh();
    };

    const handleAddComment = async () => {
        const content = commentText.trim();
        if (!content) return;
        setCommentText("");
        setIsMutating(true);
        const toastId = toast.loading("Logging note…");
        const result = await addCallingComment(process.id, content);
        setIsMutating(false);
        if (result.error) {
            toast.error("Unable to log note", { description: result.error, id: toastId });
            setCommentText(content);
            return;
        }
        toast.success("Note added", { id: toastId });
        router.refresh();
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <Breadcrumbs
                items={[
                    { label: "Callings", icon: <Users className="h-3.5 w-3.5" />, href: "/callings" },
                    { label: "Pipeline", href: "/callings?tab=pipeline" },
                    { label: candidateName },
                ]}
                className="bg-transparent ring-0 border-b border-border/60 rounded-none px-4 py-1.5"
            />

            <div className="px-8 lg:px-12 py-8 max-w-[1400px] mx-auto w-full">
                <div className="mb-6">
                    <Link
                        href="/callings"
                        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Back to Callings
                    </Link>
                </div>

                {/* Header */}
                <header className="bg-surface-raised border border-border rounded-2xl px-7 py-7">
                    <div className="flex items-start gap-5">
                        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-surface-sunken text-[16px] font-semibold text-muted-foreground">
                            {getInitials(candidateName)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                {isDropped ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                        Dropped
                                    </span>
                                ) : isDeclined ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 border border-destructive/30 px-2 py-0.5 text-[11px] font-medium text-destructive">
                                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                        Declined
                                    </span>
                                ) : isComplete ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        Recorded in LCR
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/30 px-2 py-0.5 text-[11px] font-medium text-brand">
                                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                                        In progress
                                    </span>
                                )}
                                <span className="text-[11.5px] text-muted-foreground">
                                    Started {timeAgo(process.created_at)}
                                </span>
                            </div>
                            <div className="flex items-baseline gap-3 flex-wrap">
                                <h1 className="font-serif text-[34px] leading-[1.05] tracking-tight">{candidateName}</h1>
                                <ArrowRight className="h-5 w-5 text-muted-foreground" />
                                <span className="font-serif italic text-[26px] text-foreground">{callingTitle}</span>
                            </div>
                            {organization && (
                                <div className="text-[12.5px] text-muted-foreground mt-2">{organization}</div>
                            )}
                        </div>

                        <div className="shrink-0 text-right">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Progress
                            </div>
                            <div className="font-serif text-3xl mt-1">
                                {completedCount}
                                <span className="text-muted-foreground text-xl">/{ALL_STAGES.length}</span>
                            </div>
                            <div className="flex items-center gap-0.5 mt-2 justify-end">
                                {ALL_STAGES.map((stage, idx) => {
                                    const done = stageStatuses[stage] === "complete";
                                    const declined = stageStatuses[stage] === "declined";
                                    const droppedHere = isDropped && idx === droppedAtIndex;
                                    return (
                                        <span
                                            key={stage}
                                            className={`h-1 w-6 rounded-full ${
                                                done
                                                    ? "bg-brand"
                                                    : declined || droppedHere
                                                        ? "bg-destructive"
                                                        : "bg-border"
                                            }`}
                                            title={getStageInfo(stage).label}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {(isDropped || isDeclined) && process.dropped_reason && (
                        <div className="mt-5 pt-5 border-t border-border">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-destructive/80 mb-1.5">
                                {isDeclined ? "Decline reason" : "Drop reason"}
                            </div>
                            <p className="text-[13px] italic leading-relaxed">&ldquo;{process.dropped_reason}&rdquo;</p>
                        </div>
                    )}
                </header>

                {/* Body: stages + activity */}
                <div className="mt-8 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8 lg:gap-10">
                    <section>
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="font-serif text-xl">Path</h2>
                            {!isComplete && !isDropped && !isDeclined && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm" className="h-8 text-[12px] text-muted-foreground hover:text-foreground">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-popover border-border">
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => setShowDropDialog(true)}
                                        >
                                            <X className="h-3.5 w-3.5 mr-2" /> Drop process
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                        <p className="text-[11.5px] text-muted-foreground mb-4 -mt-2">
                            Stages can be marked complete in any order, and you can undo a stage at any time.
                        </p>
                        <ol className="space-y-2.5">
                            {ALL_STAGES.map((stage, idx) => {
                                const info = getStageInfo(stage);
                                const stageStatus = stageStatuses[stage];
                                const isDone = stageStatus === "complete";
                                const isStageDeclined = stageStatus === "declined";
                                const isNext = !isDropped && !isDeclined && stage === nextPendingStage;
                                const isOutOfOrder = !isDone && !isStageDeclined && !isNext && !isDropped && !isDeclined;
                                const isDroppedHere = isDropped && idx === droppedAtIndex;
                                const isAcceptedDecision = isNext && stage === "accepted";

                                return (
                                    <li
                                        key={stage}
                                        className={`rounded-xl border transition-all duration-200 ${
                                            isDone
                                                ? "border-border bg-surface-raised/40"
                                                : isStageDeclined || isDroppedHere
                                                    ? "border-destructive/30 bg-destructive/5"
                                                    : isNext
                                                        ? "border-brand/40 bg-brand/[0.04]"
                                                        : "border-border bg-surface-raised/30"
                                        }`}
                                    >
                                        <div className="flex items-start gap-4 px-5 py-4">
                                            <div className="shrink-0 pt-0.5">
                                                <div
                                                    className={`h-7 w-7 rounded-full border flex items-center justify-center text-[11px] font-medium font-mono ${
                                                        isDone
                                                            ? "bg-brand border-brand text-white"
                                                            : isStageDeclined || isDroppedHere
                                                                ? "bg-destructive border-destructive text-destructive-foreground"
                                                                : isNext
                                                                    ? "border-brand text-brand"
                                                                    : "border-border text-muted-foreground"
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <Check className="h-3.5 w-3.5" />
                                                    ) : isStageDeclined || isDroppedHere ? (
                                                        <X className="h-3.5 w-3.5" />
                                                    ) : (
                                                        String(idx + 1).padStart(2, "0")
                                                    )}
                                                </div>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="text-[14px] font-medium">{info.label}</h4>
                                                    {isNext && !isAcceptedDecision && (
                                                        <span className="text-[10px] uppercase tracking-wider text-brand">
                                                            Suggested next
                                                        </span>
                                                    )}
                                                    {isStageDeclined && (
                                                        <span className="text-[10px] uppercase tracking-wider text-destructive">
                                                            Declined
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                                                    {info.description}
                                                </p>
                                            </div>

                                            {isAcceptedDecision && (
                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px] text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                                                        onClick={() => openDeclineDialog(stage)}
                                                    >
                                                        Declined
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px] bg-brand text-white hover:bg-brand/90"
                                                        onClick={() => handleToggleStage(stage, "complete")}
                                                    >
                                                        Accepted
                                                    </Button>
                                                </div>
                                            )}
                                            {isNext && !isAcceptedDecision && (
                                                <div className="shrink-0 flex items-center gap-1.5">
                                                    {stage === "extended" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isMutating}
                                                            className="h-8 text-[12px]"
                                                            onClick={() => openTaskDialog(stage)}
                                                        >
                                                            <ListPlus className="h-3.5 w-3.5 mr-1.5" />
                                                            Create task
                                                        </Button>
                                                    )}
                                                    {stage === "sustained" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            disabled={isMutating}
                                                            className="h-8 text-[12px]"
                                                            onClick={openBusinessDialog}
                                                        >
                                                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                                                            Create business item
                                                        </Button>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px] bg-brand text-white hover:bg-brand/90"
                                                        onClick={() => handleToggleStage(stage, "complete")}
                                                    >
                                                        Mark complete
                                                    </Button>
                                                </div>
                                            )}
                                            {isOutOfOrder && (
                                                <div className="shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px]"
                                                        onClick={() => handleToggleStage(stage, "complete")}
                                                    >
                                                        Mark complete
                                                    </Button>
                                                </div>
                                            )}
                                            {isDone && !isDropped && (
                                                <div className="shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleToggleStage(stage, "pending")}
                                                    >
                                                        Mark undone
                                                    </Button>
                                                </div>
                                            )}
                                            {isStageDeclined && !isDropped && (
                                                <div className="shrink-0">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        disabled={isMutating}
                                                        className="h-8 text-[12px] text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleToggleStage(stage, "pending")}
                                                    >
                                                        Mark undone
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                    </section>

                    <aside className="space-y-6 lg:sticky lg:top-6 self-start">
                        <div>
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
                                Tasks
                            </div>
                            {initialTasks.length === 0 ? (
                                <p className="text-[12px] text-muted-foreground italic">
                                    No tasks yet. Delegate a next step from the stage list.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {initialTasks.map((task) => {
                                        const isDone = task.status === "completed";
                                        return (
                                            <li
                                                key={task.id}
                                                className="bg-surface-raised border border-border rounded-lg px-3 py-2.5"
                                            >
                                                <div className={`text-[12.5px] ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                    {task.title}
                                                </div>
                                                <div className="text-[10.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                                                    <span className="capitalize">{task.status.replace(/_/g, " ")}</span>
                                                    {task.assignee?.full_name && (
                                                        <>
                                                            <span>·</span>
                                                            <span>{task.assignee.full_name}</span>
                                                        </>
                                                    )}
                                                    {task.due_date && (
                                                        <>
                                                            <span>·</span>
                                                            <span>due {new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>

                        <div>
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground mb-3">
                                Activity
                            </div>

                            {!isComplete && !isDropped && !isDeclined && (
                                <div className="bg-surface-raised border border-border rounded-xl p-3 mb-4">
                                    <Textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Log a note or impression…"
                                        className="bg-transparent border-0 focus-visible:ring-0 px-2 text-[12.5px] min-h-[44px] resize-none"
                                    />
                                    <div className="flex justify-end mt-1">
                                        <Button
                                            size="sm"
                                            disabled={!commentText.trim() || isMutating}
                                            className="h-7 text-[12px] bg-brand text-white hover:bg-brand/90"
                                            onClick={handleAddComment}
                                        >
                                            <Send className="h-3 w-3 mr-1.5" /> Log
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {activity.length === 0 ? (
                                <p className="text-[12px] text-muted-foreground italic">
                                    No activity yet. Advance a stage or log a note.
                                </p>
                            ) : (
                                <div className="max-h-[500px] overflow-y-auto pr-2">
                                    <ol className="relative space-y-4 pl-5 before:content-[''] before:absolute before:left-1.5 before:top-1 before:bottom-1 before:w-px before:bg-border">
                                        {activity.map((item) => (
                                            <li key={item.id} className="relative">
                                                <span className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-brand" />
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-[12.5px]">
                                                        <span className="font-medium">{item.actorName}</span>{" "}
                                                        <span className="text-muted-foreground">
                                                            {item.kind === "history"
                                                                ? describeHistory(item.action, item.fromValue, item.toValue)
                                                                : "logged a note"}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className="text-[11px] text-muted-foreground font-mono ml-auto"
                                                        title={new Date(item.createdAt).toString()}
                                                    >
                                                        {timeAgo(item.createdAt)} · {formatTime(item.createdAt)}
                                                    </span>
                                                </div>
                                                {item.kind === "comment" && (
                                                    <p className="text-[12.5px] text-muted-foreground italic mt-1 border-l-2 border-border pl-3 leading-relaxed whitespace-pre-wrap">
                                                        {item.content}
                                                    </p>
                                                )}
                                                {item.kind === "history" && item.notes && (
                                                    <p className="text-[12.5px] text-muted-foreground italic mt-1 border-l-2 border-border pl-3 leading-relaxed whitespace-pre-wrap">
                                                        {item.notes}
                                                    </p>
                                                )}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    </aside>
                </div>
            </div>

            <Dialog open={showBusinessDialog} onOpenChange={setShowBusinessDialog}>
                <DialogContent className="bg-popover border-border sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Add to sacrament meeting business</DialogTitle>
                        <DialogDescription>
                            Create a sustaining item for the next sacrament meeting. It will appear in the
                            Business section ready for the clerk to add to the conducting script.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Category
                            </div>
                            <Input value="Sustaining" disabled className="text-[13px] h-9" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Person
                            </div>
                            <Input value={candidateName} disabled className="text-[13px] h-9" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Calling
                            </div>
                            <Input value={callingTitle} disabled className="text-[13px] h-9" />
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Notes
                            </div>
                            <Textarea
                                value={businessNotes}
                                onChange={(e) => setBusinessNotes(e.target.value)}
                                className="min-h-[80px] text-[13px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowBusinessDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isMutating}
                            className="bg-brand text-white hover:bg-brand/90"
                            onClick={handleConfirmCreateBusinessItem}
                        >
                            Create business item
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="bg-popover border-border sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Delegate this stage</DialogTitle>
                        <DialogDescription>
                            {taskStage === "extended"
                                ? `Assign a counselor (or yourself) to interview ${candidateName} and extend the calling.`
                                : "Create a task for this stage."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Title
                            </div>
                            <Input
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="text-[13px]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Description
                            </div>
                            <Textarea
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                className="min-h-[80px] text-[13px]"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                    Assign to
                                </div>
                                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                                    <SelectTrigger className="text-[13px] h-9">
                                        <SelectValue placeholder={assigneesLoaded ? "Unassigned" : "Loading…"} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border">
                                        {assignees.map((a) => (
                                            <SelectItem key={a.id} value={a.id} className="text-[13px]">
                                                {a.full_name || a.email}
                                                <span className="ml-1.5 text-muted-foreground capitalize">· {a.role}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                    Priority
                                </div>
                                <Select
                                    value={taskPriority}
                                    onValueChange={(v) => setTaskPriority(v as TaskPriority)}
                                >
                                    <SelectTrigger className="text-[13px] h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-popover border-border">
                                        <SelectItem value="low" className="text-[13px]">Low</SelectItem>
                                        <SelectItem value="medium" className="text-[13px]">Medium</SelectItem>
                                        <SelectItem value="high" className="text-[13px]">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                                Due date (optional)
                            </div>
                            <Input
                                type="date"
                                value={taskDueDate}
                                onChange={(e) => setTaskDueDate(e.target.value)}
                                className="text-[13px] h-9 w-[180px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowTaskDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isMutating || !taskTitle.trim()}
                            className="bg-brand text-white hover:bg-brand/90"
                            onClick={handleConfirmCreateTask}
                        >
                            Create task
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
                <DialogContent className="bg-popover border-border">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Mark the calling declined?</DialogTitle>
                        <DialogDescription>
                            The candidate didn&apos;t accept. The process will be closed and every remaining stage marked declined. You can leave a short note so others understand what happened.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            Reason (optional)
                        </div>
                        <Textarea
                            value={declineReason}
                            onChange={(e) => setDeclineReason(e.target.value)}
                            placeholder="Family circumstances, not the right season, asked to be considered later…"
                            className="min-h-[80px] text-[13px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDeclineDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isMutating}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={handleConfirmDecline}
                        >
                            Mark declined
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showDropDialog} onOpenChange={setShowDropDialog}>
                <DialogContent className="bg-popover border-border">
                    <DialogHeader>
                        <DialogTitle className="font-serif text-2xl">Drop this process?</DialogTitle>
                        <DialogDescription>
                            The pipeline will be archived as dropped. You can leave a brief reason so others understand what happened.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                            Reason (optional)
                        </div>
                        <Textarea
                            value={dropReason}
                            onChange={(e) => setDropReason(e.target.value)}
                            placeholder="Declined, changed circumstances, not the right season…"
                            className="min-h-[80px] text-[13px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowDropDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={isMutating}
                            className="bg-destructive text-white hover:bg-destructive/90"
                            onClick={handleDrop}
                        >
                            Drop process
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function describeHistory(action: string, from: string | null, to: string | null): string {
    switch (action) {
        case "process_started":
            return "started the process";
        case "stage_changed": {
            const toLabel = to ? getStageInfo(to as CallingProcessStage)?.label || to : "next stage";
            return `advanced to ${toLabel.toLowerCase()}`;
        }
        case "status_changed":
            return `marked status ${to || ""}`.trim();
        case "comment_added":
            return "logged a note";
        case "task_created":
            return "created a task";
        default:
            if (from || to) {
                return `${action.replace(/_/g, " ")} ${from ?? ""}${from && to ? " → " : ""}${to ?? ""}`.trim();
            }
            return action.replace(/_/g, " ");
    }
}
