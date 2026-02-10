"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import type { CallingProcessStage } from "@/types/database";

interface StageTab {
    key: CallingProcessStage;
    label: string;
    count: number;
}

interface PipelineStatusBarProps {
    stages: StageTab[];
    selectedStage: CallingProcessStage;
    onSelect: (stage: CallingProcessStage) => void;
}

export function PipelineStatusBar({
    stages,
    selectedStage,
    onSelect,
}: PipelineStatusBarProps) {
    return (
        <div className="w-full">
            {/* Scrollable tab strip */}
            <div className="flex items-center gap-0.5 overflow-x-auto pb-px scrollbar-thin">
                {stages.map((stage, index) => {
                    const isSelected = stage.key === selectedStage;
                    const hasItems = stage.count > 0;

                    return (
                        <div key={stage.key} className="flex items-center flex-shrink-0">
                            <button
                                onClick={() => onSelect(stage.key)}
                                className={cn(
                                    "relative flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-all",
                                    "hover:bg-accent/60",
                                    isSelected && "bg-accent text-foreground",
                                    !isSelected && hasItems && "text-foreground/80",
                                    !isSelected && !hasItems && "text-muted-foreground/60"
                                )}
                            >
                                <span className={cn(
                                    "font-medium whitespace-nowrap",
                                    isSelected && "text-foreground"
                                )}>
                                    {stage.label}
                                </span>

                                {/* Count badge */}
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-medium tabular-nums",
                                        isSelected && hasItems && "bg-primary text-primary-foreground",
                                        isSelected && !hasItems && "bg-muted text-muted-foreground",
                                        !isSelected && hasItems && "bg-muted text-foreground/70",
                                        !isSelected && !hasItems && "bg-muted/50 text-muted-foreground/50"
                                    )}
                                >
                                    {stage.count}
                                </span>

                                {/* Active indicator bar */}
                                {isSelected && (
                                    <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary" />
                                )}
                            </button>

                            {/* Chevron connector */}
                            {index < stages.length - 1 && (
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0 mx-0.5" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom border */}
            <div className="h-px bg-border -mt-px" />
        </div>
    );
}
