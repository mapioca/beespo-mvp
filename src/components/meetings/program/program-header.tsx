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

export function ProgramHeader({ title, date, time, unitName}: ProgramHeaderProps) {
    const dateStr = format(date, "EEEE, MMMM d, yyyy");
    const timeStr = formatTime12h(time);
    return (
        <div className="text-center space-y-3 pb-6">
            {unitName && (
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400 font-semibold">
                    {unitName}
                </p>
            )}
            <h1 className="text-[22px] font-semibold tracking-tight">
                {title}
            </h1>
            <div className="flex items-center justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600">
                    {dateStr}
                    <span className="h-1 w-1 rounded-full bg-slate-400" />
                    {timeStr}
                </span>
            </div>
        </div>
    );
}
