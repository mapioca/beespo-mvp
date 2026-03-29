"use client";

import { useMemo } from "react";
import { generateMeetingMarkdown } from "@/lib/generate-meeting-markdown";
import { MarkdownRenderer } from "../markdown-renderer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CanvasItem } from "./types";

interface PrintPreviewPaneProps {
    title: string;
    date: Date;
    time: string;
    unitName?: string;
    presiding?: string;
    conducting?: string;
    chorister?: string;
    pianistOrganist?: string;
    meetingNotes?: string | null;
    canvasItems: CanvasItem[];
}

export function PrintPreviewPane({
    title,
    date,
    time,
    unitName,
    presiding,
    conducting,
    chorister,
    pianistOrganist,
    meetingNotes,
    canvasItems,
}: PrintPreviewPaneProps) {
    const markdown = useMemo(
        () =>
            generateMeetingMarkdown({
                title,
                date,
                time,
                unitName,
                presiding,
                conducting,
                chorister,
                pianistOrganist,
                meetingNotes,
                canvasItems,
            }),
        [title, date, time, unitName, presiding, conducting, chorister, pianistOrganist, meetingNotes, canvasItems]
    );
    const totalDuration = canvasItems.reduce((sum, item) => sum + item.duration_minutes, 0);

    return (
        <ScrollArea className="flex-1 bg-muted relative z-0">
            <div className="relative flex justify-center p-6 md:p-12">
                {totalDuration > 0 && (
                    <div className="absolute top-4 right-6 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 ring-1 ring-border shadow-sm text-xs text-muted-foreground">
                        {canvasItems.length} {canvasItems.length === 1 ? "item" : "items"} &bull; {totalDuration} min
                    </div>
                )}
                <div className="bg-background shadow-2xl w-full max-w-[850px] min-h-[1056px] p-12 sm:p-16 relative rounded-sm">
                    <MarkdownRenderer markdown={markdown} unitName={unitName} />
                </div>
            </div>
        </ScrollArea>
    );
}
