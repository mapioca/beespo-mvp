"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {ChevronDown, Loader2} from "lucide-react";
import {cn} from "@/lib/utils";
import {CanvasItem} from "./types";
import {ProgramView} from "../program/program-view";
import {canvasItemsToProgramItems, ProgramViewData} from "../program/types";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";
import {Switch} from "@/components/ui/switch";
import {
    type BodyScale,
    buildProgramStyleVars,
    type CardRadius,
    type ContentWidth,
    type DateFormat,
    type DividerStyle,
    filterProgramItems,
    type FontScale,
    getProgramContentWidthClass,
    type HeaderAlign,
    type LayoutDensity,
    normalizeProgramStyleSettings,
    type PresetKey,
    PROGRAM_STYLE_PRESETS,
    ProgramStyleSettings,
    type SectionSpacing,
    type SectionWeight,
    type TitleCase,
    type TitleWeight,
    type ViewStyle,
} from "../program/program-style";

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
    programStyle?: ProgramStyleSettings | null;
    onProgramStyleChange?: (style: ProgramStyleSettings) => void;
}

function ControlSelect<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    const current = options.find((option) => option.value === value);
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "inline-flex h-8 w-full items-center justify-between gap-2",
                        "rounded-full border border-control bg-control px-3",
                        "text-[12px] font-medium text-foreground",
                        "transition-colors hover:bg-control-hover",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    )}
                >
                    <span className="truncate">{current?.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-control" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {options.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onSelect={() => onChange(option.value)}
                        className={cn(option.value === value && "font-medium")}
                    >
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function ControlToggle<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T;
    onChange: (value: T) => void;
    options: Array<{ value: T; label: string }>;
}) {
    return (
        <div
            className={cn(
                "grid h-8 w-full grid-cols-2 gap-1 rounded-full",
                "border border-control bg-control p-0.5"
            )}
        >
            {options.map((option) => {
                const isActive = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "flex items-center justify-center rounded-full text-[11px] font-medium",
                            isActive
                                ? "border border-border/40 bg-foreground/90 text-background"
                                : "text-control"
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function SectionHeader({
    label,
    collapsed,
    onToggle,
}: {
    label: string;
    collapsed?: boolean;
    onToggle?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(
                "flex w-full items-center justify-between",
                "text-[11px] font-medium uppercase tracking-[0.1em] text-foreground/60",
                !onToggle && "cursor-default"
            )}
        >
            <span>{label}</span>
            {onToggle && (
                <ChevronDown
                    className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        collapsed ? "-rotate-90" : "rotate-0"
                    )}
                />
            )}
        </button>
    );
}

function ControlRow({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-8 items-center justify-between gap-4">
            <span className="w-[120px] whitespace-nowrap text-[11px] font-medium leading-none text-muted-foreground">
                {label}
            </span>
            <div className="w-[220px]">{children}</div>
        </div>
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
    programStyle,
    onProgramStyleChange,
}: ProgramModePaneProps) {
    const initialStyle = normalizeProgramStyleSettings(programStyle);
    const [fontScale, setFontScale] = useState<FontScale>(initialStyle.fontScale);
    const [bodyScale, setBodyScale] = useState<BodyScale>(initialStyle.bodyScale);
    const [density, setDensity] = useState<LayoutDensity>(initialStyle.density);
    const [headerAlign, setHeaderAlign] = useState<HeaderAlign>(initialStyle.headerAlign);
    const [showIcons, setShowIcons] = useState(initialStyle.showIcons);
    const [showSubtitles, setShowSubtitles] = useState(initialStyle.showSubtitles);
    const [viewStyle, setViewStyle] = useState<ViewStyle>(initialStyle.viewStyle);
    const [titleWeight, setTitleWeight] = useState<TitleWeight>(initialStyle.titleWeight);
    const [titleCase, setTitleCase] = useState<TitleCase>(initialStyle.titleCase);
    const [dateFormat, setDateFormat] = useState<DateFormat>(initialStyle.dateFormat);
    const [sectionWeight, setSectionWeight] = useState<SectionWeight>(initialStyle.sectionWeight);
    const [sectionSpacing, setSectionSpacing] = useState<SectionSpacing>(initialStyle.sectionSpacing);
    const [cardRadius, setCardRadius] = useState<CardRadius>(initialStyle.cardRadius);
    const [dividerStyle, setDividerStyle] = useState<DividerStyle>(initialStyle.dividerStyle);
    const [contentWidth, setContentWidth] = useState<ContentWidth>(initialStyle.contentWidth);
    const [showRoles, setShowRoles] = useState(initialStyle.showRoles);
    const [showSpeakerNames, setShowSpeakerNames] = useState(initialStyle.showSpeakerNames);
    const [showDurations, setShowDurations] = useState(initialStyle.showDurations);
    const [showAnnouncements, setShowAnnouncements] = useState(initialStyle.showAnnouncements);
    const [showBusiness, setShowBusiness] = useState(initialStyle.showBusiness);
    const [showDiscussions, setShowDiscussions] = useState(initialStyle.showDiscussions);
    const [showMeetingNotes, setShowMeetingNotes] = useState(initialStyle.showMeetingNotes);
    const [showFooter, setShowFooter] = useState(initialStyle.showFooter);
    const [presetKey, setPresetKey] = useState<PresetKey>(initialStyle.presetKey ?? "classic");
    const [collapsedSections, setCollapsedSections] = useState<Record<"type" | "layout" | "details" | "extras", boolean>>({
        type: false,
        layout: false,
        details: false,
        extras: true,
    });
    const [zoom, setZoom] = useState(1);
    const [hasUserZoomed, setHasUserZoomed] = useState(false);
    const [isSmallScreen, setIsSmallScreen] = useState(false);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const isApplyingPreset = useRef(false);
    const didInitializeFromProps = useRef(false);

    const currentStyle = useMemo<ProgramStyleSettings>(
        () => ({
            presetKey,
            fontScale,
            bodyScale,
            titleWeight,
            titleCase,
            dateFormat,
            headerAlign,
            density,
            viewStyle,
            sectionSpacing,
            cardRadius,
            dividerStyle,
            contentWidth,
            showSubtitles,
            showIcons,
            showRoles,
            showSpeakerNames,
            showDurations,
            showAnnouncements,
            showBusiness,
            showDiscussions,
            showMeetingNotes,
            showFooter,
        }),
        [
            presetKey,
            fontScale,
            bodyScale,
            titleWeight,
            titleCase,
            dateFormat,
            headerAlign,
            density,
            viewStyle,
            sectionSpacing,
            cardRadius,
            dividerStyle,
            contentWidth,
            showSubtitles,
            showIcons,
            showRoles,
            showSpeakerNames,
            showDurations,
            showAnnouncements,
            showBusiness,
            showDiscussions,
            showMeetingNotes,
            showFooter,
        ]
    );

    const normalizedStyle = useMemo(() => normalizeProgramStyleSettings(currentStyle), [currentStyle]);

    const programItems = useMemo(() => {
        const items = canvasItemsToProgramItems(canvasItems);
        return filterProgramItems(items, normalizedStyle);
    }, [canvasItems, normalizedStyle]);

    const onProgramStyleChangeRef = useRef<typeof onProgramStyleChange>(onProgramStyleChange);

    useEffect(() => {
        onProgramStyleChangeRef.current = onProgramStyleChange;
    }, [onProgramStyleChange]);

    useEffect(() => {
        if (!onProgramStyleChangeRef.current) return;
        onProgramStyleChangeRef.current(normalizedStyle);
    }, [normalizedStyle]);

    const programData: ProgramViewData = useMemo(
        () => ({
            title,
            date,
            time,
            unitName,
            roles: { presiding, conducting, chorister, pianistOrganist },
            items: programItems,
            meetingNotes,
        }),
        [title, date, time, unitName, presiding, conducting, chorister, pianistOrganist, meetingNotes, programItems]
    );

    const deviceConfig =
        previewDevice === "tablet"
            ? {
                  width: "w-[760px]",
                  height: "h-[960px]",
                  radius: "rounded-[28px]",
                  border: "border-[2px]",
                  contentRadius: "rounded-[24px]",
                  w: 760,
                  h: 960,
              }
            : previewDevice === "desktop"
              ? {
                    width: "w-[960px]",
                    height: "h-[700px]",
                    radius: "rounded-md",
                    border: "border",
                    contentRadius: "rounded-md",
                    w: 960,
                    h: 700,
                }
              : {
                    width: "w-[390px]",
                    height: "h-[844px]",
                    radius: "rounded-[32px]",
                    border: "border-[1.5px]",
                    contentRadius: "rounded-[28px]",
                    w: 390,
                    h: 844,
                };

    const clampZoom = (value: number) => Math.min(1.6, Math.max(0.6, value));

    const getDefaultZoom = useCallback(() => {
        if (previewDevice === "phone") return clampZoom(0.9);
        const target = isSmallScreen ? 0.6 : 1.6;
        return clampZoom(target);
    }, [isSmallScreen, previewDevice]);

    useEffect(() => {
        if (!programStyle || didInitializeFromProps.current) return;
        const normalized = normalizeProgramStyleSettings(programStyle);
        isApplyingPreset.current = true;
        setPresetKey(normalized.presetKey ?? "classic");
        setFontScale(normalized.fontScale);
        setBodyScale(normalized.bodyScale);
        setTitleWeight(normalized.titleWeight);
        setTitleCase(normalized.titleCase);
        setDateFormat(normalized.dateFormat);
        setHeaderAlign(normalized.headerAlign);
        setDensity(normalized.density);
        setViewStyle(normalized.viewStyle);
        setSectionSpacing(normalized.sectionSpacing);
        setCardRadius(normalized.cardRadius);
        setDividerStyle(normalized.dividerStyle);
        setContentWidth(normalized.contentWidth);
        setShowSubtitles(normalized.showSubtitles);
        setShowIcons(normalized.showIcons);
        setShowRoles(normalized.showRoles);
        setShowSpeakerNames(normalized.showSpeakerNames);
        setShowDurations(normalized.showDurations);
        setShowAnnouncements(normalized.showAnnouncements);
        setShowBusiness(normalized.showBusiness);
        setShowDiscussions(normalized.showDiscussions);
        setShowMeetingNotes(normalized.showMeetingNotes);
        setShowFooter(normalized.showFooter);
        isApplyingPreset.current = false;
        didInitializeFromProps.current = true;
    }, [programStyle]);

    const setWithPresetGuard = <T,>(setter: (value: T) => void) => (value: T) => {
        setter(value);
        if (!isApplyingPreset.current) {
            setPresetKey("custom");
        }
    };

    const applyPreset = (key: PresetKey) => {
        const preset = PROGRAM_STYLE_PRESETS[key];
        if (!preset) return;
        isApplyingPreset.current = true;
        setPresetKey(key);
        setFontScale(preset.fontScale);
        setBodyScale(preset.bodyScale);
        setTitleWeight(preset.titleWeight);
        setTitleCase(preset.titleCase);
        setDateFormat(preset.dateFormat);
        setHeaderAlign(preset.headerAlign);
        setDensity(preset.density);
        setViewStyle(preset.viewStyle);
        setSectionSpacing(preset.sectionSpacing);
        setCardRadius(preset.cardRadius);
        setDividerStyle(preset.dividerStyle);
        setContentWidth(preset.contentWidth);
        setShowSubtitles(preset.showSubtitles);
        setShowIcons(preset.showIcons);
        setShowRoles(preset.showRoles);
        setShowSpeakerNames(preset.showSpeakerNames);
        setShowDurations(preset.showDurations);
        setShowAnnouncements(preset.showAnnouncements);
        setShowBusiness(preset.showBusiness);
        setShowDiscussions(preset.showDiscussions);
        setShowMeetingNotes(preset.showMeetingNotes);
        setShowFooter(preset.showFooter);
        isApplyingPreset.current = false;
    };

    useEffect(() => {
        const mediaQuery = window.matchMedia("(max-width: 639px)");
        const update = () => setIsSmallScreen(mediaQuery.matches);
        update();
        mediaQuery.addEventListener("change", update);
        return () => mediaQuery.removeEventListener("change", update);
    }, []);

    useEffect(() => {
        setHasUserZoomed(false);
        const next = getDefaultZoom();
        setZoom(next);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [previewDevice, isSmallScreen, getDefaultZoom]);

    useEffect(() => {
        if (!stageRef.current) return;
        const observer = new ResizeObserver(() => {
            if (!hasUserZoomed) {
                setZoom(getDefaultZoom());
            }
        });
        observer.observe(stageRef.current);
        return () => observer.disconnect();
    }, [hasUserZoomed, isSmallScreen, getDefaultZoom]);

    const contentWidthClass = getProgramContentWidthClass(normalizedStyle);
    const vars = buildProgramStyleVars(normalizedStyle);

    return (
        <div className="flex-1 overflow-hidden bg-builder-canvas px-8 py-6">
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

            <div className="mx-auto grid h-full min-h-0 w-full max-w-[1280px] grid-cols-1 gap-8 xl:grid-cols-[var(--program-control-panel-width)_minmax(0,1fr)]">
                <aside className="h-full min-h-0">
                    <div className="flex h-full flex-col rounded-[14px] border border-[color:hsl(var(--program-control-panel-border))] bg-[color:hsl(var(--program-control-panel-bg))] p-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
                        <div className="text-[13px] font-semibold text-foreground">Layout & Style</div>
                        <div className="mt-3 h-px w-full bg-border/40" />

                        <div className="mt-4 flex min-h-0 flex-1 flex-col">
                            <div className="flex-1 divide-y divide-border/40 overflow-y-auto pr-1">
                                <div className="py-5">
                                    <SectionHeader label="Preset" />
                                    <div className="mt-3 space-y-3">
                                        <ControlRow label="Preset">
                                            <ControlSelect
                                                value={presetKey}
                                                onChange={(value) => {
                                                    const next = value as PresetKey;
                                                    if (next !== "custom") {
                                                        applyPreset(next);
                                                    } else {
                                                        setPresetKey("custom");
                                                    }
                                                }}
                                                options={[
                                                    { value: "classic", label: "Classic" },
                                                    { value: "minimal", label: "Minimal" },
                                                    { value: "bold", label: "Bold" },
                                                    { value: "custom", label: "Custom" },
                                                ]}
                                            />
                                        </ControlRow>
                                    </div>
                                </div>

                                <div className="py-5">
                                    <SectionHeader
                                        label="Type"
                                        collapsed={collapsedSections.type}
                                        onToggle={() =>
                                            setCollapsedSections((prev) => ({ ...prev, type: !prev.type }))
                                        }
                                    />
                                    {!collapsedSections.type && (
                                        <div className="mt-3 space-y-3">
                                            <ControlRow label="Font size">
                                                <ControlSelect
                                                    value={fontScale}
                                                    onChange={setWithPresetGuard(setFontScale)}
                                                    options={[
                                                        { value: "sm", label: "Small" },
                                                        { value: "md", label: "Default" },
                                                        { value: "lg", label: "Large" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Body size">
                                                <ControlSelect
                                                    value={bodyScale}
                                                    onChange={setWithPresetGuard(setBodyScale)}
                                                    options={[
                                                        { value: "sm", label: "Small" },
                                                        { value: "md", label: "Default" },
                                                        { value: "lg", label: "Large" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Title weight">
                                                <ControlSelect
                                                    value={titleWeight}
                                                    onChange={setWithPresetGuard(setTitleWeight)}
                                                    options={[
                                                        { value: "regular", label: "Regular" },
                                                        { value: "medium", label: "Medium" },
                                                        { value: "semibold", label: "Semibold" },
                                                        { value: "bold", label: "Bold" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Title case">
                                                <ControlSelect
                                                    value={titleCase}
                                                    onChange={setWithPresetGuard(setTitleCase)}
                                                    options={[
                                                        { value: "title", label: "Title case" },
                                                        { value: "uppercase", label: "Uppercase" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Date format">
                                                <ControlSelect
                                                    value={dateFormat}
                                                    onChange={setWithPresetGuard(setDateFormat)}
                                                    options={[
                                                        { value: "long", label: "Long" },
                                                        { value: "medium", label: "Medium" },
                                                        { value: "short", label: "Short" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Section weight">
                                                <ControlToggle
                                                    value={sectionWeight}
                                                    onChange={setWithPresetGuard(setSectionWeight)}
                                                    options={[
                                                        { value: "regular", label: "Regular" },
                                                        { value: "semibold", label: "Semibold" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Header align">
                                                <ControlToggle
                                                    value={headerAlign}
                                                    onChange={setWithPresetGuard(setHeaderAlign)}
                                                    options={[
                                                        { value: "left", label: "Left" },
                                                        { value: "center", label: "Center" },
                                                    ]}
                                                />
                                            </ControlRow>
                                        </div>
                                    )}
                                </div>

                                <div className="py-5">
                                    <SectionHeader
                                        label="Layout"
                                        collapsed={collapsedSections.layout}
                                        onToggle={() =>
                                            setCollapsedSections((prev) => ({ ...prev, layout: !prev.layout }))
                                        }
                                    />
                                    {!collapsedSections.layout && (
                                        <div className="mt-3 space-y-3">
                                            <ControlRow label="Density">
                                                <ControlToggle
                                                    value={density}
                                                    onChange={setWithPresetGuard(setDensity)}
                                                    options={[
                                                        { value: "comfortable", label: "Comfortable" },
                                                        { value: "compact", label: "Compact" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Item style">
                                                <ControlToggle
                                                    value={viewStyle}
                                                    onChange={setWithPresetGuard(setViewStyle)}
                                                    options={[
                                                        { value: "cards", label: "Soft cards" },
                                                        { value: "list", label: "Text list" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Section spacing">
                                                <ControlSelect
                                                    value={sectionSpacing}
                                                    onChange={setWithPresetGuard(setSectionSpacing)}
                                                    options={[
                                                        { value: "tight", label: "Tight" },
                                                        { value: "default", label: "Default" },
                                                        { value: "relaxed", label: "Relaxed" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Card radius">
                                                <ControlSelect
                                                    value={cardRadius}
                                                    onChange={setWithPresetGuard(setCardRadius)}
                                                    options={[
                                                        { value: "soft", label: "Soft" },
                                                        { value: "medium", label: "Medium" },
                                                        { value: "square", label: "Square" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Divider style">
                                                <ControlSelect
                                                    value={dividerStyle}
                                                    onChange={setWithPresetGuard(setDividerStyle)}
                                                    options={[
                                                        { value: "none", label: "None" },
                                                        { value: "subtle", label: "Subtle" },
                                                        { value: "strong", label: "Strong" },
                                                    ]}
                                                />
                                            </ControlRow>
                                            <ControlRow label="Content width">
                                                <ControlSelect
                                                    value={contentWidth}
                                                    onChange={setWithPresetGuard(setContentWidth)}
                                                    options={[
                                                        { value: "narrow", label: "Narrow" },
                                                        { value: "default", label: "Default" },
                                                        { value: "wide", label: "Wide" },
                                                    ]}
                                                />
                                            </ControlRow>
                                        </div>
                                    )}
                                </div>

                                <div className="py-5">
                                    <SectionHeader
                                        label="Details"
                                        collapsed={collapsedSections.details}
                                        onToggle={() =>
                                            setCollapsedSections((prev) => ({ ...prev, details: !prev.details }))
                                        }
                                    />
                                    {!collapsedSections.details && (
                                        <div className="mt-3 space-y-3">
                                            <ControlRow label="Subtitles">
                                                <Switch
                                                    checked={showSubtitles}
                                                    onCheckedChange={(v) => {
                                                        setShowSubtitles(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Icons">
                                                <Switch
                                                    checked={showIcons}
                                                    onCheckedChange={(v) => {
                                                        setShowIcons(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Roles">
                                                <Switch
                                                    checked={showRoles}
                                                    onCheckedChange={(v) => {
                                                        setShowRoles(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Speaker names">
                                                <Switch
                                                    checked={showSpeakerNames}
                                                    onCheckedChange={(v) => {
                                                        setShowSpeakerNames(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Durations">
                                                <Switch
                                                    checked={showDurations}
                                                    onCheckedChange={(v) => {
                                                        setShowDurations(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Announcements">
                                                <Switch
                                                    checked={showAnnouncements}
                                                    onCheckedChange={(v) => {
                                                        setShowAnnouncements(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Business items">
                                                <Switch
                                                    checked={showBusiness}
                                                    onCheckedChange={(v) => {
                                                        setShowBusiness(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Discussions">
                                                <Switch
                                                    checked={showDiscussions}
                                                    onCheckedChange={(v) => {
                                                        setShowDiscussions(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                        </div>
                                    )}
                                </div>

                                <div className="py-5">
                                    <SectionHeader
                                        label="Extras"
                                        collapsed={collapsedSections.extras}
                                        onToggle={() =>
                                            setCollapsedSections((prev) => ({ ...prev, extras: !prev.extras }))
                                        }
                                    />
                                    {!collapsedSections.extras && (
                                        <div className="mt-3 space-y-3">
                                            <ControlRow label="Meeting notes">
                                                <Switch
                                                    checked={showMeetingNotes}
                                                    onCheckedChange={(v) => {
                                                        setShowMeetingNotes(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                            <ControlRow label="Footer note">
                                                <Switch
                                                    checked={showFooter}
                                                    onCheckedChange={(v) => {
                                                        setShowFooter(v);
                                                        if (!isApplyingPreset.current) setPresetKey("custom");
                                                    }}
                                                    className="border border-control data-[state=checked]:bg-foreground data-[state=unchecked]:bg-control"
                                                />
                                            </ControlRow>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-auto pt-4">
                            <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                                Preview settings — more options coming soon.
                            </div>
                        </div>
                    </div>
                </aside>

                <section className="min-h-0 overflow-hidden rounded-none bg-transparent p-0 sm:rounded-[14px] sm:bg-panel sm:p-3">
                    <div
                        ref={stageRef}
                        className="relative flex h-full items-start justify-center overflow-auto rounded-none bg-transparent p-0 sm:rounded-[16px] sm:bg-panel sm:p-3"
                        style={vars}
                        onWheel={(event) => {
                            if (!event.ctrlKey && !event.metaKey) return;
                            event.preventDefault();
                            const next = clampZoom(zoom - event.deltaY * 0.0015);
                            setZoom(next);
                            setHasUserZoomed(true);
                        }}
                    >
                        <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-control bg-control px-2 py-1 text-[11px] text-control shadow-sm">
                            <button
                                type="button"
                                onClick={() => {
                                    setZoom((prev) => {
                                        return clampZoom(prev - 0.1);
                                    });
                                    setHasUserZoomed(true);
                                }}
                                className="rounded-full px-2 py-0.5 text-[12px] text-foreground hover:bg-control-hover"
                                aria-label="Zoom out"
                            >
                                −
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = getDefaultZoom();
                                    setZoom(next);
                                    setHasUserZoomed(false);
                                }}
                                className="rounded-full px-2 py-0.5 text-[11px] text-control hover:bg-control-hover"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setZoom((prev) => {
                                        return clampZoom(prev + 0.1);
                                    });
                                    setHasUserZoomed(true);
                                }}
                                className="rounded-full px-2 py-0.5 text-[12px] text-foreground hover:bg-control-hover"
                                aria-label="Zoom in"
                            >
                                +
                            </button>
                        </div>
                        <div
                            className={cn(
                                deviceConfig.width,
                                deviceConfig.height,
                                deviceConfig.radius,
                                deviceConfig.border,
                                previewDevice === "desktop"
                                    ? "border-border/40 bg-paper shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
                                    : "border-[color:var(--program-frame-border)] bg-[color:var(--program-frame-shell)] shadow-[var(--program-preview-frame-shadow)]"
                            )}
                            style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
                        >
                            {previewDevice === "desktop" ? (
                                <div className={cn("h-full overflow-y-auto bg-paper p-12 sm:p-16", deviceConfig.contentRadius)}>
                                    <ProgramView
                                        data={programData}
                                        variant="embedded"
                                        density={density}
                                        viewStyle={viewStyle}
                                        showDivider
                                        showRoles={showRoles}
                                        showFooter={showFooter}
                                        showMeetingNotes={showMeetingNotes}
                                        showSpeakerNames={showSpeakerNames}
                                        showDurations={showDurations}
                                        showIcons={showIcons}
                                        dateFormat={dateFormat}
                                        titleCase={titleCase}
                                        className={contentWidthClass}
                                    />
                                </div>
                            ) : (
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
                                            showRoles={showRoles}
                                            showFooter={showFooter}
                                            showMeetingNotes={showMeetingNotes}
                                            showSpeakerNames={showSpeakerNames}
                                            showDurations={showDurations}
                                            showIcons={showIcons}
                                            dateFormat={dateFormat}
                                            titleCase={titleCase}
                                            className={contentWidthClass}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
