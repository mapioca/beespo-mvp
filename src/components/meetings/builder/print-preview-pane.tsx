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

    return (
        <ScrollArea className="flex-1 bg-muted relative z-0">
            <div className="flex justify-center p-6 md:p-12">
                <div className="bg-background shadow-2xl w-full max-w-[850px] min-h-[1056px] p-12 sm:p-16 relative rounded-sm">
                    <MarkdownRenderer markdown={markdown} unitName={unitName} />
                </div>
            </div>
        </ScrollArea>
    );
}
