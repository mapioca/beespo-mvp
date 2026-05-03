"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, ClipboardList, Clock3, MapPin, Users } from "lucide-react";
import type { Template } from "./types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function buildTimeOptions(stepMinutes = 15): string[] {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += stepMinutes) {
            options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
        }
    }
    return options;
}
const TIME_OPTIONS = buildTimeOptions(15);

interface MeetingPlanTopBarProps {
    title: string;
    onTitleChange: (next: string) => void;
    date: Date | null;
    onDateChange: (next: Date) => void;
    time: string;
    onTimeChange: (next: string) => void;
    presiding: string;
    onPresidingChange: (next: string) => void;
    conducting: string;
    onConductingChange: (next: string) => void;
    chorister: string;
    onChoristerChange: (next: string) => void;
    organist: string;
    onOrganistChange: (next: string) => void;
    location?: string | null;
    templates?: Template[];
    templateId?: string | null;
    onTemplateChange?: (next: string | null) => void;
    canvasItemCount?: number;
    canEdit?: boolean;
}

const chipButtonClass =
    "h-7 rounded-full border border-border/60 bg-background px-2.5 text-[12px] font-medium text-foreground/75 hover:bg-accent/40 hover:text-foreground";

export function MeetingPlanTopBar({
    title,
    onTitleChange,
    date,
    onDateChange,
    time,
    onTimeChange,
    presiding,
    onPresidingChange,
    conducting,
    onConductingChange,
    chorister,
    onChoristerChange,
    organist,
    onOrganistChange,
    location,
    templates = [],
    templateId = null,
    onTemplateChange,
    canvasItemCount = 0,
    canEdit = true,
}: MeetingPlanTopBarProps) {
    const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;
    const [pendingTemplateId, setPendingTemplateId] = useState<string | null | undefined>(undefined);

    function requestTemplateChange(next: string | null) {
        if (!onTemplateChange) return;
        if (next !== null && canvasItemCount > 0) {
            setPendingTemplateId(next);
        } else {
            onTemplateChange(next);
        }
    }
    const dateLabel = date ? format(date, "MMM d") : "Add date";
    const timeLabel = time
        ? (() => {
            const [h, m] = time.split(":").map(Number);
            const dt = new Date();
            dt.setHours(h, m, 0, 0);
            return dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
        })()
        : "Add time";

    const rolesSummary = [presiding, conducting, chorister, organist].filter(Boolean).length;

    return (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 bg-background/60 px-4 py-2">
            {/* Inline title */}
            <Input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                disabled={!canEdit}
                placeholder="Untitled meeting"
                className="h-8 max-w-[280px] rounded-lg border-border/60 bg-background px-2.5 text-[13px] font-semibold text-foreground/90 focus-visible:ring-1 focus-visible:ring-ring"
            />

            {/* Date */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" className={chipButtonClass} disabled={!canEdit}>
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        {dateLabel}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <DateCalendar
                        mode="single"
                        selected={date ?? undefined}
                        onSelect={(selected) => {
                            if (selected) onDateChange(selected);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>

            {/* Time */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" className={chipButtonClass} disabled={!canEdit}>
                        <Clock3 className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        {timeLabel}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[180px] p-2" align="start">
                    <Select value={time} onValueChange={onTimeChange} disabled={!canEdit}>
                        <SelectTrigger className="h-9 text-[13px]">
                            <SelectValue placeholder="Select time" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[240px]">
                            {TIME_OPTIONS.map((opt) => {
                                const [h, m] = opt.split(":").map(Number);
                                const dt = new Date();
                                dt.setHours(h, m, 0, 0);
                                return (
                                    <SelectItem key={opt} value={opt}>
                                        {dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </PopoverContent>
            </Popover>

            {/* Location (read-only if from event) */}
            {location && (
                <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 text-[12px] font-medium text-foreground/70">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {location}
                </span>
            )}

            {/* Template popover */}
            {onTemplateChange && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button type="button" variant="ghost" className={chipButtonClass} disabled={!canEdit}>
                            <ClipboardList className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                            {selectedTemplate ? selectedTemplate.name : "Template"}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-1" align="start">
                        <button
                            type="button"
                            onClick={() => requestTemplateChange(null)}
                            disabled={!canEdit}
                            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] text-foreground/80 hover:bg-accent/40"
                        >
                            No template
                        </button>
                        {templates.length > 0 && <div className="my-1 h-px bg-border/60" />}
                        <div className="max-h-[240px] overflow-y-auto">
                            {templates.map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => requestTemplateChange(t.id)}
                                    disabled={!canEdit}
                                    className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-accent/40 ${t.id === templateId ? "bg-accent/30 font-medium text-foreground" : "text-foreground/80"}`}
                                >
                                    {t.name}
                                </button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            )}

            {/* Roles popover */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" className={chipButtonClass} disabled={!canEdit}>
                        <Users className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        Roles
                        {rolesSummary > 0 && (
                            <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">
                                {rolesSummary}
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-3 space-y-2" align="start">
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Presiding</Label>
                        <Input
                            value={presiding}
                            onChange={(e) => onPresidingChange(e.target.value)}
                            disabled={!canEdit}
                            className="h-8 text-[13px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Conducting</Label>
                        <Input
                            value={conducting}
                            onChange={(e) => onConductingChange(e.target.value)}
                            disabled={!canEdit}
                            className="h-8 text-[13px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Chorister</Label>
                        <Input
                            value={chorister}
                            onChange={(e) => onChoristerChange(e.target.value)}
                            disabled={!canEdit}
                            className="h-8 text-[13px]"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">Organist</Label>
                        <Input
                            value={organist}
                            onChange={(e) => onOrganistChange(e.target.value)}
                            disabled={!canEdit}
                            className="h-8 text-[13px]"
                        />
                    </div>
                </PopoverContent>
            </Popover>

            <AlertDialog
                open={pendingTemplateId !== undefined}
                onOpenChange={(open) => { if (!open) setPendingTemplateId(undefined); }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Replace existing items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Applying this template will replace your current agenda items. This
                            can&apos;t be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (onTemplateChange && pendingTemplateId !== undefined) {
                                    onTemplateChange(pendingTemplateId);
                                }
                                setPendingTemplateId(undefined);
                            }}
                        >
                            Apply template
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
