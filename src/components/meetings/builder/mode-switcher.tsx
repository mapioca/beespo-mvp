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
        <div className="flex items-center bg-muted rounded-lg p-0.5">
            {modes.map(({ value, label }) => (
                <button
                    key={value}
                    type="button"
                    onClick={() => onModeChange(value)}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        value === mode
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
