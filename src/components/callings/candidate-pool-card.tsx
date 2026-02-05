"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
import { CandidateAutocomplete } from "./candidate-autocomplete";
import { Plus, MoreVertical, Pencil, Trash2, PlayCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    addCandidateToCalling,
    updateCallingCandidate,
    removeCallingCandidate,
    startCallingProcess,
} from "@/lib/actions/calling-actions";
import { useToast } from "@/lib/hooks/use-toast";
import type { CallingCandidateStatus } from "@/types/database";

interface Candidate {
    id: string;
    status: CallingCandidateStatus;
    notes: string | null;
    candidate: { id: string; name: string } | null;
}

interface CandidatePoolCardProps {
    callingId: string;
    callingTitle: string;
    candidates: Candidate[];
    onUpdate: () => void;
    hasActiveProcess?: boolean;
}

const statusColors: Record<CallingCandidateStatus, string> = {
    proposed: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    discussing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    selected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    archived: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function CandidatePoolCard({
    callingId,
    callingTitle,
    candidates,
    onUpdate,
    hasActiveProcess = false,
}: CandidatePoolCardProps) {
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string } | null>(null);
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleAddCandidate = async () => {
        if (!selectedCandidate) return;

        setIsLoading(true);

        const result = await addCandidateToCalling(callingId, selectedCandidate.id, notes || undefined);

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Candidate added",
                description: `${selectedCandidate.name} added to pool`,
            });
            setIsAddingCandidate(false);
            setSelectedCandidate(null);
            setNotes("");
            onUpdate();
        }

        setIsLoading(false);
    };

    const handleUpdateNotes = async () => {
        if (!editingCandidate) return;

        setIsLoading(true);

        const result = await updateCallingCandidate(editingCandidate.id, { notes });

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({ title: "Notes updated" });
            setEditingCandidate(null);
            setNotes("");
            onUpdate();
        }

        setIsLoading(false);
    };

    const handleRemoveCandidate = async (candidateId: string, name: string) => {
        const result = await removeCallingCandidate(candidateId);

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Candidate removed",
                description: `${name} removed from pool`,
            });
            onUpdate();
        }
    };

    const handleStartProcess = async (callingCandidateId: string, candidateNameId: string, name: string) => {
        setIsLoading(true);

        const result = await startCallingProcess(callingId, candidateNameId, callingCandidateId);

        if (result.error) {
            toast({
                title: "Error",
                description: result.error,
                variant: "destructive",
            });
        } else {
            toast({
                title: "Process started",
                description: `Started calling process for ${name}`,
            });
            onUpdate();
        }

        setIsLoading(false);
    };

    // Sort candidates: selected first, then discussing, then proposed, archived last
    const sortedCandidates = [...candidates].sort((a, b) => {
        const order: Record<CallingCandidateStatus, number> = {
            selected: 0,
            discussing: 1,
            proposed: 2,
            archived: 3,
        };
        return order[a.status] - order[b.status];
    });

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-base flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Candidate Pool
                        </CardTitle>
                        <CardDescription>
                            {candidates.length} candidate{candidates.length !== 1 ? "s" : ""} for {callingTitle}
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingCandidate(true)}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {sortedCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No candidates yet. Add someone to brainstorm!
                    </p>
                ) : (
                    sortedCandidates.map((candidate) => (
                        <div
                            key={candidate.id}
                            className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium truncate">
                                        {candidate.candidate?.name || "Unknown"}
                                    </span>
                                    <span
                                        className={cn(
                                            "px-2 py-0.5 text-xs font-medium rounded-full",
                                            statusColors[candidate.status]
                                        )}
                                    >
                                        {candidate.status}
                                    </span>
                                </div>
                                {candidate.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">
                                        {candidate.notes}
                                    </p>
                                )}
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {!hasActiveProcess && candidate.status !== "archived" && (
                                        <DropdownMenuItem
                                            onClick={() =>
                                                handleStartProcess(
                                                    candidate.id,
                                                    candidate.candidate?.id || "",
                                                    candidate.candidate?.name || ""
                                                )
                                            }
                                        >
                                            <PlayCircle className="w-4 h-4 mr-2" />
                                            Start Process
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setEditingCandidate(candidate);
                                            setNotes(candidate.notes || "");
                                        }}
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        Edit Notes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() =>
                                            handleRemoveCandidate(
                                                candidate.id,
                                                candidate.candidate?.name || ""
                                            )
                                        }
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Remove
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))
                )}
            </CardContent>

            {/* Add Candidate Dialog */}
            <Dialog open={isAddingCandidate} onOpenChange={(open) => {
                setIsAddingCandidate(open);
                if (!open) {
                    setSelectedCandidate(null);
                    setNotes("");
                }
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Candidate</DialogTitle>
                        <DialogDescription>
                            Add a candidate to the pool for {callingTitle}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <CandidateAutocomplete
                                value={selectedCandidate}
                                onChange={setSelectedCandidate}
                                disabled={isLoading}
                                excludeIds={candidates.map((c) => c.candidate?.id || "").filter(Boolean)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Notes (optional)</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add notes about this candidate..."
                                disabled={isLoading}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddingCandidate(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCandidate}
                            disabled={!selectedCandidate || isLoading}
                        >
                            Add Candidate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Notes Dialog */}
            <Dialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Notes</DialogTitle>
                        <DialogDescription>
                            Notes for {editingCandidate?.candidate?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add notes about this candidate..."
                            rows={4}
                            disabled={isLoading}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingCandidate(null)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateNotes} disabled={isLoading}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
