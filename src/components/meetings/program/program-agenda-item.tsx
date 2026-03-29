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
            <div className="flex items-start gap-3 py-2">
                <Music className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
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
            <div className="flex items-start gap-3 py-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">
                            {item.speaker_name || "TBD"}
                        </p>
                        {item.duration_minutes > 0 && (
                            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                                {item.duration_minutes} min
                            </span>
                        )}
                    </div>
                    {item.speaker_topic && (
                        <p className="text-xs text-muted-foreground">{item.speaker_topic}</p>
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">{item.title}</p>
                </div>
            </div>
        );
    }

    // Participant items (prayers, etc.)
    if (item.requires_participant) {
        return (
            <div className="flex items-start gap-3 py-2">
                <Hand className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {item.participant_name || "TBD"}
                    </p>
                </div>
            </div>
        );
    }

    // Generic procedural item
    return (
        <div className="py-2">
            <p className="text-sm font-medium">{item.title}</p>
            {item.description?.trim() && (
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            )}
        </div>
    );
}
