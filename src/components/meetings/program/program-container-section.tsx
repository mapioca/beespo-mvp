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
        <div className="space-y-2 py-2">
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{headerLabel}</h3>
            </div>
            {children.length === 0 ? (
                <p className="text-xs text-muted-foreground italic pl-5">No items</p>
            ) : (
                <div className="space-y-1.5 pl-5">
                    {children.map((child) => (
                        <div
                            key={child.id}
                            className="rounded-md border border-border/50 bg-muted/30 px-3 py-2"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-snug">{child.title}</p>
                                {child.priority && child.priority !== "normal" && (
                                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                                        {child.priority}
                                    </span>
                                )}
                            </div>
                            {child.person_name && (
                                <p className="text-xs text-muted-foreground mt-0.5">{child.person_name}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
