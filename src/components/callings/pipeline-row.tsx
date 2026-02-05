"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronRight, MoreVertical, Clock } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { differenceInDays } from "date-fns";
import type { CallingProcessStage } from "@/types/database";

interface PipelineRowProps {
    personName: string;
    callingTitle: string;
    organization?: string | null;
    currentStage: CallingProcessStage;
    stageUpdatedAt: string;
    onAdvance: () => void;
    onRowClick: () => void;
    onDrop?: () => void;
}

// Stage to next action mapping
const stageActions: Record<CallingProcessStage, { label: string; nextStage: CallingProcessStage | null }> = {
    defined: { label: "Submit for Approval", nextStage: "approved" },
    approved: { label: "Record Extension", nextStage: "extended" },
    extended: { label: "Record Acceptance", nextStage: "accepted" },
    accepted: { label: "Mark Sustained", nextStage: "sustained" },
    sustained: { label: "Mark Set Apart", nextStage: "set_apart" },
    set_apart: { label: "Record in LCR", nextStage: "recorded_lcr" },
    recorded_lcr: { label: "Completed", nextStage: null },
};

function getStalenessColor(daysInStatus: number): string {
    if (daysInStatus <= 7) return "bg-emerald-500";
    if (daysInStatus <= 14) return "bg-amber-500";
    return "bg-red-500";
}

export function PipelineRow({
    personName,
    callingTitle,
    organization,
    currentStage,
    stageUpdatedAt,
    onAdvance,
    onRowClick,
    onDrop,
}: PipelineRowProps) {
    const daysInStatus = differenceInDays(new Date(), new Date(stageUpdatedAt));
    const stalenessColor = getStalenessColor(daysInStatus);
    const action = stageActions[currentStage];
    const isCompleted = currentStage === "recorded_lcr";

    return (
        <div
            className={cn(
                "group relative flex items-center gap-3 p-3 rounded-lg border bg-card",
                "hover:bg-accent/50 transition-colors cursor-pointer",
                "focus-within:ring-2 focus-within:ring-ring"
            )}
            onClick={onRowClick}
        >
            {/* Staleness indicator border */}
            <div
                className={cn(
                    "absolute left-0 top-2 bottom-2 w-1 rounded-full",
                    stalenessColor
                )}
            />

            {/* Main content */}
            <div className="flex-1 min-w-0 pl-3">
                <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{personName}</span>
                    <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground truncate">
                        {callingTitle}
                    </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {organization && (
                        <span className="px-1.5 py-0.5 bg-muted rounded text-xs">
                            {organization}
                        </span>
                    )}
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysInStatus === 0
                            ? "Today"
                            : `${daysInStatus} day${daysInStatus !== 1 ? "s" : ""} in status`}
                    </span>
                </div>
            </div>

            {/* Action area */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                {!isCompleted && (
                    <Button
                        size="sm"
                        onClick={onAdvance}
                        className="hidden sm:flex"
                    >
                        {action.label}
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {!isCompleted && (
                            <DropdownMenuItem onClick={onAdvance} className="sm:hidden">
                                {action.label}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={onRowClick}>
                            View Details
                        </DropdownMenuItem>
                        {onDrop && !isCompleted && (
                            <DropdownMenuItem
                                onClick={onDrop}
                                className="text-destructive focus:text-destructive"
                            >
                                Drop Process
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
