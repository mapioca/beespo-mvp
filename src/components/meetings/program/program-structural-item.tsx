"use client";

import type { ProgramItem } from "./types";

interface ProgramStructuralItemProps {
    item: ProgramItem;
}

export function ProgramStructuralItem({ item }: ProgramStructuralItemProps) {
    if (item.structural_type === "divider") {
        return <div className="h-px bg-slate-200/80 my-3" />;
    }

    // Section header
    return (
        <div className="pt-4 pb-1">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                {item.title}
            </h2>
        </div>
    );
}
