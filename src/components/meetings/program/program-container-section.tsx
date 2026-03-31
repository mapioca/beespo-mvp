"use client";

import { MessageSquare, Megaphone, Briefcase } from "lucide-react";
import type { ProgramItem } from "./types";

const CONTAINER_CONFIG: Record<string, { icon: typeof MessageSquare; label: string }> = {
    discussion: { icon: MessageSquare, label: "Discussions" },
    business: { icon: Briefcase, label: "Ward Business" },
    announcement: { icon: Megaphone, label: "Announcements" },
};

interface ProgramContainerSectionProps {
    item: ProgramItem;
}

export function ProgramContainerSection({ item }: ProgramContainerSectionProps) {
    const config = CONTAINER_CONFIG[item.containerType || "discussion"];
    const Icon = config?.icon || MessageSquare;
    const headerLabel = item.title?.trim() || config?.label || "Items";
    const children = item.children || [];

    return (
        <div className="space-y-3 py-1">
            <div className="flex items-center gap-2">
                <span
                    className="rounded-full bg-[color:var(--program-icon-bg)] border border-[color:var(--program-icon-border)]"
                    style={{ width: "var(--program-icon-box)", height: "var(--program-icon-box)" }}
                >
                    <span className="flex h-full w-full items-center justify-center" style={{ display: "var(--program-icons-display)" }}>
                        <Icon
                            className="text-[color:var(--program-muted)]"
                            strokeWidth={1.75}
                            style={{ width: "var(--program-icon-size)", height: "var(--program-icon-size)" }}
                        />
                    </span>
                </span>
                <h3 className="mt-[2px] text-[1em] font-semibold text-[color:var(--program-text)]">{headerLabel}</h3>
            </div>

            {children.length === 0 ? (
                <p className="pl-8 text-[0.86em] italic text-[color:var(--program-subtle)]" style={{ display: "var(--program-subtitle-display)" }}>
                    No items
                </p>
            ) : (
                <div className="space-y-2 pl-8">
                    {children.map((child) => (
                        <div
                            key={child.id}
                            className="rounded-[var(--program-section-radius)] border bg-[color:var(--program-card)] px-[var(--program-card-padding-x)] py-[var(--program-card-padding-y)]"
                            style={{
                                boxShadow: "var(--program-card-shadow)",
                                borderColor: "var(--program-card-border)",
                                borderWidth: "var(--program-border-width)",
                                borderStyle: "var(--program-card-border-style)",
                            }}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-[1em] font-medium leading-snug text-[color:var(--program-text)]">{child.title}</p>
                                {child.priority && child.priority !== "normal" && (
                                    <span className="shrink-0 text-[0.72em] font-semibold uppercase tracking-[0.12em] text-[color:var(--program-subtle)]">
                                        {child.priority}
                                    </span>
                                )}
                            </div>
                            {child.person_name && (
                                <p className="mt-0.5 text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
                                    {child.person_name}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
