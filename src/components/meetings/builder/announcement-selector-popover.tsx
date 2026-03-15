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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { Plus, X, Search, Check, Megaphone } from "lucide-react";

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

    // Creation state
    const [isCreating, setIsCreating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newContent, setNewContent] = useState("");
    const [newPriority, setNewPriority] = useState("medium");
    const [displayStart, setDisplayStart] = useState("");
    const [displayUntil, setDisplayUntil] = useState("");

    // Template linking state
    const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);

    useEffect(() => {
        if (open && announcements.length === 0) {
            loadAnnouncements();
        }
        if (open && templates.length === 0) {
            loadTemplates();
        }
    }, [open, announcements.length, templates.length]);

    // Reset state every time popover opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedPriority("all");
            setSelectedIds(new Set());
            // Reset creation state as well
            setNewTitle("");
            setNewContent("");
            setNewPriority("medium");
            setDisplayStart("");
            setDisplayUntil("");
            setSelectedTemplateIds([]);
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

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        const supabase = createClient();
        try {
            const { data, error } = await supabase
                .from("templates")
                .select("id, name")
                .order("name");

            if (error) {
                console.error("Error loading templates:", error);
            } else {
                setTemplates(data || []);
            }
        } catch (err) {
            console.error("Error loading templates:", err);
        }
        setLoadingTemplates(false);
    };

    const toggleTemplate = (templateId: string) => {
        setSelectedTemplateIds((prev) =>
            prev.includes(templateId)
                ? prev.filter((id) => id !== templateId)
                : [...prev, templateId]
        );
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

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setIsSubmitting(true);

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            toast.error("Not authenticated.");
            setIsSubmitting(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            toast.error("Could not determine workspace.");
            setIsSubmitting(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("announcements") as any)
            .insert({
                title: newTitle.trim(),
                content: newContent.trim() || null,
                priority: newPriority,
                status: "active",
                display_start: displayStart || null,
                display_until: displayUntil || null,
                workspace_id: profile.workspace_id,
                created_by: user.id,
            })
            .select()
            .single();

        if (!error && data) {
            // Link announcement to selected templates
            if (selectedTemplateIds.length > 0) {
                for (const templateId of selectedTemplateIds) {
                    await (supabase
                        .from("announcement_templates") as ReturnType<typeof supabase.from>)
                        .insert({
                            announcement_id: data.id,
                            template_id: templateId,
                        });
                }
            }

            setAnnouncements((prev) => [data, ...prev]);
            setSelectedIds((prev) => new Set(prev).add(data.id));
            setIsCreating(false);
            setNewTitle("");
            setNewContent("");
            setNewPriority("medium");
            setDisplayStart("");
            setDisplayUntil("");
            setSelectedTemplateIds([]);
            toast.success("Announcement created.");
        } else if (error) {
            toast.error("Failed to create announcement.", { description: error.message });
        }

        setIsSubmitting(false);
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
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {isCreating ? "New Announcement" : "Select Announcements"}
                    </h3>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setIsCreating(!isCreating)}
                    >
                        {isCreating ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>

                {isCreating ? (
                    <ScrollArea className="h-[400px] w-full pr-3">
                        <div className="space-y-3 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Title
                                </Label>
                                <Input
                                    placeholder="e.g. Ward Picnic"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="h-8 text-xs"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Priority
                                </Label>
                                <Select value={newPriority} onValueChange={setNewPriority}>
                                    <SelectTrigger className="h-8 w-full text-xs">
                                        <SelectValue placeholder="Select priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITY_OPTIONS.filter(o => o.value !== "all").map((opt) => (
                                            <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                                {opt.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Content (Optional)
                                </Label>
                                <textarea
                                    placeholder="Details about the announcement..."
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Display Start
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={displayStart}
                                        onChange={(e) => setDisplayStart(e.target.value)}
                                        className="h-8 text-[10px] px-2"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Display Until
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={displayUntil}
                                        onChange={(e) => setDisplayUntil(e.target.value)}
                                        className="h-8 text-[10px] px-2"
                                    />
                                </div>
                            </div>

                            {/* Template Association */}
                            <div className="space-y-2 pt-2 border-t mt-2">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-3 w-3 text-amber-500" />
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        Applies to Templates
                                    </Label>
                                </div>

                                {loadingTemplates ? (
                                    <p className="text-[10px] text-muted-foreground">Loading templates...</p>
                                ) : templates.length === 0 ? (
                                    <p className="text-[10px] text-muted-foreground">No templates available.</p>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md">
                                        {templates.map((template) => (
                                            <div key={template.id} className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`template-${template.id}`}
                                                    checked={selectedTemplateIds.includes(template.id)}
                                                    onCheckedChange={() => toggleTemplate(template.id)}
                                                    className="h-3.5 w-3.5"
                                                />
                                                <Label
                                                    htmlFor={`template-${template.id}`}
                                                    className="text-[11px] cursor-pointer truncate"
                                                >
                                                    {template.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={handleCreate}
                                    disabled={!newTitle.trim() || isSubmitting}
                                >
                                    {isSubmitting ? "Creating..." : "Create & Select"}
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                ) : (
                    <>
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
                                    <Search
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
                                                    {isSelected && <Check className="h-2.5 w-2.5" />}
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
                    </>
                )}
            </PopoverContent>
        </Popover>
    );
}
