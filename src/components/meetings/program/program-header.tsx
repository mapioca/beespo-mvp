"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";

interface ProgramHeaderProps {
    title: string;
    date: Date;
    time: string;
    unitName?: string;
    variant?: "standalone" | "embedded";
}

function formatTime12h(time24: string): string {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function ProgramHeader({ title, date, time, unitName }: ProgramHeaderProps) {
    const dateStr = format(date, "EEEE, MMMM d, yyyy");
    const timeStr = formatTime12h(time);

    return (
        <div
            className="space-y-4 pb-2"
            style={{ textAlign: "var(--program-header-align)" as CSSProperties["textAlign"] }}
        >
            {unitName && (
                <p className="text-[0.74em] font-semibold uppercase tracking-[0.24em] text-[color:var(--program-subtle)]">
                    {unitName}
                </p>
            )}
            <h1
                className="max-w-[28ch] tracking-[-0.02em] text-[color:var(--program-text)]"
                style={{
                    fontWeight: "var(--program-title-weight)",
                    fontSize: "var(--program-title-size)",
                    marginInline: "var(--program-title-margin-inline)",
                }}
            >
                {title}
            </h1>
            <div className="flex items-center" style={{ justifyContent: "var(--program-header-justify)" }}>
                <span
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[0.78em] font-medium text-[color:var(--program-pill-text)]"
                    style={{
                        backgroundColor: "var(--program-pill-bg)",
                        border: "1px solid var(--program-pill-border)",
                    }}
                >
                    {dateStr}
                    <span className="h-1 w-1 rounded-full bg-[color:var(--program-muted)]" />
                    {timeStr}
                </span>
            </div>
        </div>
    );
}
