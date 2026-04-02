"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarDays, Check, Clock, Minus, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Template } from "./types";

interface PropertiesPaneProps {
    templates: Template[];
    meetingNotes?: string | null;
    onUpdateMeetingNotes?: (newNotes: string) => void;
}

interface TimePartComboboxProps {
    label: string;
    value: string;
    options: string[];
    onCommit: (value: string) => void;
    normalizeInput?: (value: string) => string | null;
}

function TimePartCombobox({
    label,
    value,
    options,
    onCommit,
    normalizeInput,
}: TimePartComboboxProps) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);

    useEffect(() => {
        setDraft(value);
    }, [value]);

    const commitValue = (nextValue: string) => {
        onCommit(nextValue);
        setDraft(nextValue);
        setOpen(false);
    };

    const tryCommitDraft = () => {
        const normalized = normalizeInput?.(draft) ?? draft;
        if (!normalized || !options.includes(normalized)) {
            setDraft(value);
            setOpen(false);
            return;
        }

        commitValue(normalized);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="space-y-1">
                <Label className="text-[10px] font-medium leading-none text-muted-foreground">{label}</Label>
                <PopoverTrigger asChild>
                    <div className="relative">
                        <Input
                            value={draft}
                            onFocus={() => setOpen(true)}
                            onChange={(e) => {
                                const nextDraft = e.target.value.toUpperCase();
                                setDraft(nextDraft);

                                const normalized = normalizeInput?.(nextDraft) ?? nextDraft;
                                if (normalized && options.includes(normalized)) {
                                    onCommit(normalized);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    tryCommitDraft();
                                } else if (e.key === "Escape") {
                                    e.preventDefault();
                                    setDraft(value);
                                    setOpen(false);
                                } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    setOpen(true);
                                }
                            }}
                            onBlur={() => {
                                window.setTimeout(() => {
                                    tryCommitDraft();
                                }, 0);
                            }}
                            className="h-8 rounded-full border-control bg-control pr-8 text-[12px] md:text-[12px] font-medium leading-none tracking-normal focus-visible:ring-0 focus-visible:border-foreground/30"
                        />
                        <button
                            type="button"
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setOpen((prev) => !prev)}
                            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-control"
                            aria-label={`Toggle ${label.toLowerCase()} options`}
                        >
                            <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </PopoverTrigger>
            </div>
            <PopoverContent
                align="start"
                sideOffset={6}
                className="w-[var(--radix-popover-trigger-width)] min-w-0 rounded-xl border border-border/60 bg-[hsl(var(--menu))] p-1 text-[hsl(var(--menu-text))] shadow-lg"
            >
                <div className="max-h-56 overflow-y-auto">
                    {options.map((option) => (
                        <button
                            key={option}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => commitValue(option)}
                            className={cn(
                                "relative flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] leading-none tracking-normal outline-none transition-colors",
                                "hover:bg-[hsl(var(--menu-hover))] focus:bg-[hsl(var(--menu-hover))]",
                                option === value && "font-medium"
                            )}
                        >
                            <span>{option}</span>
                            {option === value && <Check className="ml-auto h-4 w-4 text-[hsl(var(--menu-icon))]" />}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}

export function PropertiesPane({
    templates,
    meetingNotes,
    onUpdateMeetingNotes,
}: PropertiesPaneProps) {
    const { watch, setValue } = useFormContext();

    const title = watch("title") || "";
    const date = watch("date");
    const time = watch("time") || "07:00";
    const selectedTemplateId = watch("templateId") || "none";
    const selectedTemplateName =
        selectedTemplateId === "none"
            ? "No Template"
            : templates.find((template) => template.id === selectedTemplateId)?.name ?? "Select template";
    const displayTime = (() => {
        const [hoursRaw, minutesRaw] = String(time).split(":");
        const hours = Number(hoursRaw);
        const minutes = Number(minutesRaw);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) return "Select time";

        const period = hours >= 12 ? "PM" : "AM";
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${String(minutes).padStart(2, "0")} ${period}`;
    })();
    const [hoursRaw = "07", minutesRaw = "00"] = String(time).split(":");
    const parsedHours = Number(hoursRaw);
    const parsedMinutes = Number(minutesRaw);
    const timePeriod = parsedHours >= 12 ? "PM" : "AM";
    const timeHour = String(parsedHours % 12 || 12).padStart(2, "0");
    const timeMinute = Number.isNaN(parsedMinutes) ? "00" : String(parsedMinutes).padStart(2, "0");

    const conducting = watch("conducting") || "";
    const presiding = watch("presiding") || "";
    const chorister = watch("chorister") || "";
    const pianistOrganist = watch("pianistOrganist") || "";

    // Local state for toggling field visibility of empty overview fields
    const [showPresiding, setShowPresiding] = useState(false);
    const [showConducting, setShowConducting] = useState(false);
    const [showChorister, setShowChorister] = useState(false);
    const [showPianist, setShowPianist] = useState(false);
    const [showMeetingNotes, setShowMeetingNotes] = useState(false);
    const hasNotes = !!meetingNotes;
    const sectionHeaderClass =
        "flex items-center gap-1 text-builder-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded-md leading-none hover:text-foreground hover:bg-control-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/15 w-full justify-start text-left";
    const propertyValueClass =
        "text-[11px] font-medium leading-none tracking-normal";
    const propertyLabelClass =
        "text-[10px] font-medium leading-none text-muted-foreground";
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        overview: false,
        roles: false,
    });
    const [timePopoverOpen, setTimePopoverOpen] = useState(false);
    const updateTimeValue = ({
        hour = timeHour,
        minute = timeMinute,
        period = timePeriod,
    }: {
        hour?: string;
        minute?: string;
        period?: "AM" | "PM";
    }) => {
        const normalizedHour = Number(hour);
        const normalizedMinute = Number(minute);

        if (Number.isNaN(normalizedHour) || Number.isNaN(normalizedMinute)) return;

        const twentyFourHour = period === "PM"
            ? normalizedHour % 12 + 12
            : normalizedHour % 12;

        setValue(
            "time",
            `${String(twentyFourHour).padStart(2, "0")}:${String(normalizedMinute).padStart(2, "0")}`,
            { shouldValidate: true }
        );
    };
    const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));
    const minuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));
    const periodOptions: Array<"AM" | "PM"> = ["AM", "PM"];

    return (
        <div className="h-full flex flex-col overflow-y-auto p-3 pr-5 bg-background">
            <div className="flex-1 px-2 py-1 space-y-6">
                {/* General Settings */}
                <div className="space-y-2">
                    <div className="-mx-2 px-2 py-1">
                        <button
                            type="button"
                            aria-expanded={!collapsedSections.overview}
                            onClick={() => setCollapsedSections((prev) => ({ ...prev, overview: !prev.overview }))}
                            className={sectionHeaderClass}
                        >
                            <ChevronDown className={cn("h-3.5 w-3.5 -translate-y-[0.5px] text-muted-foreground transition-transform", collapsedSections.overview ? "-rotate-90" : "rotate-0")} />
                            Overview
                        </button>
                    </div>

                    {!collapsedSections.overview && (
                        <>
                            <div className="space-y-1.5">
                                <Label htmlFor="title" className={propertyLabelClass}>Name</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
                                    onFocus={(e) => e.target.select()}
                                    placeholder="e.g. Ward Conference"
                                    className={cn(
                                        "bg-control h-8 border-control focus-visible:ring-0 focus-visible:border-foreground/30 md:text-[11px]",
                                        propertyValueClass
                                    )}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="template" className={propertyLabelClass}>Template</Label>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            id="template"
                                            type="button"
                                            className={cn(
                                                "inline-flex h-8 w-full items-center justify-between gap-2 rounded-full",
                                                "border border-control bg-control px-3 text-foreground",
                                                "transition-colors hover:bg-control-hover",
                                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                propertyValueClass
                                            )}
                                        >
                                            <span className="truncate text-left">
                                                {selectedTemplateName}
                                            </span>
                                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-control" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-xl border-border/60 shadow-lg">
                                        <DropdownMenuItem
                                            onSelect={() => setValue("templateId", null, { shouldValidate: true })}
                                            className={cn(selectedTemplateId === "none" && "font-medium")}
                                        >
                                            <span className="text-muted-foreground">No Template</span>
                                        </DropdownMenuItem>
                                        {templates.map((template) => (
                                            <DropdownMenuItem
                                                key={template.id}
                                                onSelect={() => setValue("templateId", template.id, { shouldValidate: true })}
                                                className={cn(template.id === selectedTemplateId && "font-medium")}
                                            >
                                                {template.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="space-y-1.5">
                                <Label className={propertyLabelClass}>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal bg-control h-8 border-control focus:ring-0 focus:border-foreground/30",
                                                propertyValueClass,
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" />
                                            {date ? format(date, "MMM d, yyyy") : "Date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={date}
                                            onSelect={(d) => setValue("date", d, { shouldValidate: true })}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="time" className={propertyLabelClass}>Time</Label>
                                <Popover open={timePopoverOpen} onOpenChange={setTimePopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <button
                                            id="time"
                                            type="button"
                                            className={cn(
                                                "relative flex h-8 w-full items-center rounded-md border border-control bg-control pl-9 pr-3 text-foreground",
                                                "focus-visible:outline-none focus-visible:ring-0 focus-visible:border-foreground/30",
                                                propertyValueClass
                                            )}
                                        >
                                            <span className="pointer-events-none absolute left-0 top-0 bottom-0 flex w-9 items-center justify-center">
                                                <Clock className="h-4 w-4 text-muted-foreground" />
                                            </span>
                                            {displayTime}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent align="start" className="w-[280px] rounded-xl border-border/60 p-3 shadow-lg">
                                        <div className="grid grid-cols-3 gap-2">
                                            <TimePartCombobox
                                                label="Hour"
                                                value={timeHour}
                                                options={hourOptions}
                                                normalizeInput={(nextValue) => {
                                                    const numeric = nextValue.replace(/\D/g, "");
                                                    if (!numeric) return null;
                                                    const parsed = Number(numeric);
                                                    if (parsed < 1 || parsed > 12) return null;
                                                    return String(parsed).padStart(2, "0");
                                                }}
                                                onCommit={(hour) => updateTimeValue({ hour })}
                                            />
                                            <TimePartCombobox
                                                label="Minute"
                                                value={timeMinute}
                                                options={minuteOptions}
                                                normalizeInput={(nextValue) => {
                                                    const numeric = nextValue.replace(/\D/g, "");
                                                    if (!numeric) return null;
                                                    const parsed = Number(numeric);
                                                    if (parsed < 0 || parsed > 59) return null;
                                                    return String(parsed).padStart(2, "0");
                                                }}
                                                onCommit={(minute) => updateTimeValue({ minute })}
                                            />
                                            <TimePartCombobox
                                                label="Period"
                                                value={timePeriod}
                                                options={periodOptions}
                                                normalizeInput={(nextValue) => {
                                                    const normalized = nextValue.trim().toUpperCase();
                                                    if (normalized === "A" || normalized === "AM") return "AM";
                                                    if (normalized === "P" || normalized === "PM") return "PM";
                                                    return null;
                                                }}
                                                onCommit={(period) => updateTimeValue({ period: period as "AM" | "PM" })}
                                            />
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </>
                    )}



                </div>

                {/* Roles */}
                <div className="space-y-2">
                    <div className="-mx-2 px-2 py-1">
                        <button
                            type="button"
                            aria-expanded={!collapsedSections.roles}
                            onClick={() => setCollapsedSections((prev) => ({ ...prev, roles: !prev.roles }))}
                            className={sectionHeaderClass}
                        >
                            <ChevronDown className={cn("h-3.5 w-3.5 -translate-y-[0.5px] text-muted-foreground transition-transform", collapsedSections.roles ? "-rotate-90" : "rotate-0")} />
                            Roles
                        </button>
                    </div>
                    {!collapsedSections.roles && (
                        <div className="grid grid-cols-1 divide-y divide-border/40 pt-1">
                        {/* Presiding */}
                        <div className="py-2.5">
                            {presiding || showPresiding ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="presiding" className={propertyLabelClass}>Presiding</Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue("presiding", "");
                                                setShowPresiding(false);
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        id="presiding"
                                        value={presiding}
                                        onChange={(e) => setValue("presiding", e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="e.g. Bishop Smith"
                                        className={cn(
                                            "bg-control h-8 border-control focus-visible:ring-0 focus-visible:border-foreground/30 md:text-[11px]",
                                            "placeholder:text-[11px] placeholder:font-normal",
                                            propertyValueClass
                                        )}
                                        autoFocus={!presiding}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className={propertyLabelClass}>Presiding</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowPresiding(true)}
                                        className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-control-hover transition-colors"
                                        aria-label="Add presiding"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="end" sideOffset={8} arrowAlign="end">
                                                Add a presiding authority
                                            </TooltipContent>
                                        </Tooltip>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Conducting */}
                        <div className="py-2.5">
                            {conducting || showConducting ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="conducting" className={propertyLabelClass}>Conducting</Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue("conducting", "");
                                                setShowConducting(false);
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        id="conducting"
                                        value={conducting}
                                        onChange={(e) => setValue("conducting", e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="e.g. Brother Jones"
                                        className={cn(
                                            "bg-control h-8 border-control focus-visible:ring-0 focus-visible:border-foreground/30 md:text-[11px]",
                                            "placeholder:text-[11px] placeholder:font-normal",
                                            propertyValueClass
                                        )}
                                        autoFocus={!conducting}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className={propertyLabelClass}>Conducting</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowConducting(true)}
                                        className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-control-hover transition-colors"
                                        aria-label="Add conducting"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="end" sideOffset={8} arrowAlign="end">
                                                Add a conductor
                                            </TooltipContent>
                                        </Tooltip>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Chorister */}
                        <div className="py-2.5">
                            {chorister || showChorister ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="chorister" className={propertyLabelClass}>Chorister</Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue("chorister", "");
                                                setShowChorister(false);
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        id="chorister"
                                        value={chorister}
                                        onChange={(e) => setValue("chorister", e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="Name"
                                        className={cn(
                                            "bg-control h-8 border-control focus-visible:ring-0 focus-visible:border-foreground/30 md:text-[11px]",
                                            "placeholder:text-[11px] placeholder:font-normal",
                                            propertyValueClass
                                        )}
                                        autoFocus={!chorister}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className={propertyLabelClass}>Chorister</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowChorister(true)}
                                        className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-control-hover transition-colors"
                                        aria-label="Add chorister"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="end" sideOffset={8} arrowAlign="end">
                                                Add a chorister
                                            </TooltipContent>
                                        </Tooltip>
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Pianist / Organist */}
                        <div className="py-2.5">
                            {pianistOrganist || showPianist ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="pianistOrganist" className={propertyLabelClass}>Pianist / Organist</Label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setValue("pianistOrganist", "");
                                                setShowPianist(false);
                                            }}
                                            className="text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <Input
                                        id="pianistOrganist"
                                        value={pianistOrganist}
                                        onChange={(e) => setValue("pianistOrganist", e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        placeholder="Name"
                                        className={cn(
                                            "bg-control h-8 border-control focus-visible:ring-0 focus-visible:border-foreground/30 md:text-[11px]",
                                            "placeholder:text-[11px] placeholder:font-normal",
                                            propertyValueClass
                                        )}
                                        autoFocus={!pianistOrganist}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className={propertyLabelClass}>Pianist / Organist</span>
                                    <button
                                        type="button"
                                        onClick={() => setShowPianist(true)}
                                        className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-control-hover transition-colors"
                                        aria-label="Add pianist or organist"
                                    >
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex">
                                                    <Plus className="h-4 w-4" />
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" align="end" sideOffset={8} arrowAlign="end">
                                                Add a pianist
                                            </TooltipContent>
                                        </Tooltip>
                                    </button>
                                </div>
                            )}
                        </div>
                        </div>
                    )}
                </div>

                {/* Notes property */}
                <div className="pt-3 border-t border-border/40">
                    {meetingNotes || showMeetingNotes ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center justify-between">
                                <Label className={propertyLabelClass}>Notes</Label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onUpdateMeetingNotes?.("");
                                        setShowMeetingNotes(false);
                                    }}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    <Minus className="h-3 w-3" />
                                </button>
                            </div>
                            <RichTextEditor
                                content={meetingNotes || ""}
                                onSave={async (content) => onUpdateMeetingNotes?.(content)}
                                placeholder="Add notes for the overall meeting..."
                                placeholderFontSize="11px"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-between h-7">
                            <span className={propertyLabelClass}>Notes</span>
                            <button
                                type="button"
                                onClick={() => setShowMeetingNotes(true)}
                                className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-control-hover transition-colors"
                                aria-label="Add notes"
                            >
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="inline-flex">
                                            <Plus className="h-4 w-4" />
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" align="end" sideOffset={8} arrowAlign="end">
                                        Add notes
                                    </TooltipContent>
                                </Tooltip>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PropertiesPane;
