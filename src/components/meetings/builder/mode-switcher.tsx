"use client";

import { cn } from "@/lib/utils";
import { BuilderMode } from "./types";

const ALL_MODES: { value: BuilderMode; label: string }[] = [
    { value: "planning", label: "Planning" },
    { value: "print-preview", label: "Print Preview" },
    { value: "program", label: "Program" },
];

interface ModeSwitcherProps {
    mode: BuilderMode;
    onModeChange: (mode: BuilderMode) => void;
    /** When false, Planning mode is hidden (read-only viewers) */
    isLeader?: boolean;
}

export function ModeSwitcher({ mode, onModeChange, isLeader = true }: ModeSwitcherProps) {
    const modes = isLeader ? ALL_MODES : ALL_MODES.filter((m) => m.value !== "planning");

    return (
        <div className="flex items-center gap-3">
            {modes.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onModeChange(value)}
                    className={cn(
                        "relative px-1 py-1 text-xs font-medium transition-colors",
                        value === mode
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {label}
                    {value === mode && (
                        <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-foreground rounded-full" />
                    )}
                </button>
            ))}
        </div>
    );
}
