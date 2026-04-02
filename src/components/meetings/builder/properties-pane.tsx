"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarDays, Clock, Minus, Plus } from "lucide-react";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Template } from "./types";

interface PropertiesPaneProps {
    templates: Template[];
    meetingNotes?: string | null;
    onUpdateMeetingNotes?: (newNotes: string) => void;
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

    return (
        <div className="h-full flex flex-col overflow-y-auto p-3 bg-background">
            <div className="flex-1 px-2 py-1 space-y-6">
                {/* General Settings */}
                <div className="space-y-2">
                    <div className="-mx-2 px-2 py-1">
                        <h3 className="text-[12px] font-medium text-muted-foreground">
                            Overview
                        </h3>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-[11px] text-muted-foreground">Name</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
                            onFocus={(e) => e.target.select()}
                            placeholder="e.g. Ward Conference"
                            className="bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="template" className="text-[11px] text-muted-foreground">Template</Label>
                        <Select
                            value={selectedTemplateId}
                            onValueChange={(val) => setValue("templateId", val === "none" ? null : val, { shouldValidate: true })}
                        >
                            <SelectTrigger id="template" className="bg-control h-8 text-sm border-control focus:ring-0 focus:border-foreground/30">
                                <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">No Template</span>
                                </SelectItem>
                                {templates.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-[11px] text-muted-foreground">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-control h-8 text-sm border-control focus:ring-0 focus:border-foreground/30",
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
                        <Label htmlFor="time" className="text-[11px] text-muted-foreground">Time</Label>
                        <div className="relative">
                            <div
                                className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-9 cursor-pointer z-10"
                                onClick={() => {
                                    const timeInput = document.getElementById("time") as HTMLInputElement;
                                    timeInput?.showPicker?.();
                                }}
                            >
                                <Clock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <Input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setValue("time", e.target.value, { shouldValidate: true })}
                                className="pl-9 bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30 [&::-webkit-calendar-picker-indicator]:hidden relative z-0"
                            />
                        </div>
                    </div>



                </div>

                {/* Roles */}
                <div className="space-y-2">
                    <div className="-mx-2 px-2 py-1">
                        <h3 className="text-[12px] font-medium text-muted-foreground">
                            Roles
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 divide-y divide-border/40 pt-1">
                        {/* Presiding */}
                        <div className="py-2.5">
                            {presiding || showPresiding ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="presiding" className="text-[11px] text-muted-foreground">Presiding</Label>
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
                                        className="bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30"
                                        autoFocus={!presiding}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className="text-[12px] text-muted-foreground">Presiding</span>
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
                                        <Label htmlFor="conducting" className="text-[11px] text-muted-foreground">Conducting</Label>
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
                                        className="bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30"
                                        autoFocus={!conducting}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className="text-[12px] text-muted-foreground">Conducting</span>
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
                                        <Label htmlFor="chorister" className="text-[11px] text-muted-foreground">Chorister</Label>
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
                                        className="bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30"
                                        autoFocus={!chorister}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className="text-[12px] text-muted-foreground">Chorister</span>
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
                                        <Label htmlFor="pianistOrganist" className="text-[11px] text-muted-foreground">Pianist / Organist</Label>
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
                                        className="bg-control h-8 text-sm border-control focus-visible:ring-0 focus-visible:border-foreground/30"
                                        autoFocus={!pianistOrganist}
                                    />
                                </div>
                            ) : (
                                <div className="flex items-center justify-between h-7">
                                    <span className="text-[12px] text-muted-foreground">Pianist / Organist</span>
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
                </div>

                {/* Notes */}
                <div className="space-y-2 pt-2 border-t border-border/40">
                    <div className="-mx-2 px-2 py-1">
                        <h3 className="text-[12px] font-medium text-muted-foreground">
                            Notes
                        </h3>
                    </div>
                    <div className="py-2">
                        {meetingNotes || showMeetingNotes ? (
                            <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] text-muted-foreground">Notes</Label>
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
                                />
                            </div>
                        ) : (
                            <div className="flex items-center justify-between h-7">
                                <span className="text-[12px] text-muted-foreground">Notes</span>
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
        </div>
    );
}

export default PropertiesPane;
