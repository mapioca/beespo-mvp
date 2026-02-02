"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, Layers, Puzzle, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DraggableToolboxItem } from "./draggable-toolbox-item";
import { ToolboxItem, ProceduralItemType, ItemConfig } from "./types";
import { CreateItemTypeDialog } from "./create-item-type-dialog";

interface ToolboxPaneProps {
    onItemsLoaded?: (items: ToolboxItem[]) => void;
}

interface CategoryGroup {
    id: string;
    label: string;
    icon: React.ReactNode;
    items: ToolboxItem[];
    showAddButton?: boolean;
}

// Define the order of core items for Standard Elements
const CORE_ITEM_ORDER = [
    "core-prayer",
    "core-speaker",
    "core-hymn",
    "core-discussions",
    "core-ward-business",
    "core-announcements",
];

// Helper to get item config from procedural type
function getItemConfigFromType(pt: ProceduralItemType): ItemConfig {
    return {
        requires_assignee: pt.requires_assignee ?? false,
        requires_resource: pt.requires_resource ?? false,
        has_rich_text: pt.has_rich_text ?? false,
    };
}

// Determine the toolbox item type based on the procedural item
function getToolboxItemType(pt: ProceduralItemType): "procedural" | "container" | "speaker" {
    // Speaker type
    if (pt.id === "core-speaker" || pt.has_rich_text) {
        return "speaker";
    }
    // Container types
    if (pt.id === "core-discussions" || pt.id === "core-ward-business" || pt.id === "core-announcements") {
        return "container";
    }
    return "procedural";
}

// Get container type for container items
function getContainerType(pt: ProceduralItemType): "discussion" | "business" | "announcement" | undefined {
    if (pt.id === "core-discussions") return "discussion";
    if (pt.id === "core-ward-business") return "business";
    if (pt.id === "core-announcements") return "announcement";
    return undefined;
}

export function ToolboxPane({ onItemsLoaded }: ToolboxPaneProps) {
    const [search, setSearch] = useState("");
    const [coreTypes, setCoreTypes] = useState<ProceduralItemType[]>([]);
    const [customTypes, setCustomTypes] = useState<ProceduralItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Load item types
    useEffect(() => {
        const loadItemTypes = async () => {
            const supabase = createClient();

            // Get user's workspace ID
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase.from("profiles") as any)
                    .select("workspace_id")
                    .eq("id", user.id)
                    .single();

                if (profile?.workspace_id) {
                    setWorkspaceId(profile.workspace_id);
                }
            }

            // Fetch core items (global)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: coreData, error: coreError } = await (supabase.from("procedural_item_types") as any)
                .select("*")
                .eq("is_core", true)
                .order("order_hint");

            if (!coreError && coreData) {
                setCoreTypes(coreData);
            }

            // Fetch custom items (workspace-scoped)
            if (workspaceId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: customData, error: customError } = await (supabase.from("procedural_item_types") as any)
                    .select("*")
                    .eq("workspace_id", workspaceId)
                    .eq("is_custom", true)
                    .order("name");

                if (!customError && customData) {
                    setCustomTypes(customData);
                }
            }

            setIsLoading(false);
        };

        loadItemTypes();
    }, [workspaceId]);

    // Reload custom types when workspace changes or dialog closes
    const reloadCustomTypes = useCallback(async () => {
        if (!workspaceId) return;

        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("procedural_item_types") as any)
            .select("*")
            .eq("workspace_id", workspaceId)
            .eq("is_custom", true)
            .order("name");

        if (!error && data) {
            setCustomTypes(data);
        }
    }, [workspaceId]);

    // Transform procedural types into toolbox items
    const toolboxItems = useMemo((): ToolboxItem[] => {
        const items: ToolboxItem[] = [];

        // Add core items in defined order
        const sortedCoreTypes = [...coreTypes].sort((a, b) => {
            const aIndex = CORE_ITEM_ORDER.indexOf(a.id);
            const bIndex = CORE_ITEM_ORDER.indexOf(b.id);
            return aIndex - bIndex;
        });

        sortedCoreTypes.forEach((pt) => {
            const itemType = getToolboxItemType(pt);
            const containerType = getContainerType(pt);

            items.push({
                id: pt.id,
                type: itemType,
                category: containerType || (itemType === "speaker" ? "speaker" : "procedural"),
                title: pt.name,
                description: pt.description,
                duration_minutes: pt.default_duration_minutes || 5,
                procedural_item_type_id: pt.id,
                is_hymn: pt.is_hymn ?? false,
                requires_participant: pt.requires_assignee ?? false,
                containerType,
                config: getItemConfigFromType(pt),
                is_core: true,
                is_custom: false,
                icon: pt.icon,
            });
        });

        // Add custom items
        customTypes.forEach((pt) => {
            const itemType = pt.has_rich_text ? "speaker" : "procedural";

            items.push({
                id: pt.id,
                type: itemType,
                category: itemType === "speaker" ? "speaker" : "procedural",
                title: pt.name,
                description: pt.description,
                duration_minutes: pt.default_duration_minutes || 5,
                procedural_item_type_id: pt.id,
                is_hymn: pt.requires_resource ?? false,
                requires_participant: pt.requires_assignee ?? false,
                config: getItemConfigFromType(pt),
                is_core: false,
                is_custom: true,
                icon: pt.icon,
            });
        });

        return items;
    }, [coreTypes, customTypes]);

    // Notify parent when items are loaded
    useEffect(() => {
        if (!isLoading && toolboxItems.length > 0) {
            onItemsLoaded?.(toolboxItems);
        }
    }, [isLoading, toolboxItems, onItemsLoaded]);

    // Group items into 2 categories
    const categoryGroups = useMemo((): CategoryGroup[] => {
        const groups: CategoryGroup[] = [];

        // Standard Items (core items)
        const standardItems = toolboxItems.filter((i) => i.is_core);
        if (standardItems.length > 0) {
            groups.push({
                id: "standard",
                label: "Standard Items",
                icon: <Layers className="h-4 w-4 text-blue-500" />,
                items: standardItems,
            });
        }

        // Custom Items (workspace-scoped)
        const customItems = toolboxItems.filter((i) => i.is_custom);
        groups.push({
            id: "custom",
            label: "Custom Items",
            icon: <Puzzle className="h-4 w-4 text-purple-500" />,
            items: customItems,
            showAddButton: true,
        });

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
            .filter((group) => group.items.length > 0 || group.showAddButton);
    }, [categoryGroups, search]);

    // Handle custom item created
    const handleItemCreated = useCallback(() => {
        reloadCustomTypes();
        setIsCreateDialogOpen(false);
    }, [reloadCustomTypes]);

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
                                        <div className="flex items-center gap-2 flex-1">
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
                                            {group.showAddButton && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full mt-2 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setIsCreateDialogOpen(true)}
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                    New Item Type
                                                </Button>
                                            )}
                                            {group.items.length === 0 && !group.showAddButton && (
                                                <div className="text-xs text-muted-foreground text-center py-2">
                                                    No items in this category
                                                </div>
                                            )}
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

            {/* Create Item Type Dialog */}
            <CreateItemTypeDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                workspaceId={workspaceId}
                onCreated={handleItemCreated}
            />
        </div>
    );
}
