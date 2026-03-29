"use client";

import { useMemo, useState } from "react";
import { Copy, Link as LinkIcon, Monitor, Smartphone, Tablet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    isLeader?: boolean;
    isLive?: boolean;
    isTogglingLive?: boolean;
    liveUrl?: string | null;
    onGoLive?: () => void;
    onCopyLiveLink?: () => void;
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
    isLeader = false,
    isLive = false,
    isTogglingLive = false,
    liveUrl,
    onGoLive,
    onCopyLiveLink,
}: ProgramModePaneProps) {
    const [previewDevice, setPreviewDevice] = useState<"phone" | "tablet" | "desktop">("phone");

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

    const totalDuration = canvasItems.reduce((sum, item) => sum + item.duration_minutes, 0);
    const displayLiveUrl = liveUrl ? liveUrl.replace(/^https?:\/\//, "") : "";

    const deviceConfig = previewDevice === "tablet"
        ? {
            label: "Tablet",
            width: "w-[600px]",
            height: "h-[870px]",
            radius: "rounded-[2rem]",
            border: "border-[10px]",
            notchHeight: "h-0",
            notchWidth: "w-[56px]",
            notchRadius: "rounded-full",
        }
        : previewDevice === "desktop"
          ? {
              label: "Desktop",
              width: "w-[900px]",
              height: "h-[585px]",
              radius: "rounded-[1.2rem]",
              border: "border-[6px]",
              notchHeight: "h-0",
              notchWidth: "w-0",
              notchRadius: "rounded-full",
          }
          : {
              label: "Phone",
              width: "w-[360px]",
              height: "h-[782px]",
              radius: "rounded-[2.4rem]",
              border: "border-[6px]",
              notchHeight: "h-8",
              notchWidth: "w-[104px]",
              notchRadius: "rounded-full",
          };

    return (
        <div className="flex-1 flex flex-col items-center bg-background overflow-y-auto py-10">
            {/* Toolbar */}
            <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3 mb-4 px-6">
                <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                <button
                    type="button"
                    onClick={() => setPreviewDevice("phone")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        previewDevice === "phone"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Smartphone className="h-3.5 w-3.5" />
                    Phone
                </button>
                <button
                    type="button"
                    onClick={() => setPreviewDevice("tablet")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        previewDevice === "tablet"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Tablet className="h-3.5 w-3.5" />
                    Tablet
                </button>
                <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        previewDevice === "desktop"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Monitor className="h-3.5 w-3.5" />
                    Desktop
                </button>
            </div>

                <div className="flex items-center gap-3">
                    {totalDuration > 0 && (
                        <div className="text-xs text-blue-700 bg-blue-50 rounded-full px-3 py-1 border border-blue-200/60">
                            {canvasItems.length} {canvasItems.length === 1 ? "item" : "items"} &bull; {totalDuration} min
                        </div>
                    )}

                    {isLeader && (
                        isLive ? (
                            liveUrl ? (
                                <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs text-emerald-700 shadow-sm">
                                    <LinkIcon className="h-3.5 w-3.5" />
                                    <span className="max-w-[220px] truncate">{displayLiveUrl}</span>
                                    <button
                                        type="button"
                                        onClick={onCopyLiveLink}
                                        className="h-6 w-6 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 inline-flex items-center justify-center"
                                        title="Copy live link"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : null
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                className={cn(
                                    "h-8 text-xs font-medium",
                                    "bg-emerald-600 hover:bg-emerald-500 text-white"
                                )}
                                onClick={onGoLive}
                                disabled={isTogglingLive}
                            >
                                {isTogglingLive && <span className="mr-1.5 h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />}
                                Go Live
                            </Button>
                        )
                    )}
                </div>
            </div>

            {/* Device frame */}
            <div className="relative shrink-0">
                {previewDevice === "desktop" ? (
                    <div className="flex flex-col items-center">
                        {/* Screen */}
                        <div
                            className={`${deviceConfig.width} ${deviceConfig.height} ${deviceConfig.radius} ${deviceConfig.border} border-zinc-900 dark:border-zinc-700 bg-background shadow-2xl overflow-hidden flex flex-col`}
                        >
                            {/* Top bezel with camera */}
                            <div className="h-8 bg-zinc-900 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                            </div>

                            {/* Scrollable content area */}
                            <div className="flex-1 overflow-y-auto bg-slate-50">
                                <ProgramView data={programData} variant="embedded" />
                            </div>
                        </div>

                        {/* Base */}
                        <div className="w-[980px] h-4 bg-zinc-900/90 rounded-b-[18px] shadow-xl mt-1" />
                        <div className="w-[220px] h-2 bg-zinc-800 rounded-b-[10px] -mt-1" />
                    </div>
                ) : (
                    <div
                        className={`${deviceConfig.width} ${deviceConfig.height} ${deviceConfig.radius} ${deviceConfig.border} border-zinc-900 dark:border-zinc-700 bg-background shadow-2xl overflow-hidden flex flex-col`}
                    >
                        {/* Status bar / notch area */}
                        <div className={`${deviceConfig.notchHeight} bg-background flex items-center justify-center shrink-0`}>
                            {previewDevice !== "tablet" && (
                                <div className={`${deviceConfig.notchWidth} h-[22px] bg-zinc-900 dark:bg-zinc-700 ${deviceConfig.notchRadius}`} />
                            )}
                        </div>

                        {/* Scrollable content area */}
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            <ProgramView data={programData} variant="embedded" />
                        </div>

                        {/* Home indicator */}
                        <div className="h-6 bg-background flex items-center justify-center shrink-0">
                            <div className="w-[120px] h-[4px] bg-zinc-300 dark:bg-zinc-600 rounded-full" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
