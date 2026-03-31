"use client";

import type { CSSProperties } from "react";
import type { ProgramItem } from "./types";

interface ProgramStructuralItemProps {
    item: ProgramItem;
}

export function ProgramStructuralItem({ item }: ProgramStructuralItemProps) {
    if (item.structural_type === "divider") {
        return (
            <div
                className="my-3"
                style={{
                    borderTopWidth: "var(--program-divider-weight)",
                    borderTopStyle: "var(--program-divider-style)" as CSSProperties["borderTopStyle"],
                    borderTopColor: "var(--program-border)",
                }}
            />
        );
    }

    // Section header
    return (
        <div className="pt-4 pb-1">
            <h2
                className="font-semibold tracking-[0.28em] text-[color:var(--program-subtle)]"
                style={{ textTransform: "var(--program-section-case)", fontSize: "var(--program-section-title-size)" }}
            >
                {item.title}
            </h2>
        </div>
    );
}
