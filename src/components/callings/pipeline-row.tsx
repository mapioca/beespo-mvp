"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MoreVertical, Clock } from "lucide-react";
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

function getStalenessTextColor(daysInStatus: number): string {
    if (daysInStatus <= 7) return "text-muted-foreground";
    if (daysInStatus <= 14) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-500";
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
    const stalenessColor = getStalenessTextColor(daysInStatus);
    const action = stageActions[currentStage];
    const isCompleted = currentStage === "recorded_lcr";

    const timeLabel =
        daysInStatus === 0
            ? "Today"
            : `${daysInStatus}d`;

    return (
        <div
            className={cn(
                "group flex items-center gap-4 px-4 py-3 rounded-lg",
                "hover:bg-accent/40 transition-colors cursor-pointer"
            )}
            onClick={onRowClick}
        >
            {/* Candidate name */}
            <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-foreground truncate block">
                    {personName}
                </span>
            </div>

            {/* Calling title + org */}
            <div className="flex-1 min-w-0 hidden sm:block">
                <span className="text-sm text-foreground/80 truncate block">
                    {callingTitle}
                </span>
                {organization && (
                    <span className="text-xs text-muted-foreground truncate block mt-0.5">
                        {organization}
                    </span>
                )}
            </div>

            {/* Mobile: combined info */}
            <div className="flex-1 min-w-0 sm:hidden">
                <span className="text-xs text-muted-foreground truncate block">
                    {callingTitle}
                    {organization ? ` · ${organization}` : ""}
                </span>
            </div>

            {/* Time in stage */}
            <div className={cn("flex items-center gap-1 flex-shrink-0 w-[80px] sm:w-[140px]", stalenessColor)}>
                <Clock className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">
                    {daysInStatus === 0
                        ? "Today"
                        : `${daysInStatus} day${daysInStatus !== 1 ? "s" : ""}`}
                </span>
                <span className="text-xs font-medium sm:hidden">{timeLabel}</span>
            </div>

            {/* Action area */}
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {!isCompleted && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onAdvance}
                        className="hidden sm:flex text-xs h-7 px-2.5"
                    >
                        {action.label}
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
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
