import type { CSSProperties } from "react";
import type { ProgramItem } from "./types";

export type FontScale = "sm" | "md" | "lg";
export type BodyScale = "sm" | "md" | "lg";
export type LayoutDensity = "comfortable" | "compact";
export type HeaderAlign = "left" | "center";
export type ViewStyle = "cards" | "list";
export type TitleWeight = "regular" | "medium" | "semibold" | "bold";
export type TitleCase = "title" | "sentence" | "uppercase";
export type DateFormat = "long" | "medium" | "short";
export type SectionWeight = "regular" | "semibold";
export type SectionSpacing = "tight" | "default" | "relaxed";
export type CardRadius = "soft" | "medium" | "square";
export type DividerStyle = "none" | "subtle" | "strong";
export type ContentWidth = "narrow" | "default" | "wide";
export type PresetKey = "classic" | "minimal" | "bold" | "custom";

export interface ProgramStyleSettings {
    presetKey?: PresetKey;
    fontScale?: FontScale;
    bodyScale?: BodyScale;
    titleWeight?: TitleWeight;
    titleCase?: TitleCase;
    dateFormat?: DateFormat;
    headerAlign?: HeaderAlign;
    density?: LayoutDensity;
    viewStyle?: ViewStyle;
    sectionWeight?: SectionWeight;
    sectionSpacing?: SectionSpacing;
    cardRadius?: CardRadius;
    dividerStyle?: DividerStyle;
    contentWidth?: ContentWidth;
    showSubtitles?: boolean;
    showIcons?: boolean;
    showRoles?: boolean;
    showSpeakerNames?: boolean;
    showDurations?: boolean;
    showAnnouncements?: boolean;
    showMeetingNotes?: boolean;
    showFooter?: boolean;
    showPageNumbers?: boolean;
    showQrCode?: boolean;
}

