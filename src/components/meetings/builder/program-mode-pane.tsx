"use client";

import { useMemo } from "react";
import { Smartphone } from "lucide-react";
import { CanvasItem } from "./types";
import { ProgramView } from "../program/program-view";
import { canvasItemsToProgramItems, ProgramViewData } from "../program/types";

interface ProgramModePaneProps {
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

export function ProgramModePane({
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
}: ProgramModePaneProps) {
    const programData: ProgramViewData = useMemo(
        () => ({
            title,
            date,
            time,
            unitName,
            roles: { presiding, conducting, chorister, pianistOrganist },
            items: canvasItemsToProgramItems(canvasItems),
            meetingNotes,
        }),
        [title, date, time, unitName, presiding, conducting, chorister, pianistOrganist, meetingNotes, canvasItems]
    );

    return (
        <div className="flex-1 flex flex-col items-center bg-muted overflow-y-auto py-8">
            {/* Device label */}
            <div className="flex items-center gap-1.5 mb-4">
                <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Mobile</span>
            </div>

            {/* Phone frame */}
            <div className="relative shrink-0">
                {/* Device shell */}
                <div className="w-[390px] h-[700px] rounded-[2.5rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-background shadow-2xl overflow-hidden flex flex-col">
                    {/* Status bar / notch area */}
                    <div className="h-8 bg-background flex items-center justify-center shrink-0">
                        <div className="w-[100px] h-[22px] bg-zinc-900 dark:bg-zinc-700 rounded-full" />
                    </div>

                    {/* Scrollable content area */}
                    <div className="flex-1 overflow-y-auto">
                        <ProgramView data={programData} variant="embedded" />
                    </div>

                    {/* Home indicator */}
                    <div className="h-6 bg-background flex items-center justify-center shrink-0">
                        <div className="w-[120px] h-[4px] bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
