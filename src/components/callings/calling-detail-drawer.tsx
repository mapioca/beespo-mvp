"use client";

import * as React from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import { CallingProcessStepper } from "./calling-process-stepper";
import { CandidateAutocomplete } from "./candidate-autocomplete";
import {
    Building2,
    UserCheck,
    Clock,
    MessageSquare,
    History,
    Plus,
    Send,
    CheckCircle2,
    XCircle,
    ChevronRight,
    AlertTriangle,
    Loader2,
    User,
    Users,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
    getCalling,
    getProcessTimeline,
    advanceProcessStage,
    dropProcess,
    addCallingComment,
    startCallingProcess,
    addCandidateToCalling,
    createCallingTask,
} from "@/lib/actions/calling-actions";
import { getAllStages } from "@/lib/calling-utils";
import type {
    CallingProcessStage,
    CallingProcessStatus,
    CallingCandidateStatus,
    CallingHistoryAction,
} from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────

interface CallingDetailDrawerProps {
    callingId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    teamMembers?: { id: string; full_name: string }[];
}

interface TimelineItem {
    id: string;
    type: "history" | "comment" | "task";
    created_at: string;
    action?: CallingHistoryAction;
    from_value?: string | null;
    to_value?: string | null;
    notes?: string | null;
    content?: string;
    title?: string;
    status?: string;
    workspace_task_id?: string | null;
    created_by_user?: { full_name: string } | null;
    assignee?: { full_name: string } | null;
}

interface Candidate {
    id: string;
    status: CallingCandidateStatus;
    notes: string | null;
    created_at: string;
    candidate: { id: string; name: string } | null;
}

interface Process {
    id: string;
    current_stage: CallingProcessStage;
    status: CallingProcessStatus;
    dropped_reason: string | null;
    created_at: string;
    candidate: { id: string; name: string } | null;
}

interface CallingData {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    filled_by_name: { id: string; name: string } | null;
    candidates: Candidate[];
    processes: Process[];
}

// ─── Constants ──────────────────────────────────────────────────

const stageLabels: Record<CallingProcessStage, string> = {
    defined: "Defined",
    approved: "Approved",
    extended: "Extended",
    accepted: "Accepted",
    sustained: "Sustained",
    set_apart: "Set Apart",
    recorded_lcr: "Recorded in LCR",
};

const actionLabels: Record<CallingHistoryAction, string> = {
    process_started: "Process started",
    stage_changed: "Stage advanced",
    status_changed: "Status changed",
    comment_added: "Comment added",
    task_created: "Task created",
    task_completed: "Task completed",
};

// ─── Component ──────────────────────────────────────────────────

