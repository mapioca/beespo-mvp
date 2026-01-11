"use client";

import { Template } from "./templates-layout";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface TemplateAgendaPreviewProps {
    items: NonNullable<Template['items']>;
}

export function TemplateAgendaPreview({ items }: TemplateAgendaPreviewProps) {
    if (!items || items.length === 0) {
        return (
            <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center text-sm text-muted-foreground">
                No agenda items defined for this template.
            </div>
        );
    }

    const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
    const totalDuration = sortedItems.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
                <span>Agenda Timeline</span>
                <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-xs">
                    <Clock className="w-3 h-3" />
                    Est. {totalDuration} min
                </span>
            </div>

            <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-[9px] before:w-[2px] before:bg-gradient-to-b before:from-border before:via-border/50 before:to-transparent">
                {sortedItems.map((item) => (
                    <div key={item.id} className="relative group">
                        {/* Timeline Node */}
                        <div className={cn(
                            "absolute -left-[21px] top-1.5 w-4 h-4 rounded-full border-2 border-background ring-1 ring-border transition-colors group-hover:ring-primary",
                            item.item_type === 'procedural' ? "bg-slate-100" : "bg-blue-50"
                        )}>
                            <div className={cn(
                                "w-1.5 h-1.5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                                item.item_type === 'procedural' ? "bg-slate-400" : "bg-blue-500"
                            )} />
                        </div>

                        {/* Content */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-medium leading-none pt-0.5">
                                    {item.title}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
                                    {item.duration_minutes} min
                                </span>
                            </div>

                            {item.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {item.description}
                                </p>
                            )}

                            {/* Type Badge (Only for non-procedural) */}
                            {item.item_type && item.item_type !== 'procedural' && (
                                <div className="mt-1">
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                        {item.item_type}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
