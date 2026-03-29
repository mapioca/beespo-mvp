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

    return (
        <div className="h-full flex flex-col overflow-y-auto p-3">
            {/* Card container */}
            <div className="bg-card rounded-lg ring-1 ring-border p-4 space-y-6 flex-1">
                {/* General Settings */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Agenda
                    </h3>

                    <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-xs">Name</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
                            onFocus={(e) => e.target.select()}
                            placeholder="e.g. Ward Conference"
                            className="bg-background h-8 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="template" className="text-xs">Template</Label>
                        <Select
                            value={selectedTemplateId}
                            onValueChange={(val) => setValue("templateId", val === "none" ? null : val, { shouldValidate: true })}
                        >
                            <SelectTrigger id="template" className="bg-background h-8 text-sm">
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
                        <Label className="text-xs">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-background h-8 text-sm",
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
                        <Label htmlFor="time" className="text-xs">Time</Label>
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
                                className="pl-9 bg-background h-8 text-sm [&::-webkit-calendar-picker-indicator]:hidden relative z-0"
                            />
                        </div>
                    </div>



                    <div className="grid grid-cols-1 divide-y divide-border/60">
                        {/* Presiding */}
                        <div className="py-2.5">
                            {presiding || showPresiding ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="presiding" className="text-xs">Presiding</Label>
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
                                        className="bg-background h-8 text-sm"
                                        autoFocus={!presiding}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                    onClick={() => setShowPresiding(true)}
                                >
                                    <span className="text-sm">Presiding</span>
                                    <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Conducting */}
                        <div className="py-2.5">
                            {conducting || showConducting ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="conducting" className="text-xs">Conducting</Label>
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
                                        className="bg-background h-8 text-sm"
                                        autoFocus={!conducting}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                    onClick={() => setShowConducting(true)}
                                >
                                    <span className="text-sm">Conducting</span>
                                    <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Chorister */}
                        <div className="py-2.5">
                            {chorister || showChorister ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="chorister" className="text-xs">Chorister</Label>
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
                                        className="bg-background h-8 text-sm"
                                        autoFocus={!chorister}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                    onClick={() => setShowChorister(true)}
                                >
                                    <span className="text-sm">Chorister</span>
                                    <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Pianist / Organist */}
                        <div className="py-2.5">
                            {pianistOrganist || showPianist ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="pianistOrganist" className="text-xs">Pianist / Organist</Label>
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
                                        className="bg-background h-8 text-sm"
                                        autoFocus={!pianistOrganist}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                    onClick={() => setShowPianist(true)}
                                >
                                    <span className="text-sm">Pianist / Organist</span>
                                    <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                                </div>
                            )}
                        </div>

                        {/* Meeting Notes */}
                        <div className="py-2.5">
                            {meetingNotes || showMeetingNotes ? (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs">Notes</Label>
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
                                <div
                                    className="flex items-center justify-between group cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded transition-colors h-7"
                                    onClick={() => setShowMeetingNotes(true)}
                                >
                                    <span className="text-sm">Notes</span>
                                    <Plus className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground group-hover:scale-110 transition-all" />
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default PropertiesPane;
