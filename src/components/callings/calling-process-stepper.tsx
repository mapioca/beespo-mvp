"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { CallingProcessStage } from "@/types/database";

interface CallingProcessStepperProps {
    currentStage: CallingProcessStage;
    status: 'active' | 'completed' | 'dropped';
    onStageClick?: (stage: CallingProcessStage) => void;
    compact?: boolean;
}

const stages: { key: CallingProcessStage; label: string; shortLabel: string }[] = [
    { key: 'defined', label: 'Defined', shortLabel: 'Def' },
    { key: 'approved', label: 'Approved', shortLabel: 'Appr' },
    { key: 'extended', label: 'Extended', shortLabel: 'Ext' },
    { key: 'accepted', label: 'Accepted', shortLabel: 'Acpt' },
    { key: 'sustained', label: 'Sustained', shortLabel: 'Sust' },
    { key: 'set_apart', label: 'Set Apart', shortLabel: 'S.A.' },
    { key: 'recorded_lcr', label: 'Recorded in LCR', shortLabel: 'LCR' },
];

export function CallingProcessStepper({
    currentStage,
    status,
    onStageClick,
    compact = false
}: CallingProcessStepperProps) {
    const currentIndex = stages.findIndex(s => s.key === currentStage);
    const isDropped = status === 'dropped';
    const isCompleted = status === 'completed';

    return (
        <div className={cn("flex items-center", compact ? "gap-1" : "gap-2")}>
            {stages.map((stage, index) => {
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;
                const isClickable = onStageClick && !isDropped && !isCompleted && isFuture;

                return (
                    <div key={stage.key} className="flex items-center">
                        {/* Step indicator */}
                        <button
                            type="button"
                            onClick={() => isClickable && onStageClick(stage.key)}
                            disabled={!isClickable}
                            className={cn(
                                "flex items-center justify-center rounded-full transition-all",
                                compact ? "w-6 h-6" : "w-8 h-8",
                                isPast && "bg-green-500 text-white",
                                isCurrent && !isDropped && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                                isCurrent && isDropped && "bg-red-500 text-white ring-2 ring-red-200",
                                isFuture && "bg-muted text-muted-foreground",
                                isClickable && "cursor-pointer hover:bg-primary/80 hover:text-primary-foreground"
                            )}
                            title={stage.label}
                        >
                            {isPast ? (
                                <Check className={cn(compact ? "w-3 h-3" : "w-4 h-4")} />
                            ) : (
                                <span className={cn("font-medium", compact ? "text-[10px]" : "text-xs")}>
                                    {index + 1}
                                </span>
                            )}
                        </button>

                        {/* Label (non-compact only) */}
                        {!compact && (
                            <span
                                className={cn(
                                    "ml-2 text-xs font-medium hidden sm:block",
                                    isPast && "text-green-600",
                                    isCurrent && !isDropped && "text-primary",
                                    isCurrent && isDropped && "text-red-600",
                                    isFuture && "text-muted-foreground"
                                )}
                            >
                                {stage.shortLabel}
                            </span>
                        )}

                        {/* Connector line */}
                        {index < stages.length - 1 && (
                            <div
                                className={cn(
                                    "flex-shrink-0",
                                    compact ? "w-2 mx-0.5" : "w-4 mx-1 sm:w-6 sm:mx-2",
                                    "h-0.5",
                                    isPast ? "bg-green-500" : "bg-muted"
                                )}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// Vertical variant for mobile/sidebar use
export function CallingProcessStepperVertical({
    currentStage,
    status,
    onStageClick
}: CallingProcessStepperProps) {
    const currentIndex = stages.findIndex(s => s.key === currentStage);
    const isDropped = status === 'dropped';
    const isCompleted = status === 'completed';

    return (
        <div className="flex flex-col space-y-0">
            {stages.map((stage, index) => {
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                const isFuture = index > currentIndex;
                const isClickable = onStageClick && !isDropped && !isCompleted && isFuture;

                return (
                    <div key={stage.key} className="flex items-start">
                        {/* Vertical line + dot */}
                        <div className="flex flex-col items-center mr-3">
                            <button
                                type="button"
                                onClick={() => isClickable && onStageClick(stage.key)}
                                disabled={!isClickable}
                                className={cn(
                                    "flex items-center justify-center w-8 h-8 rounded-full transition-all",
                                    isPast && "bg-green-500 text-white",
                                    isCurrent && !isDropped && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                                    isCurrent && isDropped && "bg-red-500 text-white",
                                    isFuture && "bg-muted text-muted-foreground",
                                    isClickable && "cursor-pointer hover:bg-primary/80 hover:text-primary-foreground"
                                )}
                            >
                                {isPast ? (
                                    <Check className="w-4 h-4" />
                                ) : (
                                    <span className="text-xs font-medium">{index + 1}</span>
                                )}
                            </button>
                            {index < stages.length - 1 && (
                                <div
                                    className={cn(
                                        "w-0.5 h-8",
                                        isPast ? "bg-green-500" : "bg-muted"
                                    )}
                                />
                            )}
                        </div>

                        {/* Label */}
                        <div className="pt-1 pb-4">
                            <span
                                className={cn(
                                    "text-sm font-medium",
                                    isPast && "text-green-600",
                                    isCurrent && !isDropped && "text-primary",
                                    isCurrent && isDropped && "text-red-600",
                                    isFuture && "text-muted-foreground"
                                )}
                            >
                                {stage.label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
