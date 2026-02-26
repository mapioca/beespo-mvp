"use client";

import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarBlankIcon, ClockIcon, SpinnerIcon, MinusIcon, PlayIcon, PlusIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
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
import { Template, CanvasItem } from "./types";

interface PropertiesPaneProps {
    templates: Template[];
    onCreateMeeting: () => void;
    onPreview: () => void;
    isCreating: boolean;
    isValid: boolean;
    selectedItem?: CanvasItem;
    onUpdateItem?: (id: string, newTitle: string) => void;
    onUpdateDescription?: (id: string, newDescription: string) => void;
    onUpdateDuration?: (id: string, newDuration: number) => void;
    onSelectHymn?: () => void;
    onSelectParticipant?: () => void;
    onSelectSpeaker?: () => void;
    onAddToContainer?: () => void;
    onRemoveChildItem?: (childId: string) => void;
}

export function PropertiesPane({
    templates,
    onCreateMeeting,
    onPreview,
    isCreating,
    isValid,
    selectedItem,
    onUpdateItem,
    onUpdateDescription,
    onUpdateDuration,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
    onAddToContainer,
    onRemoveChildItem,
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

    return (
        <div className="h-full flex flex-col bg-muted/30 border-l overflow-y-auto">
            {/* Actions & Header */}
            <div className="sticky top-0 bg-background/95 backdrop-blur z-10 shrink-0 border-b">
                <div className="h-14 px-3 flex items-center gap-2 border-b">
                    <Button
                        variant="outline"
                        className="flex-1 h-8 gap-1.5 text-xs font-medium rounded-lg border-zinc-200"
                        onClick={onPreview}
                        disabled={!isValid}
                        type="button"
                    >
                        <PlayIcon weight="fill" className="h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        className="flex-1 h-8 gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-lg"
                        onClick={onCreateMeeting}
                        disabled={isCreating || !isValid}
                    >
                        {isCreating ? (
                            <SpinnerIcon weight="fill" className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <PlusIcon weight="fill" className="h-4 w-4" />
                        )}
                        {isCreating ? "Saving..." : "Create Meeting"}
                    </Button>
                </div>
                <div className="px-3 py-2.5 bg-muted/10">
                    <h2 className="font-semibold text-xs">Properties</h2>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-3 space-y-6 flex-1">
                {/* Item Settings (permanently shown, state depends on selection) */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Item Settings
                    </h3>

                    {!selectedItem ? (
                        <div className="py-6 px-4 text-center border border-dashed rounded-lg bg-muted/20">
                            <p className="text-xs text-muted-foreground">Select an agenda item to edit its properties.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-in fade-in duration-200">
                            {/* Item Type (Read-only) */}
                            <div className="space-y-1.5 pb-1">
                                <Label className="text-xs">Type</Label>
                                <Input
                                    value={selectedItem.structural_type?.replace('_', ' ') || selectedItem.category || 'Unknown'}
                                    disabled
                                    className="bg-muted h-8 text-sm capitalize opacity-70 cursor-not-allowed"
                                />
                            </div>

                            {/* Title (all items except dividers) */}
                            {selectedItem.structural_type !== "divider" && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="item-title" className="text-xs">
                                        {selectedItem.structural_type === "section_header" ? "Section Title" : "Title"}
                                    </Label>
                                    <Input
                                        id="item-title"
                                        value={selectedItem.title}
                                        onChange={(e) => onUpdateItem?.(selectedItem.id, e.target.value)}
                                        onFocus={(e) => e.target.select()}
                                        className="bg-background h-8 text-sm focus-visible:ring-primary/30"
                                        placeholder="Enter title..."
                                    />
                                </div>
                            )}

                            {/* Duration (non-structural items only) */}
                            {!selectedItem.structural_type && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="item-duration" className="text-xs">
                                        Duration (minutes)
                                    </Label>
                                    <Input
                                        id="item-duration"
                                        type="number"
                                        min={0}
                                        max={120}
                                        value={selectedItem.duration_minutes}
                                        onChange={(e) => onUpdateDuration?.(selectedItem.id, parseInt(e.target.value) || 0)}
                                        className="bg-background h-8 text-sm focus-visible:ring-primary/30 w-24"
                                    />
                                </div>
                            )}

                            {/* Description/Notes (for items configured with rich text) */}
                            {selectedItem.config?.has_rich_text && (
                                <div className="space-y-1.5">
                                    <Label htmlFor="item-description" className="text-xs">
                                        Description / Notes
                                    </Label>
                                    <textarea
                                        id="item-description"
                                        value={selectedItem.description || ""}
                                        onChange={(e) => onUpdateDescription?.(selectedItem.id, e.target.value)}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Add notes..."
                                    />
                                </div>
                            )}

                            {/* Hymn selector */}
                            {selectedItem.is_hymn && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Hymn</Label>
                                    <button
                                        type="button"
                                        className={cn(
                                            "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                            "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                            selectedItem.hymn_title && "border-solid bg-blue-50/50 border-blue-200 text-blue-700 font-medium"
                                        )}
                                        onClick={onSelectHymn}
                                    >
                                        <span className="truncate">
                                            {selectedItem.hymn_title
                                                ? `#${selectedItem.hymn_number} ${selectedItem.hymn_title}`
                                                : "Select Hymn..."}
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Participant selector */}
                            {(selectedItem.requires_participant || selectedItem.config?.requires_assignee) &&
                                !selectedItem.is_hymn &&
                                selectedItem.category !== "speaker" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Participant</Label>
                                        <button
                                            type="button"
                                            className={cn(
                                                "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                                "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                                selectedItem.participant_name && "border-solid bg-slate-50/50 border-slate-200 text-slate-700 font-medium"
                                            )}
                                            onClick={onSelectParticipant}
                                        >
                                            <span className="truncate">
                                                {selectedItem.participant_name || "Select Participant..."}
                                            </span>
                                        </button>
                                    </div>
                                )}

                            {/* Speaker selector */}
                            {selectedItem.category === "speaker" && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Speaker</Label>
                                    <button
                                        type="button"
                                        className={cn(
                                            "w-full h-8 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                            "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                            selectedItem.speaker_name && "border-solid bg-indigo-50/50 border-indigo-200 text-indigo-700 font-medium"
                                        )}
                                        onClick={onSelectSpeaker}
                                    >
                                        <span className="truncate">
                                            {selectedItem.speaker_name || "Select Speaker..."}
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Container items (Discussion, Business, Announcement) */}
                            {selectedItem.isContainer && selectedItem.containerType && (
                                <div className="space-y-3 pt-2">
                                    {/* Children list */}
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">
                                            Items ({selectedItem.childItems?.length || 0})
                                        </Label>
                                        {selectedItem.childItems && selectedItem.childItems.length > 0 ? (
                                            <div className="space-y-1">
                                                {selectedItem.childItems.map((child) => (
                                                    <div
                                                        key={child.id}
                                                        className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-background border border-border/60 group/child"
                                                    >
                                                        <span className="text-xs flex-1 truncate text-foreground">
                                                            {child.title}
                                                        </span>
                                                        {child.status && (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground capitalize shrink-0">
                                                                {child.status.replace("_", " ")}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="p-0.5 rounded opacity-0 group-hover/child:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            onClick={() => onRemoveChildItem?.(child.id)}
                                                        >
                                                            <MinusIcon weight="fill" className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] text-muted-foreground italic py-1">
                                                No items added yet.
                                            </p>
                                        )}
                                    </div>

                                    {/* Add item button */}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-8 gap-1.5 text-xs font-normal border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                                        onClick={onAddToContainer}
                                    >
                                        <PlusIcon weight="fill" className="h-3.5 w-3.5" />
                                        Add {selectedItem.containerType}
                                    </Button>
                                </div>
                            )}

                            {/* Section header hint */}
                            {selectedItem.structural_type === "section_header" && (
                                <p className="text-[10px] text-muted-foreground italic pt-2">
                                    Use headers to logically group your agenda items.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* General Settings */}
                <div className="space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        General
                    </h3>

                    <div className="space-y-1.5">
                        <Label htmlFor="title" className="text-xs">Meeting Name</Label>
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
                        <Label className="text-xs">Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-full justify-start text-left font-normal bg-background h-8 text-sm",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarBlankIcon weight="fill" className="mr-2 h-4 w-4" />
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
                                <ClockIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
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
                </div>

                {/* Metadata Settings */}
                <div className="space-y-3 pt-3 border-t">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Overview
                    </h3>

                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="presiding" className="text-xs">Presiding</Label>
                            <Input
                                id="presiding"
                                value={presiding}
                                onChange={(e) => setValue("presiding", e.target.value)}
                                placeholder="e.g. Bishop Smith"
                                className="bg-background h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="conducting" className="text-xs">Conducting</Label>
                            <Input
                                id="conducting"
                                value={conducting}
                                onChange={(e) => setValue("conducting", e.target.value)}
                                placeholder="e.g. Brother Jones"
                                className="bg-background h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="chorister" className="text-xs">Chorister</Label>
                            <Input
                                id="chorister"
                                value={chorister}
                                onChange={(e) => setValue("chorister", e.target.value)}
                                placeholder="Name"
                                className="bg-background h-8 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="pianistOrganist" className="text-xs">Pianist / Organist</Label>
                            <Input
                                id="pianistOrganist"
                                value={pianistOrganist}
                                onChange={(e) => setValue("pianistOrganist", e.target.value)}
                                placeholder="Name"
                                className="bg-background h-8 text-sm"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
