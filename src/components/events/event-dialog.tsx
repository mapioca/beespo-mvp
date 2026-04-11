"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { Event } from "./events-table";

interface EventDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event?: Event | null;
    onSave: (event: Event, isNew: boolean) => void;
}

function parseTimeParts(value: string): { hour12: string; minute: string; period: "AM" | "PM" } {
    const [h, m] = value.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return { hour12: "9", minute: "00", period: "AM" };
    return {
        hour12: String(((h + 11) % 12) + 1),
        minute: String(m).padStart(2, "0"),
        period: h >= 12 ? "PM" : "AM",
    };
}

function to24Hour(hour12: string, minute: string, period: "AM" | "PM"): string {
    const safeHour12 = Math.max(1, Math.min(12, Number.parseInt(hour12, 10) || 9));
    const safeMinute = Math.max(0, Math.min(59, Number.parseInt(minute, 10) || 0));
    let hour = safeHour12 % 12;
    if (period === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${String(safeMinute).padStart(2, "0")}`;
}

function minuteOptions(currentMinute: string): string[] {
    const defaults = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
    if (!defaults.includes(currentMinute)) {
        return [...defaults, currentMinute].sort((a, b) => Number(a) - Number(b));
    }
    return defaults;
}

export function EventDialog({
    open,
    onOpenChange,
    event,
    onSave,
}: EventDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const isEditing = !!event;

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [startDate, setStartDate] = useState("");
    const [startTime, setStartTime] = useState("09:00");
    const [endDate, setEndDate] = useState("");
    const [endTime, setEndTime] = useState("10:00");
    const [isAllDay, setIsAllDay] = useState(false);
    const [promoteToAnnouncement, setPromoteToAnnouncement] = useState(false);

    // Initialize form when event changes
    useEffect(() => {
        if (event) {
            setTitle(event.title);
            setDescription(event.description || "");
            setLocation(event.location || "");
            setIsAllDay(event.is_all_day);

            const start = new Date(event.start_at);
            const end = new Date(event.end_at);

            setStartDate(format(start, "yyyy-MM-dd"));
            setStartTime(format(start, "HH:mm"));
            setEndDate(format(end, "yyyy-MM-dd"));
            setEndTime(format(end, "HH:mm"));
            setPromoteToAnnouncement(false);
        } else {
            resetForm();
        }
    }, [event, open]);

    // Reset form
    const resetForm = () => {
        const today = format(new Date(), "yyyy-MM-dd");
        setTitle("");
        setDescription("");
        setLocation("");
        setStartDate(today);
        setStartTime("09:00");
        setEndDate(today);
        setEndTime("10:00");
        setIsAllDay(false);
        setPromoteToAnnouncement(false);
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Construct start_at and end_at timestamps
        const startAt = isAllDay
            ? `${startDate}T00:00:00`
            : `${startDate}T${startTime}:00`;
        const endAt = isAllDay
            ? `${endDate}T23:59:59`
            : `${endDate}T${endTime}:00`;

        const payload = {
            title,
            description: description || null,
            location: location || null,
            start_at: new Date(startAt).toISOString(),
            end_at: new Date(endAt).toISOString(),
            is_all_day: isAllDay,
            promote_to_announcement: promoteToAnnouncement,
        };

        try {
            const url = isEditing
                ? `/api/events/${event.id}`
                : "/api/events";
            const method = isEditing ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to save event");
            }

            toast.success(isEditing
                    ? "Event updated successfully."
                    : "Event created successfully.");

            if (data.announcement) {
                toast.success("Announcement Created", { description: "Event has been promoted to an announcement." });
            }

            onSave(data.event, !isEditing);
            onOpenChange(false);
            resetForm();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to save event.");
        } finally {
            setIsLoading(false);
        }
    };

    // Check if an announcement already exists for this event
    const hasExistingAnnouncement = event?.announcements && event.announcements.length > 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Edit Event" : "Create Event"}</DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? "Update the event details below."
                            : "Create a new calendar event for your workspace."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Event title"
                            maxLength={200}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Event details..."
                            rows={3}
                            disabled={isLoading}
                        />
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Event location"
                            disabled={isLoading}
                        />
                    </div>

                    {/* All Day Checkbox */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isAllDay"
                            checked={isAllDay}
                            onCheckedChange={(checked) => setIsAllDay(checked as boolean)}
                            disabled={isLoading}
                        />
                        <Label htmlFor="isAllDay" className="cursor-pointer">
                            All-day event
                        </Label>
                    </div>

                    {/* Start Date/Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Start Date *</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {!isAllDay && (
                            <div className="space-y-2">
                                <Label htmlFor="startTime">Start Time *</Label>
                                {(() => {
                                    const parts = parseTimeParts(startTime);
                                    return (
                                        <div id="startTime" className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                            <Select
                                                value={parts.hour12}
                                                onValueChange={(hour12) => setStartTime(to24Hour(hour12, parts.minute, parts.period))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Hour" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={parts.minute}
                                                onValueChange={(minute) => setStartTime(to24Hour(parts.hour12, minute, parts.period))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Min" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {minuteOptions(parts.minute).map((m) => (
                                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <div className="inline-flex rounded-md border border-input p-0.5">
                                                {(["AM", "PM"] as const).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => setStartTime(to24Hour(parts.hour12, parts.minute, option))}
                                                        className={`h-8 min-w-[44px] rounded-sm px-2 text-xs font-medium ${
                                                            parts.period === option
                                                                ? "bg-primary text-primary-foreground"
                                                                : "text-muted-foreground hover:bg-accent"
                                                        }`}
                                                        disabled={isLoading}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* End Date/Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="endDate">End Date *</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                        </div>
                        {!isAllDay && (
                            <div className="space-y-2">
                                <Label htmlFor="endTime">End Time *</Label>
                                {(() => {
                                    const parts = parseTimeParts(endTime);
                                    return (
                                        <div id="endTime" className="grid grid-cols-[1fr_1fr_auto] gap-2">
                                            <Select
                                                value={parts.hour12}
                                                onValueChange={(hour12) => setEndTime(to24Hour(hour12, parts.minute, parts.period))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Hour" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((h) => (
                                                        <SelectItem key={h} value={h}>{h}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={parts.minute}
                                                onValueChange={(minute) => setEndTime(to24Hour(parts.hour12, minute, parts.period))}
                                                disabled={isLoading}
                                            >
                                                <SelectTrigger className="h-9">
                                                    <SelectValue placeholder="Min" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {minuteOptions(parts.minute).map((m) => (
                                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <div className="inline-flex rounded-md border border-input p-0.5">
                                                {(["AM", "PM"] as const).map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => setEndTime(to24Hour(parts.hour12, parts.minute, option))}
                                                        className={`h-8 min-w-[44px] rounded-sm px-2 text-xs font-medium ${
                                                            parts.period === option
                                                                ? "bg-primary text-primary-foreground"
                                                                : "text-muted-foreground hover:bg-accent"
                                                        }`}
                                                        disabled={isLoading}
                                                    >
                                                        {option}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Promote to Announcement */}
                    {!hasExistingAnnouncement && (
                        <div className="flex items-center space-x-2 pt-2 border-t">
                            <Checkbox
                                id="promoteToAnnouncement"
                                checked={promoteToAnnouncement}
                                onCheckedChange={(checked) => setPromoteToAnnouncement(checked as boolean)}
                                disabled={isLoading}
                            />
                            <div className="grid gap-1.5 leading-none">
                                <Label htmlFor="promoteToAnnouncement" className="cursor-pointer">
                                    Promote to Announcement
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Create an announcement that runs until the event starts
                                </p>
                            </div>
                        </div>
                    )}

                    {hasExistingAnnouncement && (
                        <div className="text-sm text-muted-foreground pt-2 border-t">
                            This event has already been promoted to an announcement.
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !title || !startDate || !endDate}
                        >
                            {isLoading ? "Saving..." : isEditing ? "Save Changes" : "Create Event"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
