"use client";

import { Clock } from "lucide-react";
import { Database } from "@/types/database";

type TemplateItem = Database["public"]["Tables"]["template_items"]["Row"];

interface TemplateAgendaPreviewProps {
    items: TemplateItem[];
}

export function TemplateAgendaPreview({ items }: TemplateAgendaPreviewProps) {
    if (!items || items.length === 0) {
        return (
            <div className="rounded-[22px] border border-dashed border-border/60 bg-control/25 p-6 text-center text-sm text-muted-foreground">
                No agenda items defined for this template.
            </div>
        );
    }

    const sortedItems = [...items].sort((a, b) => a.order_index - b.order_index);
    const totalDuration = sortedItems.reduce((acc, item) => acc + (item.duration_minutes || 0), 0);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
                <div>
                    <p className="text-[15px] font-semibold tracking-[-0.01em] text-foreground/72">
                        Agenda timeline
                    </p>
                    <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                        A quick read of the full meeting flow.
                    </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-control px-2.5 py-1 text-[11px] font-medium text-foreground/62">
                    <Clock className="w-3 h-3" />
                    Est. {totalDuration} min
                </span>
            </div>

            <div className="space-y-3">
                {sortedItems.map((item, index) => (
                    <div
                        key={item.id}
                        className="grid grid-cols-[40px_minmax(0,1fr)_72px] items-start gap-3 rounded-[18px] border border-border/55 bg-white px-4 py-3.5 transition-colors hover:bg-control/20"
                    >
                        <div className="flex items-start justify-center pt-0.5">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-control text-[11px] font-semibold text-foreground/62">
                                {index + 1}
                            </span>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-start justify-between gap-3">
                                <span className="text-[15px] font-medium leading-6 text-foreground">
                                    {item.title}
                                </span>
                            </div>

                            {item.description && (
                                <p className="mt-1.5 line-clamp-2 text-[13px] leading-6 text-muted-foreground">
                                    {item.description}
                                </p>
                            )}

                        </div>

                        <div className="pt-0.5 text-right">
                            <span className="text-[12px] font-medium tabular-nums text-foreground/58">
                                {item.duration_minutes ? `${item.duration_minutes} min` : "—"}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
