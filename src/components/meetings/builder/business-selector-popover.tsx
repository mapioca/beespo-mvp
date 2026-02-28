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

interface BusinessItem {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
    status: string;
}

export interface BusinessSelection {
    id: string;
    person_name: string;
    position_calling: string | null;
    category: string;
    notes: string | null;
}

interface BusinessSelectorPopoverProps {
    children: React.ReactNode;
    onSelect: (items: BusinessSelection[]) => void;
}

const CATEGORY_OPTIONS = [
    { value: "all", label: "All Categories" },
    { value: "ordination", label: "Ordination" },
    { value: "setting_apart", label: "Setting Apart" },
    { value: "release", label: "Release" },
    { value: "sustaining", label: "Sustaining" },
    { value: "new_member_welcome", label: "New Member Welcome" },
    { value: "other", label: "Other" },
];

export function BusinessSelectorPopover({
    children,
    onSelect,
}: BusinessSelectorPopoverProps) {
    const [open, setOpen] = useState(false);
    const [items, setItems] = useState<BusinessItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    useEffect(() => {
        if (open && items.length === 0) {
            loadItems();
        }
    }, [open, items.length]);

    // Reset state every time popover opens
    useEffect(() => {
        if (open) {
            setSearch("");
            setSelectedCategory("all");
            setSelectedIds(new Set());
        }
    }, [open]);

    const loadItems = async () => {
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
            let query = (supabase.from("business_items") as any)
                .select("id, person_name, position_calling, category, notes, status")
                .eq("status", "pending")
                .order("created_at", { ascending: false });

            if (workspaceId) {
                query = query.eq("workspace_id", workspaceId);
            }

            const { data, error } = await query;
            if (error) console.error("Error loading business items:", error);
            if (data) setItems(data);
        } catch (err) {
            console.error("Error loading business items:", err);
        }

        setIsLoading(false);
    };

    const filtered = useMemo(() => {
        const searchLower = search.toLowerCase().trim();
        return items.filter((item) => {
            if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
            if (!searchLower) return true;
            return (
                item.person_name.toLowerCase().includes(searchLower) ||
                (item.position_calling?.toLowerCase().includes(searchLower) ?? false) ||
                (item.notes?.toLowerCase().includes(searchLower) ?? false)
            );
        });
    }, [items, search, selectedCategory]);

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
        const selected = items.filter((item) => selectedIds.has(item.id));
        onSelect(selected.map(({ id, person_name, position_calling, category, notes }) => ({
            id, person_name, position_calling, category, notes,
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
                            Category
                        </label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger className="h-8 w-full text-xs">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                {CATEGORY_OPTIONS.map((opt) => (
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
                                placeholder="Search by name or calling..."
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
                            Loading business items...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground flex items-center justify-center h-full">
                            No business items found
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
                                                    {item.person_name}
                                                    {item.position_calling ? ` — ${item.position_calling}` : ""}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] px-1.5 py-0 shrink-0 capitalize"
                                                >
                                                    {item.category.replace(/_/g, " ")}
                                                </Badge>
                                            </div>
                                            {item.notes && (
                                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                    {item.notes}
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
                        {selectedIds.size === 1 ? "business item" : "business items"}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
