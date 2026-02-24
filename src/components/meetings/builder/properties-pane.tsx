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
                <div className="p-4 flex gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 h-10 gap-2 text-sm font-medium rounded-xl border-zinc-200"
                    >
                        <Play className="h-4 w-4" />
                        Preview
                    </Button>
                    <Button
                        className="flex-1 h-10 gap-2 bg-zinc-900 text-white hover:bg-zinc-800 text-sm font-medium rounded-xl"
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
                <div className="px-4 pb-3">
                    <h2 className="font-semibold text-sm">Properties</h2>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 space-y-6 flex-1">
                {/* General Settings */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        General
                    </h3>

                    <div className="space-y-2">
                        <Label htmlFor="title">Meeting Name</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setValue("title", e.target.value, { shouldValidate: true })}
                            placeholder="e.g. Ward Conference"
                            className="bg-background"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={cn(
                                            "w-full justify-start text-left font-normal bg-background",
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
                        <div className="space-y-2">
                            <Label htmlFor="time">Time</Label>
                            <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="time"
                                    type="time"
                                    value={time}
                                    onChange={(e) => setValue("time", e.target.value, { shouldValidate: true })}
                                    className="pl-9 bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="template">Template</Label>
                        <Select
                            value={selectedTemplateId}
                            onValueChange={(val) => setValue("templateId", val === "none" ? null : val, { shouldValidate: true })}
                        >
                            <SelectTrigger id="template" className="bg-background">
                                <SelectValue placeholder="Select template" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">
                                    <span className="text-muted-foreground">Blank Agenda</span>
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
                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Overview
                    </h3>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="presiding">Presiding</Label>
                            <Input
                                id="presiding"
                                value={presiding}
                                onChange={(e) => setValue("presiding", e.target.value)}
                                placeholder="e.g. Bishop Smith"
                                className="bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="conducting">Conducting</Label>
                            <Input
                                id="conducting"
                                value={conducting}
                                onChange={(e) => setValue("conducting", e.target.value)}
                                placeholder="e.g. Brother Jones"
                                className="bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="chorister">Chorister</Label>
                            <Input
                                id="chorister"
                                value={chorister}
                                onChange={(e) => setValue("chorister", e.target.value)}
                                placeholder="Name"
                                className="bg-background"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="pianistOrganist">Pianist / Organist</Label>
                            <Input
                                id="pianistOrganist"
                                value={pianistOrganist}
                                onChange={(e) => setValue("pianistOrganist", e.target.value)}
                                placeholder="Name"
                                className="bg-background"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
