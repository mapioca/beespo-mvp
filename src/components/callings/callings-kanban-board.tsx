"use client";

import * as React from "react";
import { CallingBoardCard } from "./calling-board-card";
import { cn } from "@/lib/utils";
import {
    Users,
    Phone,
    Hand,
    Sparkles,
    FileCheck
} from "lucide-react";
import { useTranslations } from "next-intl";
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

interface KanbanColumnProps {
    title: string;
    subtitle: string;
    count: number;
    icon: React.ReactNode;
    headerColor: string;
    countBgColor: string;
    children: React.ReactNode;
    emptyMessage?: string;
}

function KanbanColumn({
    title,
    subtitle,
    count,
    icon,
    headerColor,
    countBgColor,
    children,
    emptyMessage = "No callings at this stage"
}: KanbanColumnProps) {
    return (
        <div className="flex flex-col w-80 shrink-0">
            {/* Column Header */}
            <div
                className={cn(
                    "px-3 py-2 rounded-t-lg border border-b-0",
                    headerColor
                )}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-sm">{title}</span>
                    <span
                        className={cn(
                            "ml-auto px-2 py-0.5 rounded-full text-xs font-medium",
                            countBgColor
                        )}
                    >
                        {count}
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
            </div>

            {/* Column Body */}
            <div className="flex-1 p-2 border border-t-0 rounded-b-lg bg-muted/30 min-h-[350px] overflow-y-auto">
                {React.Children.count(children) === 0 ? (
                    <div className="flex flex-col items-center justify-center h-24 text-center">
                        <div className="w-full h-12 bg-muted/50 rounded-md border-2 border-dashed border-muted-foreground/20 mb-2" />
                        <span className="text-[11px] text-muted-foreground">{emptyMessage}</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

// Define column types for the pipeline
export type PipelineColumn =
    | 'needs_candidates'
    | 'to_extend'
    | 'to_sustain'
    | 'to_set_apart'
    | 'to_record';

interface CallingsKanbanBoardProps {
    callings: Calling[];
    onCallingClick: (calling: Calling) => void;
}

export function CallingsKanbanBoard({ callings, onCallingClick }: CallingsKanbanBoardProps) {
    const t = useTranslations("Callings.kanban");
    // Group callings into the 5 pipeline columns
    const columns = React.useMemo(() => {
        const needsCandidates: Calling[] = [];
        const toExtend: Calling[] = [];
        const toSustain: Calling[] = [];
        const toSetApart: Calling[] = [];
        const toRecord: Calling[] = [];

        callings.forEach(calling => {
            const activeProcess = calling.processes.find(p => p.status === 'active');

            // Skip filled callings - they're done
            if (calling.is_filled) {
                return;
            }

            if (!activeProcess) {
                // No active process = needs candidates (brainstorming)
                needsCandidates.push(calling);
            } else {
                // Route based on current stage
                const stage = activeProcess.current_stage;

                switch (stage) {
                    case 'defined':
                    case 'approved':
                        // Ready to be extended (Bishop interview)
                        toExtend.push(calling);
                        break;
                    case 'extended':
                    case 'accepted':
                        // Ready to be sustained (Ward business)
                        toSustain.push(calling);
                        break;
                    case 'sustained':
                        // Ready to be set apart (Blessings)
                        toSetApart.push(calling);
                        break;
                    case 'set_apart':
                        // Ready to be recorded (Clerk enters in LCR)
                        toRecord.push(calling);
                        break;
                    case 'recorded_lcr':
                        // Already recorded, should not appear on board
                        break;
                }
            }
        });

        return { needsCandidates, toExtend, toSustain, toSetApart, toRecord };
    }, [callings]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {/* Column 1: Needs Candidates */}
            <KanbanColumn
                title={t("needsCandidates.title")}
                subtitle={t("needsCandidates.subtitle")}
                count={columns.needsCandidates.length}
                icon={<Users className="w-4 h-4 text-amber-600" />}
                headerColor="bg-amber-50 text-amber-900"
                countBgColor="bg-amber-200 text-amber-800"
                emptyMessage={t("needsCandidates.empty")}
            >
                {columns.needsCandidates.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="needs_candidates"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column 2: To Extend */}
            <KanbanColumn
                title={t("toExtend.title")}
                subtitle={t("toExtend.subtitle")}
                count={columns.toExtend.length}
                icon={<Phone className="w-4 h-4 text-blue-600" />}
                headerColor="bg-blue-50 text-blue-900"
                countBgColor="bg-blue-200 text-blue-800"
                emptyMessage={t("toExtend.empty")}
            >
                {columns.toExtend.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="to_extend"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column 3: To Sustain */}
            <KanbanColumn
                title={t("toSustain.title")}
                subtitle={t("toSustain.subtitle")}
                count={columns.toSustain.length}
                icon={<Hand className="w-4 h-4 text-purple-600" />}
                headerColor="bg-purple-50 text-purple-900"
                countBgColor="bg-purple-200 text-purple-800"
                emptyMessage={t("toSustain.empty")}
            >
                {columns.toSustain.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="to_sustain"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column 4: To Set Apart */}
            <KanbanColumn
                title={t("toSetApart.title")}
                subtitle={t("toSetApart.subtitle")}
                count={columns.toSetApart.length}
                icon={<Sparkles className="w-4 h-4 text-orange-600" />}
                headerColor="bg-orange-50 text-orange-900"
                countBgColor="bg-orange-200 text-orange-800"
                emptyMessage={t("toSetApart.empty")}
            >
                {columns.toSetApart.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="to_set_apart"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column 5: To Record */}
            <KanbanColumn
                title={t("toRecord.title")}
                subtitle={t("toRecord.subtitle")}
                count={columns.toRecord.length}
                icon={<FileCheck className="w-4 h-4 text-green-600" />}
                headerColor="bg-green-50 text-green-900"
                countBgColor="bg-green-200 text-green-800"
                emptyMessage={t("toRecord.empty")}
            >
                {columns.toRecord.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="to_record"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>
        </div>
    );
}
