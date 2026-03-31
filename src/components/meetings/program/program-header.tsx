"use client";

import { format } from "date-fns";
import type { CSSProperties } from "react";

interface ProgramHeaderProps {
    title: string;
    date: Date;
    time: string;
    variant?: "standalone" | "embedded";
    dateFormat?: "long" | "medium" | "short";
    titleCase?: "title" | "sentence" | "uppercase";
}

function formatTime12h(time24: string): string {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function ProgramHeader({ title, date, time, dateFormat = "long", titleCase = "title" }: ProgramHeaderProps) {
    const dateStr = format(
        date,
        dateFormat === "short" ? "M/d/yy" : dateFormat === "medium" ? "MMM d, yyyy" : "EEEE, MMMM d, yyyy"
    );
    const timeStr = formatTime12h(time);
    const displayTitle =
        titleCase === "sentence"
            ? title.charAt(0).toUpperCase() + title.slice(1)
            : title
                  .split(" ")
                  .map((word) => (word.length === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
                  .join(" ");

    return (
        <div
            className="space-y-3 pb-1.5"
            style={{ textAlign: "var(--program-header-align)" as CSSProperties["textAlign"] }}
        >
            <h1
                className="tracking-[-0.02em] leading-tight text-[color:var(--program-text)]"
                style={{
                    fontWeight: "var(--program-title-weight)",
                    fontSize: "var(--program-title-size)",
                    marginInline: "var(--program-title-margin-inline)",
                    maxWidth: "var(--program-title-max-width)",
                    textTransform: "var(--program-title-case)" as CSSProperties["textTransform"],
                }}
            >
                {displayTitle}
            </h1>
            <div className="flex items-center" style={{ justifyContent: "var(--program-header-justify)" }}>
                <span
                    className="inline-flex items-center gap-2 rounded-full text-[0.72em] font-medium text-[color:var(--program-pill-text)]"
                    style={{
                        backgroundColor: "var(--program-pill-bg)",
                        border: "1px solid var(--program-pill-border)",
                        padding: "var(--program-pill-padding)",
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