export function CallingDetailDrawer({
    callingId,
    open,
    onOpenChange,
    onUpdate,
    teamMembers = [],
}: CallingDetailDrawerProps) {
    const [calling, setCalling] = React.useState<CallingData | null>(null);
    const [timeline, setTimeline] = React.useState<TimelineItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [comment, setComment] = React.useState("");
    const [showCommentInput, setShowCommentInput] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [showAdvanceDialog, setShowAdvanceDialog] = React.useState(false);
    const [showDropDialog, setShowDropDialog] = React.useState(false);
    const [showAddCandidateDialog, setShowAddCandidateDialog] = React.useState(false);
    const [showCreateTaskDialog, setShowCreateTaskDialog] = React.useState(false);
    const [showLCRConfirmDialog, setShowLCRConfirmDialog] = React.useState(false);
    const [dropReason, setDropReason] = React.useState("");
    const [selectedCandidate, setSelectedCandidate] = React.useState<{
        id: string;
        name: string;
    } | null>(null);
    const [candidateNotes, setCandidateNotes] = React.useState("");
    const [taskTitle, setTaskTitle] = React.useState("");
    const [taskDescription, setTaskDescription] = React.useState("");
    const [taskAssignee, setTaskAssignee] = React.useState<string>("");
    const [taskDueDate, setTaskDueDate] = React.useState("");

    const activeProcess = calling?.processes.find((p) => p.status === "active");
    const stages = getAllStages();
    const nextStage = activeProcess
        ? stages[stages.indexOf(activeProcess.current_stage) + 1]
        : undefined;
    const isCompleted = activeProcess?.current_stage === "recorded_lcr";

    // ─── Data Loading ───────────────────────────────────────────

    const loadData = React.useCallback(async () => {
        if (!callingId) return;

        setLoading(true);
        const callingResult = await getCalling(callingId);

        if (callingResult.success && callingResult.calling) {
            setCalling(callingResult.calling);

            const freshActiveProcess = callingResult.calling.processes.find(
                (p: Process) => p.status === "active"
            );

            if (freshActiveProcess) {
                const timelineResult = await getProcessTimeline(freshActiveProcess.id);
                if (timelineResult.success && timelineResult.timeline) {
                    setTimeline(timelineResult.timeline);
                }
            } else {
                setTimeline([]);
            }
        }
        setLoading(false);
    }, [callingId]);

    React.useEffect(() => {
        if (open && callingId) {
            loadData();
        }
    }, [open, callingId, loadData]);

    // ─── Handlers ───────────────────────────────────────────────

    const handleAdvanceStage = async () => {
        if (!activeProcess) return;

        const allStages = getAllStages();
        const currentIndex = allStages.indexOf(activeProcess.current_stage);
        const next = allStages[currentIndex + 1];

        if (!next) return;

        if (next === "recorded_lcr") {
            setShowAdvanceDialog(false);
            setShowLCRConfirmDialog(true);
            return;
        }

        setSubmitting(true);
        const result = await advanceProcessStage(activeProcess.id, next);
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
        setShowAdvanceDialog(false);
    };

    const handleLCRConfirm = async () => {
        if (!activeProcess) return;

        setSubmitting(true);
        const result = await advanceProcessStage(activeProcess.id, "recorded_lcr");
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
        setShowLCRConfirmDialog(false);
    };

    const handleDropProcess = async () => {
        if (!activeProcess) return;

        setSubmitting(true);
        const result = await dropProcess(activeProcess.id, dropReason || undefined);
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
        setShowDropDialog(false);
        setDropReason("");
    };

    const handleAddComment = async () => {
        if (!activeProcess || !comment.trim()) return;

        setSubmitting(true);
        const result = await addCallingComment(activeProcess.id, comment.trim());
        setSubmitting(false);

        if (result.success) {
            setComment("");
            setShowCommentInput(false);
            await loadData();
        }
    };

    const handleAddCandidate = async () => {
        if (!calling || !selectedCandidate) return;

        setSubmitting(true);
        const result = await addCandidateToCalling(
            calling.id,
            selectedCandidate.id,
            candidateNotes || undefined
        );
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
        setShowAddCandidateDialog(false);
        setSelectedCandidate(null);
        setCandidateNotes("");
    };

    const handleStartProcess = async (
        candidateNameId: string,
        callingCandidateId?: string
    ) => {
        if (!calling) return;

        setSubmitting(true);
        const result = await startCallingProcess(
            calling.id,
            candidateNameId,
            callingCandidateId
        );
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
    };

    const handleCreateTask = async () => {
        if (!activeProcess || !taskTitle.trim()) return;

        setSubmitting(true);
        const result = await createCallingTask(activeProcess.id, {
            title: taskTitle.trim(),
            description: taskDescription || undefined,
            assigned_to: taskAssignee || undefined,
            due_date: taskDueDate || undefined,
            priority: "medium",
        });
        setSubmitting(false);

        if (result.success) {
            await loadData();
            onUpdate?.();
        }
        setShowCreateTaskDialog(false);
        setTaskTitle("");
        setTaskDescription("");
        setTaskAssignee("");
        setTaskDueDate("");
    };

    const existingCandidateIds =
        (calling?.candidates
            .map((c) => c.candidate?.id)
            .filter(Boolean) as string[]) || [];

    // Separate active candidate (selected / has a process) from backlog
    const activeCandidateEntry = calling?.candidates.find(
        (c) =>
            c.status === "selected" ||
            (activeProcess && c.candidate?.id === activeProcess.candidate?.id)
    );

    const backlogCandidates =
        calling?.candidates.filter(
            (c) => c.id !== activeCandidateEntry?.id && c.status !== "archived"
        ) || [];

    // ─── Render ─────────────────────────────────────────────────

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent
                    side="right"
                    className="w-full sm:max-w-[480px] p-0 flex flex-col"
                >
                    {loading && !calling ? (
                        <>
                            <SheetHeader className="sr-only">
                                <SheetTitle>Loading Calling Details</SheetTitle>
                                <SheetDescription>Loading...</SheetDescription>
                            </SheetHeader>
                            <div className="flex items-center justify-center flex-1">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        </>
                    ) : calling ? (
                        <>
                            {/* ── STICKY HEADER ───────────────────── */}
                            <div className="flex-shrink-0 border-b px-6 pt-6 pb-4">
                                <SheetHeader className="space-y-1">
                                    <SheetTitle className="text-lg font-semibold flex items-center gap-2 pr-8">
                                        {calling.title}
                                        {calling.is_filled && (
                                            <Badge
                                                variant="secondary"
                                                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            >
                                                <UserCheck className="w-3 h-3 mr-1" />
                                                Filled
                                            </Badge>
                                        )}
                                    </SheetTitle>
                                    {calling.organization && (
                                        <SheetDescription className="flex items-center gap-1.5 text-sm">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {calling.organization}
                                        </SheetDescription>
                                    )}
                                    {!calling.organization && (
                                        <SheetDescription className="sr-only">
                                            Calling details
                                        </SheetDescription>
                                    )}
                                </SheetHeader>

                                {/* Filled callout */}
                                {calling.is_filled &&
                                    calling.filled_by_name &&
                                    !activeProcess && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 py-2">
                                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                                            <span>
                                                Filled by{" "}
                                                <strong>
                                                    {calling.filled_by_name.name}
                                                </strong>
                                            </span>
                                        </div>
                                    )}
                            </div>

                            {/* ── HERO STEPPER (fixture) ──────────── */}
                            {activeProcess && (
                                <div className="flex-shrink-0 border-b px-6 py-4 bg-muted/30">
                                    <div className="flex items-center gap-2 mb-3">
                                        <User className="w-4 h-4 text-primary" />
                                        <span className="text-sm font-medium">
                                            {activeProcess.candidate?.name}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-[11px] px-1.5 py-0"
                                        >
                                            {stageLabels[activeProcess.current_stage]}
                                        </Badge>
                                    </div>
                                    <CallingProcessStepper
                                        currentStage={activeProcess.current_stage}
                                        status={activeProcess.status}
                                        compact
                                    />
                                </div>
                            )}

                            {/* ── TWO-TAB BODY ────────────────────── */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <Tabs
                                    defaultValue="candidates"
                                    className="flex-1 flex flex-col"
                                >
                                    <div className="flex-shrink-0 px-6 pt-3">
                                        <TabsList className="grid w-full grid-cols-2">
                                            <TabsTrigger
                                                value="candidates"
                                                className="flex items-center gap-1.5 text-sm"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                Candidates
                                            </TabsTrigger>
                                            <TabsTrigger
                                                value="history"
                                                className="flex items-center gap-1.5 text-sm"
                                            >
                                                <History className="w-3.5 h-3.5" />
                                                History
                                            </TabsTrigger>
                                        </TabsList>
                                    </div>

                                    {/* ── Candidates Tab ─────────── */}
                                    <TabsContent
                                        value="candidates"
                                        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 m-0"
                                    >
                                        {/* Active Candidate — Hero Card */}
                                        {activeCandidateEntry &&
                                            activeCandidateEntry.candidate && (
                                                <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <User className="w-4 h-4 text-primary" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-sm">
                                                                    {
                                                                        activeCandidateEntry
                                                                            .candidate
                                                                            .name
                                                                    }
                                                                </p>
                                                                {activeCandidateEntry.notes && (
                                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                                        {
                                                                            activeCandidateEntry.notes
                                                                        }
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <Badge className="bg-primary/10 text-primary border-0 text-[11px]">
                                                            Active
                                                        </Badge>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Backlog / Brainstorming Section */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                                    Brainstorming
                                                </h4>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-7 text-xs"
                                                    onClick={() =>
                                                        setShowAddCandidateDialog(true)
                                                    }
                                                    disabled={calling.is_filled}
                                                >
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Add Name
                                                </Button>
                                            </div>

                                            {backlogCandidates.length === 0 &&
                                                !activeCandidateEntry ? (
                                                <div className="text-center py-8 text-muted-foreground">
                                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    <p className="text-sm">
                                                        No candidates yet
                                                    </p>
                                                    <p className="text-xs mt-1 text-muted-foreground/70">
                                                        Add names to brainstorm
                                                        potential people
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1.5">
                                                    {backlogCandidates.map(
                                                        (candidate) => (
                                                            <div
                                                                key={candidate.id}
                                                                className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-accent/30 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm truncate">
                                                                            {
                                                                                candidate
                                                                                    .candidate
                                                                                    ?.name
                                                                            }
                                                                        </p>
                                                                        {candidate.notes && (
                                                                            <p className="text-xs text-muted-foreground truncate">
                                                                                {
                                                                                    candidate.notes
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="capitalize text-[11px] px-1.5"
                                                                    >
                                                                        {
                                                                            candidate.status
                                                                        }
                                                                    </Badge>
                                                                    {candidate.status !==
                                                                        "selected" &&
                                                                        !calling.is_filled &&
                                                                        !activeProcess &&
                                                                        candidate.candidate && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                className="h-7 text-xs px-2"
                                                                                onClick={() =>
                                                                                    handleStartProcess(
                                                                                        candidate
                                                                                            .candidate!
                                                                                            .id,
                                                                                        candidate.id
                                                                                    )
                                                                                }
                                                                                disabled={
                                                                                    submitting
                                                                                }
                                                                            >
                                                                                <ChevronRight className="w-3.5 h-3.5 mr-0.5" />
                                                                                Start
                                                                            </Button>
                                                                        )}
                                                                </div>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>

                                    {/* ── History Tab ─────────────── */}
                                    <TabsContent
                                        value="history"
                                        className="flex-1 overflow-y-auto px-6 py-4 space-y-3 m-0"
                                    >
                                        {activeProcess ? (
                                            <>
                                                {timeline.length === 0 ? (
                                                    <div className="text-center py-8 text-muted-foreground">
                                                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                        <p className="text-sm">
                                                            No activity yet
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {timeline.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex gap-3 p-3 rounded-lg text-sm",
                                                                    item.type ===
                                                                    "comment" &&
                                                                    "bg-blue-50/50 dark:bg-blue-950/20",
                                                                    item.type ===
                                                                    "task" &&
                                                                    "bg-purple-50/50 dark:bg-purple-950/20",
                                                                    item.type ===
                                                                    "history" &&
                                                                    "bg-muted/30"
                                                                )}
                                                            >
                                                                <div className="shrink-0 mt-0.5">
                                                                    {item.type ===
                                                                        "comment" && (
                                                                            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                                                        )}
                                                                    {item.type ===
                                                                        "task" && (
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                                                                        )}
                                                                    {item.type ===
                                                                        "history" && (
                                                                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                                        )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    {item.type ===
                                                                        "history" && (
                                                                            <p>
                                                                                <span className="font-medium">
                                                                                    {item.action &&
                                                                                        actionLabels[
                                                                                        item
                                                                                            .action
                                                                                        ]}
                                                                                </span>
                                                                                {item.from_value &&
                                                                                    item.to_value && (
                                                                                        <span className="text-muted-foreground">
                                                                                            :{" "}
                                                                                            {stageLabels[
                                                                                                item.from_value as CallingProcessStage
                                                                                            ] ||
                                                                                                item.from_value}
                                                                                            {
                                                                                                " → "
                                                                                            }
                                                                                            {stageLabels[
                                                                                                item.to_value as CallingProcessStage
                                                                                            ] ||
                                                                                                item.to_value}
                                                                                        </span>
                                                                                    )}
                                                                            </p>
                                                                        )}
                                                                    {item.type ===
                                                                        "comment" && (
                                                                            <p>
                                                                                {
                                                                                    item.content
                                                                                }
                                                                            </p>
                                                                        )}
                                                                    {item.type ===
                                                                        "task" && (
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium">
                                                                                    {
                                                                                        item.title
                                                                                    }
                                                                                </span>
                                                                                <Badge
                                                                                    variant={
                                                                                        item.status ===
                                                                                            "completed"
                                                                                            ? "secondary"
                                                                                            : "outline"
                                                                                    }
                                                                                    className="text-[10px]"
                                                                                >
                                                                                    {
                                                                                        item.status
                                                                                    }
                                                                                </Badge>
                                                                            </div>
                                                                        )}
                                                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                                        {item
                                                                            .created_by_user
                                                                            ?.full_name && (
                                                                                <span>
                                                                                    {
                                                                                        item
                                                                                            .created_by_user
                                                                                            .full_name
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                        <span>
                                                                            {format(
                                                                                new Date(
                                                                                    item.created_at
                                                                                ),
                                                                                "MMM d, h:mm a"
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Inline comment input */}
                                                {showCommentInput && (
                                                    <div className="flex gap-2 pt-3 border-t">
                                                        <Textarea
                                                            placeholder="Add a comment..."
                                                            value={comment}
                                                            onChange={(e) =>
                                                                setComment(
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="min-h-[72px] text-sm"
                                                            autoFocus
                                                        />
                                                        <div className="flex flex-col gap-1">
                                                            <Button
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={
                                                                    handleAddComment
                                                                }
                                                                disabled={
                                                                    !comment.trim() ||
                                                                    submitting
                                                                }
                                                            >
                                                                <Send className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8"
                                                                onClick={() => {
                                                                    setShowCommentInput(
                                                                        false
                                                                    );
                                                                    setComment("");
                                                                }}
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                <p className="text-sm">
                                                    Select a candidate and start a process
                                                    to see history
                                                </p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>

                            {/* ── STICKY ACTION FOOTER ─────────────── */}
                            {activeProcess && !isCompleted && (
                                <div className="flex-shrink-0 border-t bg-background px-6 py-3">
                                    <div className="flex items-center gap-2">
                                        {/* Primary: Advance */}
                                        <Button
                                            className="flex-1"
                                            onClick={() =>
                                                setShowAdvanceDialog(true)
                                            }
                                            disabled={submitting}
                                        >
                                            <ChevronRight className="w-4 h-4 mr-1.5" />
                                            {nextStage
                                                ? `Advance to ${stageLabels[nextStage]}`
                                                : "Advance"}
                                        </Button>

                                        {/* Secondary: Log Note */}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9"
                                            onClick={() =>
                                                setShowCommentInput(
                                                    !showCommentInput
                                                )
                                            }
                                        >
                                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                                            Note
                                        </Button>

                                        {/* Destructive: Drop */}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() =>
                                                setShowDropDialog(true)
                                            }
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Completed state footer */}
                            {activeProcess && isCompleted && (
                                <div className="flex-shrink-0 border-t bg-emerald-50/50 dark:bg-emerald-950/20 px-6 py-3">
                                    <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span className="font-medium">
                                            Process Complete
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <SheetHeader className="sr-only">
                            <SheetTitle>Calling Details</SheetTitle>
                            <SheetDescription>Loading calling details</SheetDescription>
                        </SheetHeader>
                    )}
                </SheetContent>
            </Sheet>

            {/* ── CONFIRMATION DIALOGS ─────────────────────────── */}

            {/* Advance Stage Dialog */}
            <AlertDialog
                open={showAdvanceDialog}
                onOpenChange={setShowAdvanceDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Advance Stage</AlertDialogTitle>
                        <AlertDialogDescription>
                            {activeProcess && nextStage && (
                                <>
                                    Move from{" "}
                                    <strong>
                                        {
                                            stageLabels[
                                            activeProcess.current_stage
                                            ]
                                        }
                                    </strong>
                                    {" to "}
                                    <strong>{stageLabels[nextStage]}</strong>?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAdvanceStage}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Advance
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* LCR Confirmation Dialog */}
            <AlertDialog
                open={showLCRConfirmDialog}
                onOpenChange={setShowLCRConfirmDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Record in LCR
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="text-sm text-muted-foreground space-y-2">
                                <p>
                                    Please verify that this calling has been recorded in
                                    the official Church LCR system.
                                </p>
                                <p className="font-medium text-foreground">
                                    This action will mark the process as complete and the
                                    calling as filled.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleLCRConfirm}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Confirm - Recorded in LCR
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Drop Process Dialog */}
            <AlertDialog open={showDropDialog} onOpenChange={setShowDropDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Drop Process</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will stop the current process. You can optionally
                            provide a reason.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason (optional)"
                            value={dropReason}
                            onChange={(e) => setDropReason(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDropProcess}
                            disabled={submitting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Drop Process
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Candidate Dialog */}
            <AlertDialog
                open={showAddCandidateDialog}
                onOpenChange={setShowAddCandidateDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Add Candidate</AlertDialogTitle>
                        <AlertDialogDescription>
                            Add a name to the brainstorming list for this calling.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <CandidateAutocomplete
                                value={selectedCandidate}
                                onChange={setSelectedCandidate}
                                excludeIds={existingCandidateIds}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Notes (optional)</Label>
                            <Textarea
                                placeholder="Why is this person a good fit?"
                                value={candidateNotes}
                                onChange={(e) =>
                                    setCandidateNotes(e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAddCandidate}
                            disabled={!selectedCandidate || submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Add Candidate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Task Dialog */}
            <AlertDialog
                open={showCreateTaskDialog}
                onOpenChange={setShowCreateTaskDialog}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create Assignment</AlertDialogTitle>
                        <AlertDialogDescription>
                            Create a task linked to this calling process.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                placeholder="e.g., Interview candidate"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Textarea
                                placeholder="Additional details..."
                                value={taskDescription}
                                onChange={(e) =>
                                    setTaskDescription(e.target.value)
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Assign to</Label>
                                <Select
                                    value={taskAssignee}
                                    onValueChange={setTaskAssignee}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers.map((member) => (
                                            <SelectItem
                                                key={member.id}
                                                value={member.id}
                                            >
                                                {member.full_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Due date</Label>
                                <Input
                                    type="date"
                                    value={taskDueDate}
                                    onChange={(e) =>
                                        setTaskDueDate(e.target.value)
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCreateTask}
                            disabled={!taskTitle.trim() || submitting}
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            Create Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
