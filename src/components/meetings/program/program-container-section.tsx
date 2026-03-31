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
    viewStyle?: "cards" | "list";
}

export function ProgramContainerSection({ item, viewStyle = "cards" }: ProgramContainerSectionProps) {
    const config = CONTAINER_CONFIG[item.containerType || "discussion"];
    const Icon = config?.icon || MessageSquare;
    const headerLabel = item.title?.trim() || config?.label || "Items";
    const children = item.children || [];
    const isList = viewStyle === "list";
    const childBaseClass = isList
        ? "border-b border-[color:var(--program-list-divider)] pb-2.5"
        : "rounded-[var(--program-section-radius)] border bg-[color:var(--program-card)] px-[var(--program-card-padding-x)] py-[var(--program-card-padding-y)]";
    const childBaseStyle = isList
        ? undefined
        : {
              boxShadow: "var(--program-card-shadow)",
              borderColor: "var(--program-card-border)",
              borderWidth: "var(--program-border-width)",
              borderStyle: "var(--program-card-border-style)",
          };

    return (
        <div className="space-y-2.5 py-1">
            <div className="flex items-center gap-2">
                <span
                    className={
                        isList
                            ? "flex h-[var(--program-icon-box)] w-[var(--program-icon-box)] items-center justify-center text-[color:var(--program-muted)]"
                            : "rounded-full bg-[color:var(--program-icon-bg)] border border-[color:var(--program-icon-border)]"
                    }
                    style={!isList ? { width: "var(--program-icon-box)", height: "var(--program-icon-box)" } : undefined}
                >
                    <span className="flex h-full w-full items-center justify-center" style={{ display: "var(--program-icons-display)" }}>
                        <Icon
                            className="text-[color:var(--program-muted)]"
                            strokeWidth={1.75}
                            style={{ width: "var(--program-icon-size)", height: "var(--program-icon-size)" }}
                        />
                    </span>
                </span>
                <h3 className="mt-px text-[1em] font-semibold text-[color:var(--program-text)]">{headerLabel}</h3>
            </div>

            {children.length === 0 ? (
                <p className="pl-8 text-[0.86em] italic text-[color:var(--program-subtle)]" style={{ display: "var(--program-subtitle-display)" }}>
                    No items
                </p>
            ) : (
                <div className={isList ? "space-y-0 pl-8" : "space-y-2 pl-8"}>
                    {children.map((child, index) => (
                        <div
                            key={child.id}
                            className={`${childBaseClass} ${isList && index === children.length - 1 ? "border-b-0 pb-0" : ""}`}
                            style={childBaseStyle}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="max-w-[42ch] text-[1em] font-medium leading-snug text-[color:var(--program-text)]">{child.title}</p>
                                {child.priority && child.priority !== "normal" && (
                                    <span className="shrink-0 text-[0.72em] font-semibold uppercase tracking-[0.12em] text-[color:var(--program-subtle)]">
                                        {child.priority}
                                    </span>
                                )}
                            </div>
                            {child.person_name && (
                                <p className="mt-0.5 max-w-[44ch] text-[0.88em] text-[color:var(--program-muted)]" style={{ display: "var(--program-subtitle-display)" }}>
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