export const FONT_SCALE = {
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

export const BODY_SCALE = {
    sm: "13px",
    md: "15px",
    lg: "17px",
} as const;

export const TITLE_WEIGHT = {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
} as const;

export const SECTION_WEIGHT = {
    regular: 500,
    semibold: 600,
} as const;

export const DENSITY = {
    comfortable: {
        sectionGap: "20px",
        itemGap: "8px",
        cardPaddingX: "12px",
        cardPaddingY: "10px",
    },
    compact: {
        sectionGap: "18px",
        itemGap: "6px",
        cardPaddingX: "10px",
        cardPaddingY: "8px",
    },
} as const;

export const SECTION_SPACING = {
    tight: -4,
    default: 0,
    relaxed: 4,
} as const;

export const CARD_RADIUS = {
    soft: "12px",
    medium: "9px",
    square: "6px",
} as const;

export const DIVIDER_STYLE = {
    none: { style: "none", weight: "0px" },
    subtle: { style: "solid", weight: "1px" },
    strong: { style: "solid", weight: "2px" },
} as const;

export const CONTENT_WIDTH = {
    narrow: "max-w-[560px]",
    default: "max-w-[640px]",
    wide: "max-w-[720px]",
} as const;

export const PROGRAM_STYLE_PRESETS: Record<PresetKey, Required<ProgramStyleSettings>> = {
    classic: {
        presetKey: "classic",
        fontScale: "md",
        bodyScale: "md",
        titleWeight: "semibold",
        titleCase: "title",
        dateFormat: "long",
        headerAlign: "center",
        density: "comfortable",
        viewStyle: "cards",
        sectionWeight: "semibold",
        sectionSpacing: "default",
        cardRadius: "soft",
        dividerStyle: "subtle",
        contentWidth: "default",
        showSubtitles: true,
        showIcons: true,
        showRoles: true,
        showSpeakerNames: true,
        showDurations: true,
        showAnnouncements: true,
        showMeetingNotes: false,
        showFooter: true,
        showPageNumbers: false,
        showQrCode: false,
    },
    minimal: {
        presetKey: "minimal",
        fontScale: "md",
        bodyScale: "sm",
        titleWeight: "medium",
        titleCase: "sentence",
        dateFormat: "medium",
        headerAlign: "left",
        density: "compact",
        viewStyle: "list",
        sectionWeight: "regular",
        sectionSpacing: "tight",
        cardRadius: "square",
        dividerStyle: "none",
        contentWidth: "narrow",
        showSubtitles: false,
        showIcons: false,
        showRoles: false,
        showSpeakerNames: false,
        showDurations: false,
        showAnnouncements: true,
        showMeetingNotes: false,
        showFooter: true,
        showPageNumbers: false,
        showQrCode: false,
    },
    bold: {
        presetKey: "bold",
        fontScale: "lg",
        bodyScale: "lg",
        titleWeight: "bold",
        titleCase: "uppercase",
        dateFormat: "long",
        headerAlign: "center",
        density: "comfortable",
        viewStyle: "cards",
        sectionWeight: "semibold",
        sectionSpacing: "relaxed",
        cardRadius: "medium",
        dividerStyle: "strong",
        contentWidth: "wide",
        showSubtitles: true,
        showIcons: true,
        showRoles: true,
        showSpeakerNames: true,
        showDurations: true,
        showAnnouncements: true,
        showMeetingNotes: false,
        showFooter: true,
        showPageNumbers: false,
        showQrCode: false,
    },
    custom: {
        presetKey: "custom",
        fontScale: "md",
        bodyScale: "md",
        titleWeight: "semibold",
        titleCase: "title",
        dateFormat: "long",
        headerAlign: "center",
        density: "comfortable",
        viewStyle: "cards",
        sectionWeight: "semibold",
        sectionSpacing: "default",
        cardRadius: "soft",
        dividerStyle: "subtle",
        contentWidth: "default",
        showSubtitles: true,
        showIcons: true,
        showRoles: true,
        showSpeakerNames: true,
        showDurations: true,
        showAnnouncements: true,
        showMeetingNotes: false,
        showFooter: true,
        showPageNumbers: false,
        showQrCode: false,
    },
};

export function normalizeProgramStyleSettings(raw?: ProgramStyleSettings | null): Required<ProgramStyleSettings> {
    const base = PROGRAM_STYLE_PRESETS.classic;
    return {
        presetKey: raw?.presetKey ?? base.presetKey,
        fontScale: raw?.fontScale ?? base.fontScale,
        bodyScale: raw?.bodyScale ?? base.bodyScale,
        titleWeight: raw?.titleWeight ?? base.titleWeight,
        titleCase: raw?.titleCase ?? base.titleCase,
        dateFormat: raw?.dateFormat ?? base.dateFormat,
        headerAlign: raw?.headerAlign ?? base.headerAlign,
        density: raw?.density ?? base.density,
        viewStyle: raw?.viewStyle ?? base.viewStyle,
        sectionWeight: raw?.sectionWeight ?? base.sectionWeight,
        sectionSpacing: raw?.sectionSpacing ?? base.sectionSpacing,
        cardRadius: raw?.cardRadius ?? base.cardRadius,
        dividerStyle: raw?.dividerStyle ?? base.dividerStyle,
        contentWidth: raw?.contentWidth ?? base.contentWidth,
        showSubtitles: typeof raw?.showSubtitles === "boolean" ? raw.showSubtitles : base.showSubtitles,
        showIcons: typeof raw?.showIcons === "boolean" ? raw.showIcons : base.showIcons,
        showRoles: typeof raw?.showRoles === "boolean" ? raw.showRoles : base.showRoles,
        showSpeakerNames: typeof raw?.showSpeakerNames === "boolean" ? raw.showSpeakerNames : base.showSpeakerNames,
        showDurations: typeof raw?.showDurations === "boolean" ? raw.showDurations : base.showDurations,
        showAnnouncements: typeof raw?.showAnnouncements === "boolean" ? raw.showAnnouncements : base.showAnnouncements,
        showMeetingNotes: typeof raw?.showMeetingNotes === "boolean" ? raw.showMeetingNotes : base.showMeetingNotes,
        showFooter: typeof raw?.showFooter === "boolean" ? raw.showFooter : base.showFooter,
        showPageNumbers: typeof raw?.showPageNumbers === "boolean" ? raw.showPageNumbers : base.showPageNumbers,
        showQrCode: typeof raw?.showQrCode === "boolean" ? raw.showQrCode : base.showQrCode,
    };
}

export function buildProgramStyleVars(settings: Required<ProgramStyleSettings>): CSSProperties {
    const sectionGapValue = `${Math.max(
        8,
        parseFloat(DENSITY[settings.density].sectionGap) + SECTION_SPACING[settings.sectionSpacing]
    )}px`;
    const dividerConfig = DIVIDER_STYLE[settings.dividerStyle] ?? DIVIDER_STYLE.subtle;

    return {
        "--program-text": "hsl(var(--program-preview-text))",
        "--program-muted": "hsl(var(--program-preview-muted))",
        "--program-subtle": "hsl(var(--program-preview-subtle))",
        "--program-border":
            settings.viewStyle === "list"
                ? "hsl(var(--program-preview-list-divider))"
                : "hsl(var(--program-preview-card-border))",
        "--program-card": "hsl(var(--program-preview-card-bg))",
        "--program-soft": "hsl(var(--program-control-soft))",
        "--program-pill": "hsl(var(--program-preview-pill-bg))",
        "--program-pill-text": "hsl(var(--program-preview-pill-text))",
        "--program-surface": "hsl(var(--program-preview-surface))",
        "--program-frame-shell": "hsl(var(--program-preview-frame-shell))",
        "--program-frame-border": "hsl(var(--program-preview-frame-border))",
        "--program-radius": CARD_RADIUS[settings.cardRadius],
        "--program-card-border": "hsl(var(--program-preview-card-border))",
        "--program-card-shadow": "var(--program-preview-card-shadow)",
        "--program-section-gap": sectionGapValue,
        "--program-item-gap": DENSITY[settings.density].itemGap,
        "--program-header-align": settings.headerAlign,
        "--program-header-justify": settings.headerAlign === "left" ? "flex-start" : "center",
        "--program-icon-bg": "hsl(var(--program-preview-icon-bg))",
        "--program-icon-border": "hsl(var(--program-preview-icon-border))",
        "--program-title-weight": String(TITLE_WEIGHT[settings.titleWeight]),
        "--program-title-size": FONT_SCALE[settings.fontScale].title,
        "--program-title-margin-inline": settings.headerAlign === "left" ? "0" : "auto",
        "--program-pill-bg": "hsl(var(--program-preview-pill-bg))",
        "--program-pill-border": "hsl(var(--program-preview-pill-border))",
        "--program-card-padding-x": DENSITY[settings.density].cardPaddingX,
        "--program-card-padding-y": DENSITY[settings.density].cardPaddingY,
        "--program-icon-size": "0.9rem",
        "--program-icon-box": "1.625rem",
        "--program-border-width": "1px",
        "--program-line-height": "1.4",
        "--program-section-case": "uppercase",
        "--program-section-title-size": "0.74em",
        "--program-section-radius": CARD_RADIUS[settings.cardRadius],
        "--program-section-weight": String(SECTION_WEIGHT[settings.sectionWeight]),
        "--program-item-weight": String(settings.sectionWeight === "semibold" ? 600 : 500),
        "--program-subtitle-display": settings.showSubtitles ? "block" : "none",
        "--program-card-border-style": "solid",
        "--program-divider-style": dividerConfig.style,
        "--program-divider-weight": dividerConfig.weight,
        "--program-icons-display": settings.showIcons ? "flex" : "none",
        "--program-list-divider": "hsl(var(--program-preview-list-divider))",
        "--program-header-tracking": "var(--program-preview-header-tracking)",
        "--program-title-max-width": "var(--program-preview-title-max-width)",
        "--program-pill-padding": "var(--program-preview-pill-padding)",
        "--program-title-case": settings.titleCase === "uppercase" ? "uppercase" : "none",
        fontSize: BODY_SCALE[settings.bodyScale],
    } as CSSProperties;
}

export function getProgramContentWidthClass(settings: Required<ProgramStyleSettings>): string {
    return CONTENT_WIDTH[settings.contentWidth] ?? CONTENT_WIDTH.default;
}

export function filterProgramItems(items: ProgramItem[], settings: Required<ProgramStyleSettings>): ProgramItem[] {
    if (settings.showAnnouncements) return items;
    return items.filter((item) => item.category !== "announcement" && item.containerType !== "announcement");
}
