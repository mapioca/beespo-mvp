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
type ViewStyle = "cards" | "list";

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
        sectionGap: "20px",
        itemGap: "8px",
        cardPaddingX: "14px",
        cardPaddingY: "12px",
    },
    compact: {
        sectionGap: "18px",
        itemGap: "6px",
        cardPaddingX: "12px",
        cardPaddingY: "10px",
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
                            ? "bg-[color:hsl(var(--program-control-emphasis))] text-[color:hsl(var(--program-control-emphasis-foreground))] shadow-[inset_0_0_0_1px_hsl(var(--program-control-emphasis-ring)/0.24)]"
                            : "text-[color:hsl(var(--program-control-text))] hover:text-[color:hsl(var(--program-control-emphasis))]"
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
                    ? "border-[color:hsl(var(--program-control-emphasis)/0.2)] bg-[color:hsl(var(--program-control-emphasis)/0.05)] text-[color:hsl(var(--program-control-emphasis))]"
                    : "border-border/80 bg-background text-[color:hsl(var(--program-control-text))] hover:text-[color:hsl(var(--program-control-emphasis))]"
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
    const [viewStyle, setViewStyle] = useState<ViewStyle>("cards");

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
                  radius: "rounded-[28px]",
                  border: "border-[2px]",
                  contentRadius: "rounded-[24px]",
              }
            : previewDevice === "desktop"
              ? {
                    width: "w-[960px]",
                    height: "h-[700px]",
                    radius: "rounded-[18px]",
                    border: "border-[1px]",
                    contentRadius: "rounded-[14px]",
                }
              : {
                    width: "w-[390px]",
                    height: "h-[844px]",
                    radius: "rounded-[32px]",
                    border: "border-[1.5px]",
                    contentRadius: "rounded-[28px]",
                };

    const vars = {
        "--program-text": "hsl(var(--program-preview-text))",
        "--program-muted": "hsl(var(--program-preview-muted))",
        "--program-subtle": "hsl(var(--program-preview-subtle))",
        "--program-border":
            viewStyle === "list"
                ? "hsl(var(--program-preview-list-divider))"
                : "hsl(var(--program-preview-card-border))",
        "--program-card": "hsl(var(--program-preview-card-bg))",
        "--program-soft": "hsl(var(--program-control-soft))",
        "--program-pill": "hsl(var(--program-preview-pill-bg))",
        "--program-pill-text": "hsl(var(--program-preview-pill-text))",
        "--program-surface": "hsl(var(--program-preview-surface))",
        "--program-frame-shell": "hsl(var(--program-preview-frame-shell))",
        "--program-frame-border": "hsl(var(--program-preview-frame-border))",
        "--program-radius": "12px",
        "--program-card-border": "hsl(var(--program-preview-card-border))",
        "--program-card-shadow": "var(--program-preview-card-shadow)",
        "--program-section-gap": DENSITY[density].sectionGap,
        "--program-item-gap": DENSITY[density].itemGap,
        "--program-header-align": headerAlign,
        "--program-header-justify": headerAlign === "left" ? "flex-start" : "center",
        "--program-icon-bg": "hsl(var(--program-preview-icon-bg))",
        "--program-icon-border": "hsl(var(--program-preview-icon-border))",
        "--program-title-weight": "600",
        "--program-title-size": FONT_SCALE[fontScale].title,
        "--program-title-margin-inline": headerAlign === "left" ? "0" : "auto",
        "--program-pill-bg": "hsl(var(--program-preview-pill-bg))",
        "--program-pill-border": "hsl(var(--program-preview-pill-border))",
        "--program-card-padding-x": DENSITY[density].cardPaddingX,
        "--program-card-padding-y": DENSITY[density].cardPaddingY,
        "--program-icon-size": "0.95rem",
        "--program-icon-box": "1.75rem",
        "--program-border-width": "1px",
        "--program-line-height": "1.4",
        "--program-section-case": "uppercase",
        "--program-section-title-size": "0.74em",
        "--program-section-radius": "10px",
        "--program-subtitle-display": showSubtitles ? "block" : "none",
        "--program-card-border-style": "solid",
        "--program-divider-style": "solid",
        "--program-divider-weight": "1px",
        "--program-icons-display": showIcons ? "flex" : "none",
        "--program-list-divider": "hsl(var(--program-preview-list-divider))",
        "--program-header-tracking": "var(--program-preview-header-tracking)",
        "--program-title-max-width": "var(--program-preview-title-max-width)",
        "--program-pill-padding": "var(--program-preview-pill-padding)",
        fontSize: FONT_SCALE[fontScale].base,
    } as CSSProperties;

    return (
        <div className="flex-1 overflow-hidden bg-builder-canvas px-6 py-6">
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
                    <div className="flex h-full flex-col rounded-[14px] border border-[color:hsl(var(--program-control-panel-border))] bg-[color:hsl(var(--program-control-panel-bg))] p-5 shadow-[var(--shadow-program-panel)]">
                        <div className="text-[13px] font-semibold text-foreground">Program Styles</div>
                        <p className="mt-1 text-[12px] text-muted-foreground">
                            Keep this minimal. Focus on readability first.
                        </p>

                        <Tabs defaultValue="type" className="mt-4 flex min-h-0 flex-1 flex-col">
                            <TabsList className="grid h-9 grid-cols-3 rounded-full border border-[color:hsl(var(--program-control-tabs-border))] bg-[color:hsl(var(--program-control-tabs-bg))] p-1">
                                <TabsTrigger value="type" className="rounded-full text-[12px]">Type</TabsTrigger>
                                <TabsTrigger value="layout" className="rounded-full text-[12px]">Layout</TabsTrigger>
                                <TabsTrigger value="details" className="rounded-full text-[12px]">Details</TabsTrigger>
                            </TabsList>

                            <TabsContent value="type" className="mt-4 space-y-4 overflow-y-auto pr-1">
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:hsl(var(--program-control-label))]">Font size</div>
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
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:hsl(var(--program-control-label))]">Header align</div>
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
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:hsl(var(--program-control-label))]">Density</div>
                                    <SegmentedControl
                                        value={density}
                                        onChange={setDensity}
                                        options={[
                                            { value: "comfortable", label: "Comfortable" },
                                            { value: "compact", label: "Compact" },
                                        ]}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:hsl(var(--program-control-label))]">Item style</div>
                                    <SegmentedControl
                                        value={viewStyle}
                                        onChange={setViewStyle}
                                        options={[
                                            { value: "cards", label: "Soft cards" },
                                            { value: "list", label: "Text list" },
                                        ]}
                                    />
                                </div>
                                <div className="rounded-xl border border-[color:hsl(var(--program-control-tabs-border))] bg-[color:hsl(var(--program-control-tabs-bg))] p-3 text-[12px] text-[color:hsl(var(--program-control-text))]">
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

                <section className="min-h-0 overflow-hidden rounded-[14px] bg-[color:hsl(var(--program-preview-panel-bg))] p-4">
                    <div className="flex h-full items-start justify-center overflow-auto rounded-[16px] bg-[color:hsl(var(--program-preview-stage-bg))] p-4" style={vars}>
                        <div
                            className={cn(
                                deviceConfig.width,
                                deviceConfig.height,
                                deviceConfig.radius,
                                deviceConfig.border,
                                "border-[color:var(--program-frame-border)] bg-[color:var(--program-frame-shell)] shadow-[var(--program-preview-frame-shadow)]"
                            )}
                        >
                            <div className="h-full p-1.5">
                                <div
                                    className={cn("h-full overflow-y-auto", deviceConfig.contentRadius)}
                                    style={{
                                        background: "var(--program-surface)",
                                        boxShadow: "var(--shadow-program-content-inset)",
                                        padding: "var(--program-preview-content-padding)",
                                    }}
                                >
                                    <ProgramView
                                        data={programData}
                                        variant="embedded"
                                        density={density}
                                        viewStyle={viewStyle}
                                        showDivider
                                        className="max-w-[640px]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
