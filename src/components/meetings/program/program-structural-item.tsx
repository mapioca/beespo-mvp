"use client";

import type { ProgramItem } from "./types";

interface ProgramStructuralItemProps {
    item: ProgramItem;
}

export function ProgramStructuralItem({ item }: ProgramStructuralItemProps) {
    if (item.structural_type === "divider") {
        return <div className="border-t border-border/60 my-2" />;
    }

    // Section header
    return (
        <div className="pt-4 pb-1">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {item.title}
            </h2>
        </div>
    );
}
