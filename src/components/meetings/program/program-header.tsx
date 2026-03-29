"use client";

import { format } from "date-fns";

interface ProgramHeaderProps {
    title: string;
    date: Date;
    time: string; // "HH:mm"
    unitName?: string;
    variant?: "standalone" | "embedded";
}

function formatTime12h(time24: string): string {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

export function ProgramHeader({ title, date, time, unitName, variant = "embedded" }: ProgramHeaderProps) {
    const dateStr = format(date, "EEEE, MMMM d, yyyy");
    const timeStr = formatTime12h(time);
    const isStandalone = variant === "standalone";

    return (
        <div className="text-center space-y-2 pb-6">
            {unitName && (
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
                    {unitName}
                </p>
            )}
            <h1 className={isStandalone ? "text-2xl font-semibold tracking-tight" : "text-xl font-semibold tracking-tight"}>
                {title}
            </h1>
            <p className="text-sm text-muted-foreground">
                {dateStr} &middot; {timeStr}
            </p>
        </div>
    );
}
