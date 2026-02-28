"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    MagnifyingGlassIcon,
    CheckIcon,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface Announcement {
    id: string;
    title: string;
    content: string | null;
    status: string;
    priority: string;
}

export interface AnnouncementSelection {
    id: string;
    title: string;
    description: string | null;
    priority: string;
}

interface AnnouncementSelectorPopoverProps {
    children: React.ReactNode;
    onSelect: (announcements: AnnouncementSelection[]) => void;
}

const PRIORITY_OPTIONS = [
    { value: "all", label: "All Priorities" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
];

const PRIORITY_COLORS: Record<string, string> = {
    high: "bg-red-100 text-red-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600",
};

export function AnnouncementSelectorPopover({
    children,
    onSelect,
}: AnnouncementSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState("");
    const [selectedPriority, setSelectedPriority] = useState("all");

    useEffect(() => {
        if (open && announcements.length === 0) {
            loadAnnouncements();
        }
    }, [open, announcements.length]);

    // Reset state every time popover opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedPriority("all");
            setSelectedIds(new Set());
        }
    }, [open]);

    const loadAnnouncements = async () => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            let workspaceId: string | null = null;

            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase.from("profiles") as any)
                    .select("workspace_id")
                    .eq("id", user.id)
                    .single();
                workspaceId = profile?.workspace_id ?? null;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let query = (supabase.from("announcements") as any)
                .select("id, title, content, status, priority")
                .eq("status", "active")
                .order("priority", { ascending: true })
                .order("created_at", { ascending: false });

            if (workspaceId) {
                query = query.eq("workspace_id", workspaceId);
            }

            const { data, error } = await query;
            if (error) console.error("Error loading announcements:", error);
            if (data) setAnnouncements(data);
        } catch (err) {
            console.error("Error loading announcements:", err);
        }

        setIsLoading(false);
    };

    const filtered = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return announcements.filter((a) => {
            if (selectedPriority !== "all" && a.priority !== selectedPriority) return false;
            if (!searchLower) return true;
            return (
                a.title.toLowerCase().includes(searchLower) ||
                (a.content?.toLowerCase().includes(searchLower) ?? false)
            );
        });
    }, [announcements, search, selectedPriority]);

    const toggleItem = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        const selected = announcements.filter((a) => selectedIds.has(a.id));
        onSelect(selected.map((a) => ({
            id: a.id,
            title: a.title,
            description: a.content,
            priority: a.priority,
        })));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                {children}
            </PopoverTrigger>
            <PopoverContent
                side="left"
                align="start"
                className="w-[340px] p-4 flex flex-col gap-3 shadow-xl"
            >
                {/* Filters */}
                <div className="space-y-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Priority
                        </label>
                        <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                                {PRIORITY_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Search
                        </label>
                        <div className="relative">
                            <MagnifyingGlassIcon
                                weight="bold"
                                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                            />
                            <Input
                                placeholder="Search announcements..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-8 h-8 text-xs"
                                autoFocus={open}
                            />
                        </div>
                    </div>
                </div>

                {/* Results */}
                <ScrollArea className="h-[240px] border-t pt-2 w-full">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                            Loading announcements...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                            No announcements found
                        </div>
                    ) : (
                        <div className="flex flex-col gap-1 pr-3">
                            {filtered.map((item) => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => toggleItem(item.id)}
                                        className={cn(
                                            "w-full text-left p-2.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2.5 group",
                                            isSelected && "bg-accent/60 border border-border"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-4 w-4 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground"
                                                : "border-border bg-background"
                                        )}>
                                            {isSelected && <CheckIcon weight="bold" className="h-2.5 w-2.5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium truncate">
                                                    {item.title}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        "text-[10px] px-1.5 py-0 shrink-0 capitalize",
                                                        PRIORITY_COLORS[item.priority] || ""
                                                    )}
                                                >
                                                    {item.priority}
                                                </Badge>
                                            </div>
                                            {item.content && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {item.content}
                                                </p>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Confirm */}
                <div className="border-t pt-3">
                    <Button
                        type="button"
                        size="sm"
                        className="w-full h-8 text-xs"
                        disabled={selectedIds.size === 0}
                        onClick={handleConfirm}
                    >
                        Add {selectedIds.size > 0 ? `${selectedIds.size} ` : ""}
                        {selectedIds.size === 1 ? "announcement" : "announcements"}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
