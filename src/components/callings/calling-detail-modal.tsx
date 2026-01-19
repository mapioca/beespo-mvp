"use client";

import * as React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
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
    ListTodo,
    ChevronRight,
    AlertTriangle,
    Loader2,
    User
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
    createCallingTask
} from "@/lib/actions/calling-actions";
import {
    getAllStages
} from "@/lib/calling-utils";
import type {
    CallingProcessStage,
    CallingProcessStatus,
    CallingCandidateStatus,
    CallingHistoryAction
} from "@/types/database";

interface CallingDetailModalProps {
    callingId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate?: () => void;
    teamMembers?: { id: string; full_name: string }[];
}

interface TimelineItem {
    id: string;
    type: 'history' | 'comment' | 'task';
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

const stageLabels: Record<CallingProcessStage, string> = {
    defined: "Defined",
    approved: "Approved",
    extended: "Extended",
    accepted: "Accepted",
    sustained: "Sustained",
    set_apart: "Set Apart",
    recorded_lcr: "Recorded in LCR"
};

const actionLabels: Record<CallingHistoryAction, string> = {
    process_started: "Process started",
    stage_changed: "Stage advanced",
    status_changed: "Status changed",
    comment_added: "Comment added",
    task_created: "Task created",
    task_completed: "Task completed"
};

export function CallingDetailModal({
    callingId,
    open,
    onOpenChange,
    onUpdate,
    teamMembers = []
}: CallingDetailModalProps) {
    const [calling, setCalling] = React.useState<CallingData | null>(null);
    const [timeline, setTimeline] = React.useState<TimelineItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [comment, setComment] = React.useState("");
    const [submitting, setSubmitting] = React.useState(false);
    const [showAdvanceDialog, setShowAdvanceDialog] = React.useState(false);
    const [showDropDialog, setShowDropDialog] = React.useState(false);
    const [showAddCandidateDialog, setShowAddCandidateDialog] = React.useState(false);
    const [showCreateTaskDialog, setShowCreateTaskDialog] = React.useState(false);
    const [showLCRConfirmDialog, setShowLCRConfirmDialog] = React.useState(false);
    const [dropReason, setDropReason] = React.useState("");
    const [selectedCandidate, setSelectedCandidate] = React.useState<{ id: string; name: string } | null>(null);
    const [candidateNotes, setCandidateNotes] = React.useState("");
    const [taskTitle, setTaskTitle] = React.useState("");
    const [taskDescription, setTaskDescription] = React.useState("");
    const [taskAssignee, setTaskAssignee] = React.useState<string>("");
    const [taskDueDate, setTaskDueDate] = React.useState("");

    const activeProcess = calling?.processes.find(p => p.status === 'active');
    const stages = getAllStages();
    const nextStage = activeProcess ? stages[stages.indexOf(activeProcess.current_stage) + 1] : undefined;

    const loadData = React.useCallback(async () => {
        if (!callingId) return;

        setLoading(true);
        // 1. Fetch calling first
        const callingResult = await getCalling(callingId);

        if (callingResult.success && callingResult.calling) {
            setCalling(callingResult.calling);

            // 2. Identify active process from FRESH data
            const freshActiveProcess = callingResult.calling.processes.find(
                (p: Process) => p.status === 'active'
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



    const handleAdvanceStage = async () => {
        if (!activeProcess) return;

        const stages = getAllStages();
        const currentIndex = stages.indexOf(activeProcess.current_stage);
        const nextStage = stages[currentIndex + 1];

        if (!nextStage) return;

        // Special handling for LCR stage
        if (nextStage === 'recorded_lcr') {
            setShowLCRConfirmDialog(true);
            return;
        }

        setSubmitting(true);
        const result = await advanceProcessStage(activeProcess.id, nextStage);
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
        const result = await advanceProcessStage(activeProcess.id, 'recorded_lcr');
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

    const handleStartProcess = async (candidateNameId: string, callingCandidateId?: string) => {
        if (!calling) return;

        setSubmitting(true);
        const result = await startCallingProcess(calling.id, candidateNameId, callingCandidateId);
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
            priority: 'medium'
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

    const existingCandidateIds = calling?.candidates.map(c => c.candidate?.id).filter(Boolean) as string[] || [];

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    {loading && !calling ? (
                        <>
                            <DialogHeader>
                                <DialogTitle className="sr-only">Loading Calling Details</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        </>
                    ) : calling ? (
                        <>
                            {/* Header */}
                            <DialogHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <DialogTitle className="text-xl flex items-center gap-2">
                                            {calling.title}
                                            {calling.is_filled && (
                                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                                    <UserCheck className="w-3 h-3 mr-1" />
                                                    Filled
                                                </Badge>
                                            )}
                                        </DialogTitle>
                                        {calling.organization && (
                                            <DialogDescription className="flex items-center gap-1 mt-1">
                                                <Building2 className="w-4 h-4" />
                                                {calling.organization}
                                            </DialogDescription>
                                        )}
                                    </div>
                                </div>

                                {/* Active Process Info */}
                                {activeProcess && (
                                    <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-primary" />
                                                <span className="font-medium">{activeProcess.candidate?.name}</span>
                                                <Badge variant="outline">
                                                    {stageLabels[activeProcess.current_stage]}
                                                </Badge>
                                            </div>
                                        </div>
                                        <CallingProcessStepper
                                            currentStage={activeProcess.current_stage}
                                            status={activeProcess.status}
                                        />
                                    </div>
                                )}

                                {/* Filled Info */}
                                {calling.is_filled && calling.filled_by_name && !activeProcess && (
                                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                                        <div className="flex items-center gap-2 text-green-800">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span>
                                                Filled by <strong>{calling.filled_by_name.name}</strong>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </DialogHeader>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                <Tabs defaultValue="timeline" className="h-full flex flex-col">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="timeline" className="flex items-center gap-2">
                                            <History className="w-4 h-4" />
                                            Timeline
                                        </TabsTrigger>
                                        <TabsTrigger value="candidates" className="flex items-center gap-2">
                                            <User className="w-4 h-4" />
                                            Candidates
                                        </TabsTrigger>
                                        <TabsTrigger value="actions" className="flex items-center gap-2">
                                            <ListTodo className="w-4 h-4" />
                                            Actions
                                        </TabsTrigger>
                                    </TabsList>

                                    {/* Timeline Tab */}
                                    <TabsContent value="timeline" className="flex-1 overflow-y-auto mt-4 space-y-4">
                                        {activeProcess ? (
                                            <>
                                                {/* Timeline Items */}
                                                <div className="space-y-3">
                                                    {timeline.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground text-center py-8">
                                                            No activity yet
                                                        </p>
                                                    ) : (
                                                        timeline.map((item) => (
                                                            <div
                                                                key={item.id}
                                                                className={cn(
                                                                    "flex gap-3 p-3 rounded-lg",
                                                                    item.type === 'comment' && "bg-blue-50/50",
                                                                    item.type === 'task' && "bg-purple-50/50",
                                                                    item.type === 'history' && "bg-muted/30"
                                                                )}
                                                            >
                                                                <div className="shrink-0">
                                                                    {item.type === 'comment' && (
                                                                        <MessageSquare className="w-4 h-4 text-blue-500" />
                                                                    )}
                                                                    {item.type === 'task' && (
                                                                        <ListTodo className="w-4 h-4 text-purple-500" />
                                                                    )}
                                                                    {item.type === 'history' && (
                                                                        <Clock className="w-4 h-4 text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    {item.type === 'history' && (
                                                                        <p className="text-sm">
                                                                            <span className="font-medium">
                                                                                {item.action && actionLabels[item.action]}
                                                                            </span>
                                                                            {item.from_value && item.to_value && (
                                                                                <span className="text-muted-foreground">
                                                                                    : {stageLabels[item.from_value as CallingProcessStage] || item.from_value}
                                                                                    {" → "}
                                                                                    {stageLabels[item.to_value as CallingProcessStage] || item.to_value}
                                                                                </span>
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    {item.type === 'comment' && (
                                                                        <p className="text-sm">{item.content}</p>
                                                                    )}
                                                                    {item.type === 'task' && (
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-sm font-medium">{item.title}</span>
                                                                            <Badge
                                                                                variant={item.status === 'completed' ? 'secondary' : 'outline'}
                                                                                className="text-xs"
                                                                            >
                                                                                {item.status}
                                                                            </Badge>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                                        {item.created_by_user?.full_name && (
                                                                            <span>{item.created_by_user.full_name}</span>
                                                                        )}
                                                                        <span>{format(new Date(item.created_at), "MMM d, h:mm a")}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Comment Input */}
                                                <div className="flex gap-2 pt-4 border-t">
                                                    <Textarea
                                                        placeholder="Add a comment..."
                                                        value={comment}
                                                        onChange={(e) => setComment(e.target.value)}
                                                        className="min-h-[80px]"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        onClick={handleAddComment}
                                                        disabled={!comment.trim() || submitting}
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>Select a candidate to start a process</p>
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* Candidates Tab */}
                                    <TabsContent value="candidates" className="flex-1 overflow-y-auto mt-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h4 className="font-medium">Brainstorming</h4>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => setShowAddCandidateDialog(true)}
                                                disabled={calling.is_filled}
                                            >
                                                <Plus className="w-4 h-4 mr-1" />
                                                Add Name
                                            </Button>
                                        </div>

                                        {calling.candidates.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-8">
                                                No candidates yet. Add names to brainstorm potential people for this calling.
                                            </p>
                                        ) : (
                                            <div className="space-y-2">
                                                {calling.candidates
                                                    .filter(c => c.status !== 'archived')
                                                    .map((candidate) => (
                                                        <div
                                                            key={candidate.id}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-lg border",
                                                                candidate.status === 'selected' && "bg-primary/5 border-primary/30"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <User className="w-4 h-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="font-medium">{candidate.candidate?.name}</p>
                                                                    {candidate.notes && (
                                                                        <p className="text-xs text-muted-foreground">{candidate.notes}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Badge variant="outline" className="capitalize">
                                                                    {candidate.status}
                                                                </Badge>
                                                                {candidate.status !== 'selected' && !calling.is_filled && !activeProcess && candidate.candidate && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleStartProcess(candidate.candidate!.id, candidate.id)}
                                                                        disabled={submitting}
                                                                    >
                                                                        <ChevronRight className="w-4 h-4 mr-1" />
                                                                        Start Process
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </TabsContent>

                                    {/* Actions Tab */}
                                    <TabsContent value="actions" className="flex-1 overflow-y-auto mt-4 space-y-4">
                                        {activeProcess ? (
                                            <div className="space-y-4">
                                                {/* Advance Stage */}
                                                {activeProcess.current_stage !== 'recorded_lcr' && (
                                                    <Button
                                                        className="w-full"
                                                        onClick={() => setShowAdvanceDialog(true)}
                                                        disabled={submitting}
                                                    >
                                                        <ChevronRight className="w-4 h-4 mr-2" />
                                                        Advance to Next Stage
                                                    </Button>
                                                )}

                                                {/* Create Task */}
                                                <Button
                                                    variant="outline"
                                                    className="w-full"
                                                    onClick={() => setShowCreateTaskDialog(true)}
                                                    disabled={submitting}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Create Assignment
                                                </Button>

                                                {/* Drop Process */}
                                                <Button
                                                    variant="ghost"
                                                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setShowDropDialog(true)}
                                                    disabled={submitting}
                                                >
                                                    <XCircle className="w-4 h-4 mr-2" />
                                                    Drop Process
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <ListTodo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>Start a process to see available actions</p>
                                            </div>
                                        )}
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </>
                    ) : (
                        <div className="sr-only">
                            <DialogHeader>
                                <DialogTitle>Calling Details</DialogTitle>
                            </DialogHeader>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Advance Stage Dialog */}
            <AlertDialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Advance Stage</AlertDialogTitle>
                        <AlertDialogDescription>
                            {activeProcess && nextStage && (
                                <>
                                    Move from <strong>{stageLabels[activeProcess.current_stage]}</strong>
                                    {" to "}
                                    <strong>
                                        {stageLabels[nextStage]}
                                    </strong>?
                                </>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleAdvanceStage} disabled={submitting}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Advance
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* LCR Confirmation Dialog */}
            <AlertDialog open={showLCRConfirmDialog} onOpenChange={setShowLCRConfirmDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Record in LCR
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                            <p>
                                Please verify that this calling has been recorded in the official Church LCR system.
                            </p>
                            <p className="font-medium text-foreground">
                                This action will mark the process as complete and the calling as filled.
                            </p>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleLCRConfirm} disabled={submitting}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
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
                            This will stop the current process. You can optionally provide a reason.
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
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Drop Process
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Candidate Dialog */}
            <AlertDialog open={showAddCandidateDialog} onOpenChange={setShowAddCandidateDialog}>
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
                                onChange={(e) => setCandidateNotes(e.target.value)}
                            />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleAddCandidate}
                            disabled={!selectedCandidate || submitting}
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Add Candidate
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Task Dialog */}
            <AlertDialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
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
                                onChange={(e) => setTaskDescription(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Assign to</Label>
                                <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
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
                                    onChange={(e) => setTaskDueDate(e.target.value)}
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
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Create Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
