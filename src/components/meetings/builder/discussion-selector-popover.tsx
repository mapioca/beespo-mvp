"use client";

import { useState, useEffect, useMemo } from "react";
import { canEdit } from "@/lib/auth/role-permissions";
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
import { Textarea } from "@/components/ui/textarea";
import { Search, Check, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface Discussion {
    id: string;
    title: string;
    description: string | null;
    status: string;
}

export interface DiscussionSelection {
    id: string;
    title: string;
    description: string | null;
    status: string;
}

interface DiscussionSelectorPopoverProps {
    children: React.ReactNode;
    onSelect: (discussions: DiscussionSelection[]) => void;
}

const STATUS_OPTIONS = [
    { value: "all", label: "All Statuses" },
    { value: "new", label: "New" },
    { value: "active", label: "Active" },
    { value: "decision_required", label: "Decision Required" },
];

const STATUS_COLORS: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    decision_required: "bg-amber-100 text-amber-700",
};

const CREATE_STATUS_OPTIONS = [
    { value: "new", label: "New" },
    { value: "active", label: "Active" },
    { value: "decision_required", label: "Decision Required" },
    { value: "monitoring", label: "Monitoring" },
    { value: "resolved", label: "Resolved" },
    { value: "deferred", label: "Deferred" },
];

const CREATE_PRIORITY_OPTIONS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
];

const CREATE_CATEGORY_OPTIONS = [
    { value: "member_concerns", label: "Member Concerns" },
    { value: "activities", label: "Activities" },
    { value: "service_opportunities", label: "Service Opportunities" },
    { value: "callings", label: "Callings" },
    { value: "temple_work", label: "Temple Work" },
    { value: "budget", label: "Budget" },
    { value: "facilities", label: "Facilities" },
    { value: "youth", label: "Youth" },
    { value: "mission_work", label: "Mission Work" },
    { value: "other", label: "Other" },
];

export function DiscussionSelectorPopover({
    children,
    onSelect,
}: DiscussionSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [discussions, setDiscussions] = useState<Discussion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newStatus, setNewStatus] = useState("new");
    const [newPriority, setNewPriority] = useState("medium");
    const [newCategory, setNewCategory] = useState("member_concerns");
    const [isCreatingDiscussion, setIsCreatingDiscussion] = useState(false);

    const [search, setSearch] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("all");

    useEffect(() => {
        if (open && discussions.length === 0) {
            loadDiscussions();
        }
    }, [open, discussions.length]);

    // Reset state every time popover opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedStatus("all");
            setSelectedIds(new Set());
            setIsCreating(false);
            setNewTitle("");
            setNewDescription("");
            setNewStatus("new");
            setNewPriority("medium");
            setNewCategory("member_concerns");
        }
    }, [open]);

    const loadDiscussions = async () => {
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
            let query = (supabase.from("discussions") as any)
                .select("id, title, description, status")
                .in("status", ["new", "active", "decision_required"])
                .order("created_at", { ascending: false });

            if (workspaceId) {
                query = query.eq("workspace_id", workspaceId);
            }

            const { data, error } = await query;
            if (error) console.error("Error loading discussions:", error);
            if (data) setDiscussions(data);
        } catch (err) {
            console.error("Error loading discussions:", err);
        }

        setIsLoading(false);
    };

    const filtered = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return discussions.filter((d) => {
            if (selectedStatus !== "all" && d.status !== selectedStatus) return false;
            if (!searchLower) return true;
            return (
                d.title.toLowerCase().includes(searchLower) ||
                (d.description?.toLowerCase().includes(searchLower) ?? false)
            );
        });
    }, [discussions, search, selectedStatus]);

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
        const selected = discussions.filter((d) => selectedIds.has(d.id));
        onSelect(selected);
        setOpen(false);
    };

    const handleCreateDiscussion = async () => {
        const title = newTitle.trim();
        if (!title) return;

        setIsCreatingDiscussion(true);
        const supabase = createClient();

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Not authenticated. Please log in again.");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase.from("profiles") as any)
                .select("workspace_id, role")
                .eq("id", user.id)
                .single();

            if (!canEdit(profile?.role)) {
                toast.error("You do not have permission to create discussions.");
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("discussions") as any)
                .insert({
                    title,
                    description: newDescription.trim() || null,
                    status: newStatus,
                    priority: newPriority,
                    category: newCategory,
                    workspace_id: profile.workspace_id,
                    created_by: user.id,
                })
                .select("id, title, description, status")
                .single();

            if (error || !data) {
                toast.error(error?.message || "Failed to create discussion.");
                return;
            }

            setDiscussions((prev) => [data, ...prev]);
            onSelect([data as DiscussionSelection]);
            toast.success("Discussion created and added.");
            setOpen(false);
        } catch {
            toast.error("Failed to create discussion.");
        } finally {
            setIsCreatingDiscussion(false);
        }
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
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {isCreating ? "Create Discussion" : "Select Discussion"}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            className="h-6 w-6"
                            onClick={() => setIsCreating((prev) => !prev)}
                        >
                            <UserPlus className={cn("h-4 w-4", isCreating ? "text-primary" : "text-muted-foreground")} />
                        </Button>
                    </div>
                </div>

                {isCreating ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Title
                            </label>
                            <Input
                                placeholder="New discussion title..."
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Description (optional)
                            </label>
                            <Textarea
                                placeholder="What should be discussed?"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                rows={3}
                                className="text-xs resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Status
                                </label>
                                <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CREATE_STATUS_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Priority
                                </label>
                                <Select value={newPriority} onValueChange={setNewPriority}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CREATE_PRIORITY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Category
                                </label>
                                <Select value={newCategory} onValueChange={setNewCategory}>
                                    <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CREATE_CATEGORY_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 flex-1 text-xs"
                                onClick={handleCreateDiscussion}
                                disabled={!newTitle.trim() || isCreatingDiscussion}
                            >
                                {isCreatingDiscussion ? "Creating..." : "Create & Add"}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                    setIsCreating(false);
                                    setNewTitle("");
                                    setNewDescription("");
                                    setNewStatus("new");
                                    setNewPriority("medium");
                                    setNewCategory("member_concerns");
                                }}
                                disabled={isCreatingDiscussion}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Filters */}
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Status
                                </label>
                                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue placeholder="All Statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {STATUS_OPTIONS.map((opt) => (
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
                                    <Search
                                        className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                                    />
                                    <Input
                                        placeholder="Search discussions..."
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
                                    Loading discussions...
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                                    No discussions found
                                </div>
                            ) : (
                                <div className="flex flex-col gap-1 pr-3">
                                    {filtered.map((disc) => {
                                        const isSelected = selectedIds.has(disc.id);
                                        return (
                                            <button
                                                key={disc.id}
                                                type="button"
                                                onClick={() => toggleItem(disc.id)}
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
                                                    {isSelected && <Check className="h-2.5 w-2.5" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-medium truncate">
                                                            {disc.title}
                                                        </span>
                                                        <Badge
                                                            variant="secondary"
                                                            className={cn(
                                                                "text-[10px] px-1.5 py-0 shrink-0",
                                                                STATUS_COLORS[disc.status] || ""
                                                            )}
                                                        >
                                                            {disc.status.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                    {disc.description && (
                                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {disc.description}
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
                                {selectedIds.size === 1 ? "discussion" : "discussions"}
                            </Button>
                        </div>
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
