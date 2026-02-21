"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { toast } from "@/lib/toast";
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
    proposed: "bg-gray-100 text-gray-800",
    discussing: "bg-blue-100 text-blue-800",
    selected: "bg-green-100 text-green-800",
    archived: "bg-amber-100 text-amber-800",
};

export function CandidatePoolCard({
    callingId,
    callingTitle,
    candidates,
    onUpdate,
    hasActiveProcess = false,
}: CandidatePoolCardProps) {
    const t = useTranslations("Callings");
    const [isAddingCandidate, setIsAddingCandidate] = useState(false);
    const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
    const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string } | null>(null);
    const [notes, setNotes] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAddCandidate = async () => {
        if (!selectedCandidate) return;

        setIsLoading(true);

        const result = await addCandidateToCalling(callingId, selectedCandidate.id, notes || undefined);

        if (result.error) {
        } else {
            toast.success(t("pool.candidateAdded"), { description: t("pool.candidateAddedDesc", { name: selectedCandidate.name }) });
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
        } else {
            toast.success(t("pool.notesUpdated"));
            setEditingCandidate(null);
            setNotes("");
            onUpdate();
        }

        setIsLoading(false);
    };

    const handleRemoveCandidate = async (candidateId: string, name: string) => {
        const result = await removeCallingCandidate(candidateId);

        if (result.error) {
        } else {
            toast.success(t("pool.candidateRemoved"), { description: t("pool.candidateRemovedDesc", { name }) });
            onUpdate();
        }
    };

    const handleStartProcess = async (callingCandidateId: string, candidateNameId: string, name: string) => {
        setIsLoading(true);

        const result = await startCallingProcess(callingId, candidateNameId, callingCandidateId);

        if (result.error) {
        } else {
            toast.success(t("pool.processStarted"), { description: t("pool.processStartedDesc", { name }) });
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
                            {t("pool.title")}
                        </CardTitle>
                        <CardDescription>
                            {t("pool.count", { count: candidates.length, title: callingTitle })}
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAddingCandidate(true)}
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        {t("pool.add")}
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-2">
                {sortedCandidates.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        {t("pool.empty")}
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
                                        {t(`pool.candidateStatuses.${candidate.status}`)}
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
                                            {t("pool.actions.startProcess")}
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setEditingCandidate(candidate);
                                            setNotes(candidate.notes || "");
                                        }}
                                    >
                                        <Pencil className="w-4 h-4 mr-2" />
                                        {t("pool.actions.editNotes")}
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
                                        {t("pool.actions.remove")}
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
                        <DialogTitle>{t("pool.dialogs.addCandidate.title")}</DialogTitle>
                        <DialogDescription>
                            {t("pool.dialogs.addCandidate.description", { title: callingTitle })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("pool.dialogs.addCandidate.nameLabel")}</label>
                            <CandidateAutocomplete
                                value={selectedCandidate}
                                onChange={setSelectedCandidate}
                                disabled={isLoading}
                                excludeIds={candidates.map((c) => c.candidate?.id || "").filter(Boolean)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("pool.dialogs.addCandidate.notesLabel")}</label>
                            <Textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder={t("pool.dialogs.addCandidate.notesPlaceholder")}
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
                            {t("common.cancel")}
                        </Button>
                        <Button
                            onClick={handleAddCandidate}
                            disabled={!selectedCandidate || isLoading}
                        >
                            {t("pool.add")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Notes Dialog */}
            <Dialog open={!!editingCandidate} onOpenChange={(open) => !open && setEditingCandidate(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("pool.dialogs.editNotes.title")}</DialogTitle>
                        <DialogDescription>
                            {t("pool.dialogs.editNotes.description", { name: editingCandidate?.candidate?.name || "" })}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder={t("pool.dialogs.editNotes.placeholder")}
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
                            {t("common.cancel")}
                        </Button>
                        <Button onClick={handleUpdateNotes} disabled={isLoading}>
                            {t("common.save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
