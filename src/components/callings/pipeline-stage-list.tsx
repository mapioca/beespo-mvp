"use client";

import { PipelineRow } from "./pipeline-row";
import { getStageInfo } from "@/lib/calling-utils";
import type { CallingProcessStage } from "@/types/database";

interface Process {
    id: string;
    current_stage: CallingProcessStage;
    status: "active" | "completed" | "dropped";
    created_at: string;
    updated_at: string;
    candidate: { id: string; name: string } | null;
    calling: {
        id: string;
        title: string;
        organization: string | null;
    } | null;
}

interface PipelineStageListProps {
    processes: Process[];
    stage: CallingProcessStage;
    onAdvance: (processId: string, currentStage: CallingProcessStage) => void;
    onDrop: (processId: string) => void;
    onRowClick: (callingId: string) => void;
}

export function PipelineStageList({
    processes,
    stage,
    onAdvance,
    onDrop,
    onRowClick,
}: PipelineStageListProps) {
    const stageInfo = getStageInfo(stage);

    if (processes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                    <span className="text-muted-foreground/60 text-lg">·</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    No processes at the <span className="font-medium text-foreground/70">{stageInfo.label}</span> stage
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                    {stageInfo.description}
                </p>
            </div>
        );
    }

    return (
        <div>
            {/* Table header (desktop only) */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_140px_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span>Candidate</span>
                <span>Calling</span>
                <span>Time in Stage</span>
                <span className="text-right">Action</span>
            </div>

            {/* Process rows */}
            <div className="space-y-1.5">
                {processes.map((process) => (
                    <PipelineRow
                        key={process.id}
                        personName={process.candidate?.name || "Unknown"}
                        callingTitle={process.calling?.title || "Unknown Calling"}
                        organization={process.calling?.organization}
                        currentStage={process.current_stage}
                        stageUpdatedAt={process.updated_at}
                        onAdvance={() => onAdvance(process.id, process.current_stage)}
                        onRowClick={() => onRowClick(process.calling?.id || "")}
                        onDrop={() => onDrop(process.id)}
                    />
                ))}
            </div>
        </div>
    );
}
