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
        <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-slate-500" />
                </span>
                <h3 className="text-sm font-semibold text-slate-900">{headerLabel}</h3>
            </div>
            {children.length === 0 ? (
                <p className="text-xs text-slate-400 italic pl-8">No items</p>
            ) : (
                <div className="space-y-2 pl-8">
                    {children.map((child) => (
                        <div
                            key={child.id}
                            className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-medium leading-snug text-slate-900">{child.title}</p>
                                {child.priority && child.priority !== "normal" && (
                                    <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold">
                                        {child.priority}
                                    </span>
                                )}
                            </div>
                            {child.person_name && (
                                <p className="text-xs text-slate-500 mt-0.5">{child.person_name}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
