"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Music, BookOpen, User, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DraggableToolboxItem } from "./draggable-toolbox-item";
import { ToolboxItem, ProceduralItemType } from "./types";

interface ToolboxPaneProps {
    onItemsLoaded?: (items: ToolboxItem[]) => void;
}

interface CategoryGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: ToolboxItem[];
}

export function ToolboxPane({ onItemsLoaded }: ToolboxPaneProps) {
    const [search, setSearch] = useState("");
    const [proceduralTypes, setProceduralTypes] = useState<ProceduralItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProceduralTypes = async () => {
            const supabase = createClient();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("procedural_item_types") as any)
                .select("*")
                .order("order_hint");

            if (!error && data) {
                setProceduralTypes(data);
            }
            setIsLoading(false);
        };

        loadProceduralTypes();
    }, []);

    // Transform procedural types into toolbox items
    const toolboxItems = useMemo((): ToolboxItem[] => {
        const items: ToolboxItem[] = [];

        // Add procedural items
        proceduralTypes.forEach((pt) => {
            const itemName = pt.name.toLowerCase();
            const isHymn = pt.is_hymn || itemName.includes("hymn") || itemName.includes("song");
            const requiresParticipant =
                itemName.includes("prayer") ||
                itemName.includes("preside") ||
                itemName.includes("conduct") ||
                itemName.includes("invocation") ||
                itemName.includes("benediction") ||
                itemName.includes("spiritual thought") ||
                itemName.includes("testimony");

            items.push({
                id: pt.id,
                type: "procedural",
                category: "procedural",
                title: pt.name,
                description: pt.description,
                duration_minutes: pt.default_duration_minutes || 5,
                procedural_item_type_id: pt.id,
                is_hymn: isHymn,
                requires_participant: requiresParticipant,
            });
        });

        // Add speaker templates
        const speakerTemplates = [
            { id: "speaker-template", title: "Speaker", duration: 10 },
            { id: "youth-speaker-template", title: "Youth Speaker", duration: 5 },
            { id: "high-council-template", title: "High Council Speaker", duration: 15 },
            { id: "missionary-template", title: "Returning Missionary", duration: 10 },
        ];

        speakerTemplates.forEach((st) => {
            items.push({
                id: st.id,
                type: "speaker",
                category: "speaker",
                title: st.title,
                duration_minutes: st.duration,
            });
        });

        // Add container templates
        items.push({
            id: "discussion-container",
            type: "container",
            category: "discussion",
            title: "Discussions",
            duration_minutes: 15,
            containerType: "discussion",
        });

        items.push({
            id: "business-container",
            type: "container",
            category: "business",
            title: "Ward Business",
            duration_minutes: 10,
            containerType: "business",
        });

        items.push({
            id: "announcement-container",
            type: "container",
            category: "announcement",
            title: "Announcements",
            duration_minutes: 5,
            containerType: "announcement",
        });

        return items;
    }, [proceduralTypes]);

    // Notify parent when items are loaded
    useEffect(() => {
        if (!isLoading && toolboxItems.length > 0) {
            onItemsLoaded?.(toolboxItems);
        }
    }, [isLoading, toolboxItems, onItemsLoaded]);

    // Group items by category
    const categoryGroups = useMemo((): CategoryGroup[] => {
        const groups: CategoryGroup[] = [];

        // Worship (hymns)
        const hymnItems = toolboxItems.filter((i) => i.is_hymn);
        if (hymnItems.length > 0) {
            groups.push({
                id: "worship",
                label: "Worship & Music",
                icon: <Music className="h-4 w-4 text-blue-500" />,
                items: hymnItems,
            });
        }

        // Procedural (non-hymn)
        const proceduralItems = toolboxItems.filter(
            (i) => i.category === "procedural" && !i.is_hymn
        );
        if (proceduralItems.length > 0) {
            groups.push({
                id: "procedural",
                label: "Procedural",
                icon: <BookOpen className="h-4 w-4 text-slate-500" />,
                items: proceduralItems,
            });
        }

        // Speakers
        const speakerItems = toolboxItems.filter((i) => i.category === "speaker");
        if (speakerItems.length > 0) {
            groups.push({
                id: "speakers",
                label: "Speakers",
                icon: <User className="h-4 w-4 text-pink-500" />,
                items: speakerItems,
            });
        }

        // Containers (Business, Announcements, Discussions)
        const containerItems = toolboxItems.filter((i) => i.type === "container");
        if (containerItems.length > 0) {
            groups.push({
                id: "containers",
                label: "Business & Announcements",
                icon: <Megaphone className="h-4 w-4 text-orange-500" />,
                items: containerItems,
            });
        }

        return groups;
    }, [toolboxItems]);

    // Filter by search
    const filteredGroups = useMemo(() => {
        if (!search.trim()) return categoryGroups;

        const searchLower = search.toLowerCase();
        return categoryGroups
            .map((group) => ({
                ...group,
                items: group.items.filter((item) =>
                    item.title.toLowerCase().includes(searchLower)
                ),
            }))
            .filter((group) => group.items.length > 0);
    }, [categoryGroups, search]);

    return (
        <div className="flex flex-col h-full bg-muted/30 border-r">
            {/* Header */}
            <div className="p-4 border-b bg-background">
                <h3 className="font-semibold text-sm mb-3">Item Library</h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </div>

            {/* Items */}
            <ScrollArea className="flex-1">
                <div className="p-2">
                    {isLoading ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            Loading items...
                        </div>
                    ) : filteredGroups.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No items found
                        </div>
                    ) : (
                        <Accordion
                            type="multiple"
                            defaultValue={filteredGroups.map((g) => g.id)}
                            className="space-y-1"
                        >
                            {filteredGroups.map((group) => (
                                <AccordionItem
                                    key={group.id}
                                    value={group.id}
                                    className="border rounded-md bg-background"
                                >
                                    <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                                        <div className="flex items-center gap-2">
                                            {group.icon}
                                            <span>{group.label}</span>
                                            <span className="text-xs text-muted-foreground">
                                                ({group.items.length})
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-2 pb-2">
                                        <div className="space-y-1.5">
                                            {group.items.map((item) => (
                                                <DraggableToolboxItem
                                                    key={item.id}
                                                    item={item}
                                                />
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </ScrollArea>

            {/* Hint */}
            <div className="p-3 border-t bg-background">
                <p className="text-xs text-muted-foreground text-center">
                    Drag items onto the agenda canvas
                </p>
            </div>
        </div>
    );
}
