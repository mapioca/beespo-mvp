"use client";

import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2, Play, Plus } from "lucide-react";
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
import { Template } from "./types";

interface PropertiesPaneProps {
    templates: Template[];
    onCreateMeeting: () => void;
    isCreating: boolean;
    isValid: boolean;
}

export function PropertiesPane({
    templates,
    onCreateMeeting,
    isCreating,
    isValid,
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
                    >
                        <Play className="h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        className="flex-1 h-8 gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 text-xs font-medium rounded-lg"
                        onClick={onCreateMeeting}
                        disabled={isCreating || !isValid}
                    >
                        {isCreating ? (
                            <Loader2 className="h-4 w-4 animate-spin text-white" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        {isCreating ? "Saving..." : "Create Meeting"}
                    </Button>
                </div>
                <div className="px-3 py-2.5 bg-muted/10">
                    <h2 className="font-semibold text-xs">Properties</h2>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-3 space-y-4 flex-1">
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
                                    <CalendarIcon className="mr-2 h-4 w-4" />
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
