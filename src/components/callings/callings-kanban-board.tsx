"use client";

import * as React from "react";
import { CallingBoardCard } from "./calling-board-card";
import { cn } from "@/lib/utils";
import { AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
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
    count: number;
    icon: React.ReactNode;
    headerColor: string;
    countBgColor: string;
    children: React.ReactNode;
    emptyMessage?: string;
}

function KanbanColumn({
    title,
    count,
    icon,
    headerColor,
    countBgColor,
    children,
    emptyMessage = "No items"
}: KanbanColumnProps) {
    return (
        <div className="flex flex-col min-w-[300px] max-w-[350px] flex-1">
            {/* Column Header */}
            <div
                className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-t-lg border border-b-0",
                    headerColor
                )}
            >
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

            {/* Column Body */}
            <div className="flex-1 p-2 border border-t-0 rounded-b-lg bg-muted/30 min-h-[400px] overflow-y-auto">
                {React.Children.count(children) === 0 ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                        {emptyMessage}
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

interface CallingsKanbanBoardProps {
    callings: Calling[];
    onCallingClick: (calling: Calling) => void;
}

export function CallingsKanbanBoard({ callings, onCallingClick }: CallingsKanbanBoardProps) {
    // Get the date 30 days ago for filtering filled callings
    const thirtyDaysAgo = React.useMemo(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date;
    }, []);

    // Group callings into the three columns
    const columns = React.useMemo(() => {
        const needsAttention: Calling[] = [];
        const inProgress: Calling[] = [];
        const filled: Calling[] = [];

        callings.forEach(calling => {
            const activeProcess = calling.processes.find(p => p.status === 'active');

            if (calling.is_filled) {
                // Column C: Filled - only show callings filled in the last 30 days
                if (calling.filled_at) {
                    const filledDate = new Date(calling.filled_at);
                    if (filledDate >= thirtyDaysAgo) {
                        filled.push(calling);
                    }
                } else {
                    // If no filled_at date, include it anyway
                    filled.push(calling);
                }
            } else if (activeProcess) {
                // Column B: In Progress - has an active process (candidate is selected)
                inProgress.push(calling);
            } else {
                // Column A: Needs Attention - open OR has no candidates
                // This includes callings that are open but may have candidates in brainstorming
                needsAttention.push(calling);
            }
        });

        return { needsAttention, inProgress, filled };
    }, [callings, thirtyDaysAgo]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
            {/* Column A: Needs Attention */}
            <KanbanColumn
                title="Needs Attention"
                count={columns.needsAttention.length}
                icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
                headerColor="bg-amber-50 text-amber-900"
                countBgColor="bg-amber-200 text-amber-800"
                emptyMessage="All callings have candidates!"
            >
                {columns.needsAttention.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="needs_attention"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column B: In Progress */}
            <KanbanColumn
                title="In Progress"
                count={columns.inProgress.length}
                icon={<Clock className="w-4 h-4 text-blue-600" />}
                headerColor="bg-blue-50 text-blue-900"
                countBgColor="bg-blue-200 text-blue-800"
                emptyMessage="No active processes"
            >
                {columns.inProgress.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="in_progress"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>

            {/* Column C: Filled (Last 30 Days) */}
            <KanbanColumn
                title="Recently Filled"
                count={columns.filled.length}
                icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                headerColor="bg-green-50 text-green-900"
                countBgColor="bg-green-200 text-green-800"
                emptyMessage="No recently filled callings"
            >
                {columns.filled.map(calling => (
                    <CallingBoardCard
                        key={calling.id}
                        calling={calling}
                        columnType="filled"
                        onClick={() => onCallingClick(calling)}
                    />
                ))}
            </KanbanColumn>
        </div>
    );
}
