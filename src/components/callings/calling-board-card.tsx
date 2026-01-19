"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CallingProcessStage, CallingProcessStatus, CallingCandidateStatus } from "@/types/database";

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
    columnType: 'needs_attention' | 'in_progress' | 'filled';
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

const stageLabels: Record<CallingProcessStage, string> = {
    defined: "Defined",
    approved: "Approved",
    extended: "Extended",
    accepted: "Accepted",
    sustained: "Sustained",
    set_apart: "Set Apart",
    recorded_lcr: "Recorded"
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

// Mini linear stepper component for In Progress cards
function MiniProgressStepper({ currentStage }: { currentStage: CallingProcessStage }) {
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
                                "h-1.5 flex-1 rounded-full transition-colors",
                                isPast && "bg-green-500",
                                isCurrent && "bg-primary",
                                isFuture && "bg-muted"
                            )}
                            title={stageLabels[stage]}
                        />
                    );
                })}
            </div>
            <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">
                    Step {currentIndex + 1} of {totalStages}
                </span>
                <span className="text-[10px] font-medium text-primary">
                    {stageLabels[currentStage]}
                </span>
            </div>
        </div>
    );
}

export function CallingBoardCard({ calling, onClick, columnType }: CallingBoardCardProps) {
    const activeProcess = calling.processes.find(p => p.status === 'active');
    const candidateCount = calling.candidates.filter(c => c.status !== 'archived').length;
    const hasNoCandidates = candidateCount === 0 && !activeProcess && !calling.is_filled;

    return (
        <Card
            className={cn(
                "p-3 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] group",
                "border shadow-sm rounded-md bg-white",
                hasNoCandidates && "border-amber-200 bg-amber-50/50"
            )}
            onClick={onClick}
        >
            {/* Header - Title & Org */}
            <div className="space-y-0.5 mb-2">
                <h4 className="font-semibold text-sm leading-tight truncate pr-2" title={calling.title}>
                    {calling.title}
                </h4>
                {calling.organization && (
                    <p className="text-xs text-muted-foreground truncate">
                        {calling.organization}
                    </p>
                )}
            </div>

            {/* State Indicator */}
            <div className="mb-2">
                {columnType === 'needs_attention' && (
                    <>
                        {hasNoCandidates ? (
                            <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                <span className="text-xs text-amber-700 font-medium">
                                    No candidates yet
                                </span>
                            </div>
                        ) : candidateCount > 0 ? (
                            <Badge variant="secondary" className="text-xs font-normal">
                                <Users className="w-3 h-3 mr-1" />
                                {candidateCount} Candidate{candidateCount !== 1 ? 's' : ''}
                            </Badge>
                        ) : null}
                    </>
                )}

                {columnType === 'in_progress' && activeProcess?.candidate && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {getInitials(activeProcess.candidate.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-foreground truncate">
                            {activeProcess.candidate.name}
                        </span>
                    </div>
                )}

                {columnType === 'filled' && calling.filled_by_name && (
                    <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-[10px] bg-green-100 text-green-700">
                                {getInitials(calling.filled_by_name.name)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex items-center gap-1 min-w-0">
                            <Check className="w-3 h-3 text-green-600 shrink-0" />
                            <span className="text-sm font-medium text-green-700 truncate">
                                {calling.filled_by_name.name}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Mini Progress Bar (only for In Progress) */}
            {columnType === 'in_progress' && activeProcess && (
                <MiniProgressStepper currentStage={activeProcess.current_stage} />
            )}
        </Card>
    );
}
