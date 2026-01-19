"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AgendaItemDividerProps {
    /** Position index where the new item will be inserted */
    insertAtIndex: number;
    /** Callback to insert new item at position */
    onInsert: (data: {
        title: string;
        item_type: string;
        duration_minutes: number | null;
    }, insertAtIndex: number) => Promise<boolean>;
    /** Whether operations are disabled */
    disabled?: boolean;
}

type ItemType = "procedural" | "speaker" | "business" | "discussion" | "announcement";

const ITEM_TYPE_OPTIONS: { value: ItemType; label: string }[] = [
    { value: "procedural", label: "Procedural" },
    { value: "speaker", label: "Speaker" },
    { value: "business", label: "Business" },
    { value: "discussion", label: "Discussion" },
    { value: "announcement", label: "Announcement" },
];

export function AgendaItemDivider({
    insertAtIndex,
    onInsert,
    disabled = false,
}: AgendaItemDividerProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [title, setTitle] = useState("");
    const [itemType, setItemType] = useState<ItemType>("procedural");
    const [duration, setDuration] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLDivElement>(null);

    // Focus input when expanded
    useEffect(() => {
        if (isExpanded && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isExpanded]);

    // Handle click outside to collapse
    useEffect(() => {
        if (!isExpanded) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (formRef.current && !formRef.current.contains(e.target as Node)) {
                handleCancel();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isExpanded]);

    const handleCancel = () => {
        setIsExpanded(false);
        setTitle("");
        setItemType("procedural");
        setDuration("");
    };

    const handleSubmit = async () => {
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const success = await onInsert(
            {
                title: title.trim(),
                item_type: itemType,
                duration_minutes: duration ? parseInt(duration) : null,
            },
            insertAtIndex
        );

        setIsSubmitting(false);
        if (success) {
            handleCancel();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === "Escape") {
            handleCancel();
        }
    };

    if (disabled) return null;

    // Expanded state - show inline form
    if (isExpanded) {
        return (
            <div
                ref={formRef}
                className="relative py-2 animate-in fade-in slide-in-from-top-2 duration-200"
            >
                <div className="rounded-lg border-2 border-primary/30 bg-card p-3 shadow-sm">
                    <div className="flex items-start gap-3">
                        {/* Title Input */}
                        <div className="flex-1 space-y-2">
                            <Input
                                ref={inputRef}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter item title..."
                                disabled={isSubmitting}
                                className="h-9"
                            />
                            <div className="flex gap-2">
                                <Select
                                    value={itemType}
                                    onValueChange={(val) => setItemType(val as ItemType)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ITEM_TYPE_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    placeholder="Duration (min)"
                                    disabled={isSubmitting}
                                    className="w-28 h-8 text-xs"
                                    min={0}
                                    max={999}
                                />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <Button
                                size="sm"
                                onClick={handleSubmit}
                                disabled={!title.trim() || isSubmitting}
                                className="h-8 px-3"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    "Add"
                                )}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isSubmitting}
                                className="h-8 w-8 p-0"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default state - ghost divider with hover effect
    return (
        <div
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Invisible hit area */}
            <div className="h-3 -my-1.5 cursor-pointer" onClick={() => setIsExpanded(true)}>
                {/* The horizontal line */}
                <div
                    className={cn(
                        "absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 rounded-full transition-all duration-150",
                        isHovered
                            ? "bg-primary/40"
                            : "bg-transparent"
                    )}
                />
                {/* The centered + button */}
                <div
                    className={cn(
                        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                        "flex items-center justify-center w-5 h-5 rounded-full",
                        "bg-primary text-primary-foreground shadow-sm",
                        "transition-all duration-150",
                        isHovered
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-75"
                    )}
                >
                    <Plus className="h-3 w-3" />
                </div>
            </div>
        </div>
    );
}
