"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasItem } from "./types";
import { ProgramView } from "../program/program-view";
import { canvasItemsToProgramItems, ProgramViewData } from "../program/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    previewDevice: "phone" | "tablet" | "desktop";
    onGoLive?: () => void;
}

type FontScale = "sm" | "md" | "lg";
type LayoutDensity = "comfortable" | "compact";
type HeaderAlign = "left" | "center";

const FONT_SCALE = {
    sm: {
        base: "14px",
        title: "1.78rem",
    },
    md: {
        base: "15px",
        title: "1.9rem",
    },
    lg: {
        base: "16px",
        title: "2.04rem",
    },
} as const;

const DENSITY = {
    comfortable: {
        sectionGap: "24px",
        itemGap: "12px",
        cardPaddingX: "16px",
        cardPaddingY: "14px",
        rootPadding: "px-7 py-9",
    },
    compact: {
        sectionGap: "20px",
        itemGap: "10px",
        cardPaddingX: "14px",
        cardPaddingY: "12px",
        rootPadding: "px-6 py-8",
    },
} as const;

function SegmentedControl<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <div className="inline-flex w-full rounded-full border border-border/80 bg-background p-1">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "h-8 flex-1 rounded-full text-[12px] font-medium transition-colors",
                        value === option.value
                            ? "bg-[#111317] text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.16)]"
                            : "text-[#6d727a] hover:text-[#111317]"
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function ToggleRow({
    label,
    enabled,
    onToggle,
}: {
    label: string;
    enabled: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "inline-flex h-9 w-full items-center justify-between rounded-xl border px-3 text-[12px] font-medium transition-colors",
                enabled
                    ? "border-[#111317]/20 bg-[#111317]/5 text-[#111317]"
                    : "border-border/80 bg-background text-[#6d727a] hover:text-[#111317]"
            )}
        >
            <span>{label}</span>
            <span className="text-[11px]">{enabled ? "On" : "Off"}</span>
        </button>
    );
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
    previewDevice,
    onGoLive,
}: ProgramModePaneProps) {
    const [fontScale, setFontScale] = useState<FontScale>("md");
    const [density, setDensity] = useState<LayoutDensity>("comfortable");
    const [headerAlign, setHeaderAlign] = useState<HeaderAlign>("center");
    const [showIcons, setShowIcons] = useState(true);
    const [showSubtitles, setShowSubtitles] = useState(true);

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

    const deviceConfig =
        previewDevice === "tablet"
            ? {
                  width: "w-[760px]",
                  height: "h-[960px]",
                  radius: "rounded-[30px]",
                  border: "border-[8px]",
              }
            : previewDevice === "desktop"
              ? {
                    width: "w-[960px]",
                    height: "h-[700px]",
                    radius: "rounded-[20px]",
                    border: "border-[6px]",
                }
              : {
                    width: "w-[390px]",
                    height: "h-[844px]",
                    radius: "rounded-[36px]",
                    border: "border-[6px]",
                };

    const vars = {
        "--program-text": "hsl(0 0% 8%)",
        "--program-muted": "hsl(0 0% 30%)",
        "--program-subtle": "hsl(0 0% 44%)",
        "--program-border": "hsl(0 0% 86%)",
        "--program-card": "hsl(0 0% 100%)",
        "--program-soft": "hsl(0 0% 96%)",
        "--program-pill": "hsl(0 0% 97%)",
        "--program-pill-text": "hsl(0 0% 22%)",
        "--program-surface": "hsl(0 0% 99%)",
        "--program-radius": "12px",
        "--program-card-border": "hsl(0 0% 86%)",
        "--program-card-shadow": "none",
        "--program-section-gap": DENSITY[density].sectionGap,
        "--program-item-gap": DENSITY[density].itemGap,
        "--program-header-align": headerAlign,
        "--program-header-justify": headerAlign === "left" ? "flex-start" : "center",
        "--program-icon-bg": "hsl(0 0% 95%)",
        "--program-icon-border": "hsl(0 0% 84%)",
        "--program-title-weight": "600",
        "--program-title-size": FONT_SCALE[fontScale].title,
        "--program-title-margin-inline": headerAlign === "left" ? "0" : "auto",
        "--program-pill-bg": "hsl(0 0% 97%)",
        "--program-pill-border": "hsl(0 0% 84%)",
        "--program-card-padding-x": DENSITY[density].cardPaddingX,
        "--program-card-padding-y": DENSITY[density].cardPaddingY,
        "--program-icon-size": "0.95rem",
        "--program-icon-box": "1.75rem",
        "--program-border-width": "1px",
        "--program-line-height": "1.4",
        "--program-section-case": "uppercase",
        "--program-section-title-size": "0.78em",
        "--program-section-radius": "10px",
        "--program-subtitle-display": showSubtitles ? "block" : "none",
        "--program-card-border-style": "solid",
        "--program-divider-style": "solid",
        "--program-divider-weight": "1px",
        "--program-icons-display": showIcons ? "flex" : "none",
        fontSize: FONT_SCALE[fontScale].base,
    } as CSSProperties;

    return (
        <div className="flex-1 overflow-hidden bg-[#f0f1f3] px-6 py-6">
            {isLeader && !isLive && (
                <div className="mx-auto mb-5 flex w-full max-w-[1280px] justify-end">
                    <button
                        type="button"
                        onClick={onGoLive}
                        disabled={isTogglingLive}
                        className={cn(
                            "inline-flex h-9 items-center gap-2 rounded-full border border-foreground/15 bg-foreground px-4 text-[12px] font-medium text-background",
                            "transition-colors hover:bg-foreground/90",
                            "disabled:pointer-events-none disabled:opacity-70"
                        )}
                    >
                        {isTogglingLive && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Go Live
                    </button>
                </div>
            )}

            <div className="mx-auto grid h-full min-h-0 w-full max-w-[1280px] grid-cols-1 gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="h-full min-h-0">
                    <div className="flex h-full flex-col rounded-[14px] border border-[#e4e5e7] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.05)]">
                        <div className="text-[13px] font-semibold text-foreground">Program Styles</div>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                            Keep this minimal. Focus on readability first.
                        </p>

                        <Tabs defaultValue="type" className="mt-4 flex min-h-0 flex-1 flex-col">
                            <TabsList className="grid h-9 grid-cols-3 rounded-full border border-[#e3e4e7] bg-[#f8f8f8] p-1">
                                <TabsTrigger value="type" className="rounded-full text-[12px]">Type</TabsTrigger>
                                <TabsTrigger value="layout" className="rounded-full text-[12px]">Layout</TabsTrigger>
                                <TabsTrigger value="details" className="rounded-full text-[12px]">Details</TabsTrigger>
                            </TabsList>

                            <TabsContent value="type" className="mt-4 space-y-4 overflow-y-auto pr-1">
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a7f87]">Font size</div>
                                    <SegmentedControl
                                        value={fontScale}
                                        onChange={setFontScale}
                                        options={[
                                            { value: "sm", label: "Small" },
                                            { value: "md", label: "Default" },
                                            { value: "lg", label: "Large" },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a7f87]">Header align</div>
                                    <SegmentedControl
                                        value={headerAlign}
                                        onChange={setHeaderAlign}
                                        options={[
                                            { value: "left", label: "Left" },
                                            { value: "center", label: "Center" },
                                        ]}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="layout" className="mt-4 space-y-4 overflow-y-auto pr-1">
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a7f87]">Density</div>
                                    <SegmentedControl
                                        value={density}
                                        onChange={setDensity}
                                        options={[
                                            { value: "comfortable", label: "Comfortable" },
                                            { value: "compact", label: "Compact" },
                                        ]}
                                    />
                                </div>
                                <div className="rounded-xl border border-[#e4e5e7] bg-[#f8f8f8] p-3 text-[12px] text-[#6d727a]">
                                    Uses an 8pt spacing system and consistent 1px borders for a cleaner hierarchy.
                                </div>
                            </TabsContent>

                            <TabsContent value="details" className="mt-4 space-y-3 overflow-y-auto pr-1">
                                <ToggleRow label="Show subtitles" enabled={showSubtitles} onToggle={() => setShowSubtitles((v) => !v)} />
                                <ToggleRow label="Show icons" enabled={showIcons} onToggle={() => setShowIcons((v) => !v)} />
                            </TabsContent>
                        </Tabs>
                    </div>
                </aside>

                <section className="min-h-0 overflow-hidden rounded-[14px] border border-[#e4e5e7] bg-white p-6 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]">
                    <div className="flex h-full items-start justify-center overflow-auto rounded-[16px] bg-[#f7f7f8] p-6" style={vars}>
                        <div
                            className={cn(
                                deviceConfig.width,
                                deviceConfig.height,
                                deviceConfig.radius,
                                deviceConfig.border,
                                "border-[color:var(--program-border)] bg-[color:var(--program-surface)] shadow-[0_1px_1px_rgba(16,24,40,0.06)]"
                            )}
                        >
                            <div className={cn("h-full overflow-y-auto", DENSITY[density].rootPadding)}>
                                <ProgramView
                                    data={programData}
                                    variant="embedded"
                                    density={density}
                                    showDivider
                                    className="max-w-[640px]"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
