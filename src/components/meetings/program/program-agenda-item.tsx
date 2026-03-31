"use client";

import { Music, User, Hand } from "lucide-react";
import type { ProgramItem } from "./types";
import { ProgramContainerSection } from "./program-container-section";
import { ProgramStructuralItem } from "./program-structural-item";

interface ProgramAgendaItemProps {
    item: ProgramItem;
}

const cardBase =
    "rounded-[var(--program-radius)] border bg-[color:var(--program-card)] px-[var(--program-card-padding-x)] py-[var(--program-card-padding-y)]";

const cardStyle = {
    boxShadow: "var(--program-card-shadow)",
    borderColor: "var(--program-card-border)",
    borderWidth: "var(--program-border-width)",
    borderStyle: "var(--program-card-border-style)",
} as const;

const iconWrapClass = "rounded-full bg-[color:var(--program-icon-bg)] border border-[color:var(--program-icon-border)] shrink-0";
const iconClass = "text-[color:var(--program-muted)]";

export function ProgramAgendaItem({ item }: ProgramAgendaItemProps) {
    if (item.category === "structural") {
        return <ProgramStructuralItem item={item} />;
    }

    if (item.isContainer) {
        return <ProgramContainerSection item={item} />;
    }

    if (item.is_hymn) {
        return (
            <div className={`flex items-start gap-3 ${cardBase}`} style={cardStyle}>
                <span className={iconWrapClass} style={{ width: "var(--program-icon-box)", height: "var(--program-icon-box)" }}>
                    <span className="flex h-full w-full items-center justify-center" style={{ display: "var(--program-icons-display)" }}>
                        <Music className={iconClass} strokeWidth={1.75} style={{ width: "var(--program-icon-size)", height: "var(--program-icon-size)" }} />
                    </span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[1em] font-semibold text-[color:var(--program-text)]">{item.title}</p>
                    <p className="mt-0.5 text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
                        {item.hymn_number && item.hymn_title ? `#${item.hymn_number} — ${item.hymn_title}` : "TBD"}
                    </p>
                </div>
            </div>
        );
    }

    if (item.category === "speaker") {
        return (
            <div className={`flex items-start gap-3 ${cardBase}`} style={cardStyle}>
                <span className={iconWrapClass} style={{ width: "var(--program-icon-box)", height: "var(--program-icon-box)" }}>
                    <span className="flex h-full w-full items-center justify-center" style={{ display: "var(--program-icons-display)" }}>
                        <User className={iconClass} strokeWidth={1.75} style={{ width: "var(--program-icon-size)", height: "var(--program-icon-size)" }} />
                    </span>
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[1em] font-semibold text-[color:var(--program-text)]">{item.speaker_name || "TBD"}</p>
                        {item.duration_minutes > 0 && (
                            <span className="shrink-0 rounded-full border border-[color:var(--program-border)] bg-[color:var(--program-soft)] px-2 py-0.5 text-[0.72em] text-[color:var(--program-muted)] tabular-nums">
                                {item.duration_minutes} min
                            </span>
                        )}
                    </div>
                    {item.speaker_topic && (
                        <p className="text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
                            {item.speaker_topic}
                        </p>
                    )}
                    <p
                        className="mt-1 text-[0.72em] tracking-[0.14em] text-[color:var(--program-subtle)]"
                        style={{ textTransform: "var(--program-section-case)", display: "var(--program-subtitle-display)" }}
                    >
                        {item.title}
                    </p>
                </div>
            </div>
        );
    }

    if (item.requires_participant) {
        return (
            <div className={`flex items-start gap-3 ${cardBase}`} style={cardStyle}>
                <span className={iconWrapClass} style={{ width: "var(--program-icon-box)", height: "var(--program-icon-box)" }}>
                    <span className="flex h-full w-full items-center justify-center" style={{ display: "var(--program-icons-display)" }}>
                        <Hand className={iconClass} strokeWidth={1.75} style={{ width: "var(--program-icon-size)", height: "var(--program-icon-size)" }} />
                    </span>
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[1em] font-semibold text-[color:var(--program-text)]">{item.title}</p>
                    <p className="mt-0.5 text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
                        {item.participant_name || "TBD"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cardBase} style={cardStyle}>
            <p className="text-[1em] font-semibold text-[color:var(--program-text)]">{item.title}</p>
            {item.description?.trim() && (
                <p className="mt-0.5 text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
                    {item.description}
                </p>
            )}
        </div>
    );
}
