"use client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { CallingProcessStage, CallingProcessStatus, CallingCandidateStatus } from "@/types/database";
import type { PipelineColumn } from "./callings-kanban-board";

interface CallingCandidate {
    id: string;
    status: CallingCandidateStatus;
    notes: string | null;
    candidate: { id: string; name: string } | null;
}

interface CallingProcess {
    id: string;
    current_stage: CallingProcessStage;
    status: CallingProcessStatus;
    candidate: { id: string; name: string } | null;
}

interface Calling {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    filled_at: string | null;
    filled_by_name: { id: string; name: string } | null;
    candidates: CallingCandidate[];
    processes: CallingProcess[];
    created_at: string;
}

interface CallingBoardCardProps {
    calling: Calling;
    onClick?: () => void;
    columnType: PipelineColumn;
}

// Stage progression for the mini stepper
const PROCESS_STAGES: CallingProcessStage[] = [
    'defined',
    'approved',
    'extended',
    'accepted',
    'sustained',
    'set_apart',
    'recorded_lcr'
];

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Mini linear stepper component showing progress visually
function MiniProgressStepper({ currentStage }: { currentStage: CallingProcessStage }) {
    const ts = useTranslations("Callings.stages");
    const t = useTranslations("Callings.card");
    const currentIndex = PROCESS_STAGES.indexOf(currentStage);
    const totalStages = PROCESS_STAGES.length;

    return (
        <div className="w-full">
            <div className="flex items-center gap-0.5">
                {PROCESS_STAGES.map((stage, index) => {
                    const isPast = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isFuture = index > currentIndex;

                    return (
                        <div
                            key={stage}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                isPast && "bg-green-500",
                                isCurrent && "bg-primary",
                                isFuture && "bg-muted"
                            )}
                            title={ts(stage as CallingProcessStage)}
                        />
                    );
                })}
            </div>
            <div className="flex items-center justify-between mt-0.5">
                <span className="text-[9px] text-muted-foreground">
                    {t("step", { current: currentIndex + 1, total: totalStages })}
                </span>
            </div>
        </div>
    );
}

export function CallingBoardCard({ calling, onClick, columnType }: CallingBoardCardProps) {
    const t = useTranslations("Callings.card");
    const activeProcess = calling.processes.find(p => p.status === 'active');
    const candidateCount = calling.candidates.filter(c => c.status !== 'archived').length;
    const hasNoCandidates = candidateCount === 0 && !activeProcess && !calling.is_filled;

    // For pipeline columns (not needs_candidates), show the candidate info
    const showCandidateInfo = columnType !== 'needs_candidates' && activeProcess?.candidate;

    return (
        <Card
            className={cn(
                "p-2.5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] group",
                "border shadow-sm rounded-md bg-white",
                hasNoCandidates && columnType === 'needs_candidates' && "border-amber-200 bg-amber-50/50"
            )}
            onClick={onClick}
        >
            {/* Header - Title & Org */}
            <div className="space-y-0.5 mb-1.5">
                <h4 className="font-semibold text-xs leading-tight truncate" title={calling.title}>
                    {calling.title}
                </h4>
                {calling.organization && (
                    <p className="text-[10px] text-muted-foreground truncate">
                        {calling.organization}
                    </p>
                )}
            </div>

            {/* Candidate/State Info */}
            <div className="mb-1.5">
                {columnType === 'needs_candidates' && (
                    <>
                        {hasNoCandidates ? (
                            <div className="flex items-center gap-1">
                                <AlertCircle className="w-3 h-3 text-amber-600" />
                                <span className="text-[10px] text-amber-700 font-medium">
                                    {t("noCandidates")}
                                </span>
                            </div>
                        ) : candidateCount > 0 ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                                <Users className="w-3 h-3" />
                                <span className="text-[10px]">
                                    {t("names", { count: candidateCount })}
                                </span>
                            </div>
                        ) : null}
                    </>
                )}

                {showCandidateInfo && activeProcess?.candidate && (
                    <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                                {getInitials(activeProcess.candidate.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium text-foreground truncate">
                            {activeProcess.candidate.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Mini Progress Bar (for all pipeline stages) */}
            {activeProcess && (
                <MiniProgressStepper currentStage={activeProcess.current_stage} />
            )}
        </Card>
    );
}
