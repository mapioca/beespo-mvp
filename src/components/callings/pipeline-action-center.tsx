"use client";

import { Building2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallingItem {
    id: string;
    title: string;
    organization: string | null;
    is_filled: boolean;
    created_at: string;
}

interface PipelineActionCenterProps {
    callings: CallingItem[];
    onCallingClick: (id: string) => void;
}

export function PipelineActionCenter({
    callings,
    onCallingClick,
}: PipelineActionCenterProps) {
    if (callings.length === 0) return null;

    return (
        <div className="relative rounded-lg border border-amber-200/60 bg-amber-50/30 dark:border-amber-500/20 dark:bg-amber-950/20">
            {/* Amber left accent */}
            <div className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-amber-400 dark:bg-amber-500" />

            <div className="px-5 py-4 pl-6">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                        {callings.length} calling{callings.length !== 1 ? "s" : ""} need{callings.length === 1 ? "s" : ""} candidates
                    </span>
                </div>

                {/* Calling chips — horizontal scroll */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
                    {callings.map((calling) => (
                        <button
                            key={calling.id}
                            onClick={() => onCallingClick(calling.id)}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-md",
                                "border border-amber-200/80 dark:border-amber-600/30",
                                "bg-white/80 dark:bg-amber-950/40",
                                "hover:bg-amber-50 dark:hover:bg-amber-900/40",
                                "transition-colors text-left group"
                            )}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate max-w-[180px] group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                                    {calling.title}
                                </p>
                                {calling.organization && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Building2 className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate max-w-[140px]">{calling.organization}</span>
                                    </p>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
