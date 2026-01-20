"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Template } from "./types";

interface BuilderHeaderProps {
    title: string;
    onTitleChange: (title: string) => void;
    date: Date | undefined;
    onDateChange: (date: Date | undefined) => void;
    time: string;
    onTimeChange: (time: string) => void;
    templates: Template[];
    selectedTemplateId: string | null;
    onTemplateChange: (templateId: string | null) => void;
    onCreateMeeting: () => void;
    isCreating: boolean;
    isValid: boolean;
}

export function BuilderHeader({
    title,
    onTitleChange,
    date,
    onDateChange,
    time,
    onTimeChange,
    templates,
    selectedTemplateId,
    onTemplateChange,
    onCreateMeeting,
    isCreating,
    isValid,
}: BuilderHeaderProps) {
    return (
        <div className="sticky top-0 z-10 bg-background border-b">
            <div className="px-6 py-4">
                <div className="flex items-center gap-4">
                    {/* Meeting Title */}
                    <div className="flex-1 min-w-0">
                        <Input
                            value={title}
                            onChange={(e) => onTitleChange(e.target.value)}
                            placeholder="Meeting Title"
                            className="text-lg font-semibold h-11 border-0 shadow-none focus-visible:ring-0 px-0 placeholder:text-muted-foreground/50"
                        />
                    </div>

                    {/* Date Picker */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-[180px] justify-start text-left font-normal h-10",
                                    !date && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "MMM d, yyyy") : "Pick date"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={onDateChange}
                            />
                        </PopoverContent>
                    </Popover>

                    {/* Time Picker */}
                    <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="time"
                            value={time}
                            onChange={(e) => onTimeChange(e.target.value)}
                            className="w-[130px] pl-9 h-10"
                        />
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-border" />

                    {/* Template Selector */}
                    <Select
                        value={selectedTemplateId || ""}
                        onValueChange={(value) => onTemplateChange(value || null)}
                    >
                        <SelectTrigger className="w-[200px] h-10">
                            <SelectValue placeholder="Load Template" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                <span className="text-muted-foreground">No Template</span>
                            </SelectItem>
                            {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                    {template.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Create Button */}
                    <Button
                        onClick={onCreateMeeting}
                        disabled={isCreating || !isValid}
                        className="h-10 px-6"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Meeting"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
