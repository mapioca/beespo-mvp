"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgendaItemDividerProps {
    /** Callback when user clicks to add an item at this position */
    onAddClick: () => void;
    /** Whether operations are disabled */
    disabled?: boolean;
}

/**
 * Ghost Divider Component
 * An invisible hover area between agenda items that reveals a "+" button
 * for inserting new items at that position.
 */
export function AgendaItemDivider({
    onAddClick,
    disabled = false,
}: AgendaItemDividerProps) {
    if (disabled) return null;

    return (
        <div className="relative group">
            {/* Invisible hit area */}
            <div
                className="h-3 -my-1.5 cursor-pointer"
                onClick={onAddClick}
            >
                {/* The horizontal line */}
                <div
                    className={cn(
                        "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full transition-all duration-150",
                        "bg-transparent group-hover:bg-primary/40"
                    )}
                />
                {/* The centered + button */}
                <div
                    className={cn(
                        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                        "flex items-center justify-center w-5 h-5 rounded-full",
                        "bg-primary text-primary-foreground shadow-sm",
                        "transition-all duration-150",
                        "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100"
                    )}
                >
                    <Plus className="h-3 w-3" />
                </div>
            </div>
        </div>
    );
}
