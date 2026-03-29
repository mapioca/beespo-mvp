"use client";

import { Music, User, Hand } from "lucide-react";
import type { ProgramItem } from "./types";
import { ProgramContainerSection } from "./program-container-section";
import { ProgramStructuralItem } from "./program-structural-item";

interface ProgramAgendaItemProps {
    item: ProgramItem;
}

export function ProgramAgendaItem({ item }: ProgramAgendaItemProps) {
    // Structural items (section headers, dividers)
    if (item.category === "structural") {
        return <ProgramStructuralItem item={item} />;
    }

    // Container items (discussions, business, announcements)
    if (item.isContainer) {
        return <ProgramContainerSection item={item} />;
    }

    // Hymn items
    if (item.is_hymn) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                <span className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Music className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                        {item.hymn_number && item.hymn_title
                            ? `#${item.hymn_number} — ${item.hymn_title}`
                            : "TBD"}
                    </p>
                </div>
            </div>
        );
    }

    // Speaker items
    if (item.category === "speaker") {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                <span className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">
                            {item.speaker_name || "TBD"}
                        </p>
                        {item.duration_minutes > 0 && (
                            <span className="shrink-0 text-[10px] text-slate-500 tabular-nums bg-slate-100 px-2 py-0.5 rounded-full">
                                {item.duration_minutes} min
                            </span>
                        )}
                    </div>
                    {item.speaker_topic && (
                        <p className="text-xs text-slate-500">{item.speaker_topic}</p>
                    )}
                    <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mt-1">{item.title}</p>
                </div>
            </div>
        );
    }

    // Participant items (prayers, etc.)
    if (item.requires_participant) {
        return (
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                <span className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <Hand className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">
                        {item.participant_name || "TBD"}
                    </p>
                </div>
            </div>
        );
    }

    // Generic procedural item
    return (
        <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
            <p className="text-sm font-medium text-slate-900">{item.title}</p>
            {item.description?.trim() && (
                <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            )}
        </div>
    );
}
