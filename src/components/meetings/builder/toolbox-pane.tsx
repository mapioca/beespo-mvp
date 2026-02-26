"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MagnifyingGlassIcon, PlusIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { DraggableToolboxItem } from "./draggable-toolbox-item";
import { ToolboxItem, ProceduralItemType, ItemConfig, CategoryType } from "./types";
import { CreateItemTypeDialog } from "./create-item-type-dialog";

interface ToolboxPaneProps {
    onItemsLoaded?: (items: ToolboxItem[]) => void;
    onAddItem?: (item: ToolboxItem) => void;
}

interface CategoryGroup {
    id: string;
    label: string;
    items: ToolboxItem[];
    showAddButton?: boolean;
}

// Display order for standard items by name
const STANDARD_ITEM_ORDER = [
    "Hymn",
    "Prayer",
    "Speaker",
    "Discussions",
    "Ward Business",
    "Announcements",
];

// Container names mapped to their container types
const CONTAINER_NAME_MAP: Record<string, "discussion" | "business" | "announcement"> = {
    "Discussions": "discussion",
    "Ward Business": "business",
    "Announcements": "announcement",
};

// Helper to check if a procedural type is a standard (global) item
function isStandardItem(pt: ProceduralItemType): boolean {
    return !pt.is_custom && pt.workspace_id === null;
}

// Helper to get item config from procedural type
function getItemConfigFromType(pt: ProceduralItemType): ItemConfig {
    return {
        requires_assignee: pt.requires_assignee ?? false,
        requires_resource: pt.requires_resource ?? false,
        has_rich_text: pt.has_rich_text ?? false,
    };
}

// Determine the toolbox item type based on the procedural item's properties
function getToolboxItemType(pt: ProceduralItemType): "procedural" | "container" | "speaker" {
    // Container types: detected by name
    if (pt.name in CONTAINER_NAME_MAP) {
        return "container";
    }
    // Speaker type: items named "Speaker" that are core items
    if (pt.name === "Speaker" && !pt.is_custom) {
        return "speaker";
    }
    return "procedural";
}

// Get container type for container items based on name
function getContainerType(pt: ProceduralItemType): "discussion" | "business" | "announcement" | undefined {
    return CONTAINER_NAME_MAP[pt.name];
}

export function ToolboxPane({ onItemsLoaded, onAddItem }: ToolboxPaneProps) {
    const [search, setSearch] = useState("");
    const [standardTypes, setStandardTypes] = useState<ProceduralItemType[]>([]);
    const [customTypes, setCustomTypes] = useState<ProceduralItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<ToolboxItem | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    // Load item types
    useEffect(() => {
        const loadItemTypes = async () => {
            const supabase = createClient();

            // Get user's workspace ID
            const { data: { user } } = await supabase.auth.getUser();
            let userWorkspaceId: string | null = null;

            if (user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: profile } = await (supabase.from("profiles") as any)
                    .select("workspace_id")
                    .eq("id", user.id)
                    .single();

                if (profile?.workspace_id) {
                    userWorkspaceId = profile.workspace_id;
                    setWorkspaceId(profile.workspace_id);
                }
            }

            // Fetch all accessible procedural item types in one query
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: allTypes, error } = await (supabase.from("procedural_item_types") as any)
                .select("*")
                .order("order_hint");

            if (!error && allTypes) {
                // Split into standard and custom using client-side filtering
                const standard = (allTypes as ProceduralItemType[]).filter(
                    (t) => isStandardItem(t)
                );
                const custom = (allTypes as ProceduralItemType[]).filter(
                    (t) => t.is_custom === true && t.workspace_id === userWorkspaceId
                );
                setStandardTypes(standard);
                setCustomTypes(custom);
            }

            setIsLoading(false);
        };

        loadItemTypes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

        // Add standard items sorted by defined display order
        const sortedStandardTypes = [...standardTypes].sort((a, b) => {
            const aIndex = STANDARD_ITEM_ORDER.indexOf(a.name);
            const bIndex = STANDARD_ITEM_ORDER.indexOf(b.name);
            // Items not in the order list go to the end, sorted by order_hint
            const aPos = aIndex === -1 ? 999 + (a.order_hint ?? 0) : aIndex;
            const bPos = bIndex === -1 ? 999 + (b.order_hint ?? 0) : bIndex;
            return aPos - bPos;
        });

        sortedStandardTypes.forEach((pt) => {
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
            const itemType = getToolboxItemType(pt);
            const containerType = getContainerType(pt);

            items.push({
                id: pt.id,
                type: itemType,
                category: pt.category as CategoryType || containerType || (itemType === "speaker" ? "speaker" : "procedural"),
                title: pt.name,
                description: pt.description,
                duration_minutes: pt.default_duration_minutes || 5,
                procedural_item_type_id: pt.id,
                is_hymn: pt.is_hymn ?? (pt.requires_resource ?? false),
                requires_participant: pt.requires_assignee ?? false,
                containerType,
                config: getItemConfigFromType(pt),
                is_core: false,
                is_custom: true,
                icon: pt.icon,
            });
        });

        // Add structural items statically
        items.push({
            id: "struct_header",
            type: "structural",
            category: "structural",
            title: "Section Header",
            description: "Adds a heading to organize your agenda",
            duration_minutes: 0,
            structural_type: "section_header",
            is_core: true,
            is_custom: false,
        });

        items.push({
            id: "struct_divider",
            type: "structural",
            category: "structural",
            title: "Divider",
            description: "Adds a horizontal line to separate sections",
            duration_minutes: 0,
            structural_type: "divider",
            is_core: true,
            is_custom: false,
        });

        return items;
    }, [standardTypes, customTypes]);

    // Notify parent when items are loaded
    useEffect(() => {
        if (!isLoading && toolboxItems.length > 0) {
            onItemsLoaded?.(toolboxItems);
        }
    }, [isLoading, toolboxItems, onItemsLoaded]);

    // Group items into categories
    const categoryGroups = useMemo((): CategoryGroup[] => {
        const groups: CategoryGroup[] = [];

        // Standard Items (core items)
        const standardItems = toolboxItems.filter((i) => i.is_core && i.type !== "structural");
        if (standardItems.length > 0) {
            groups.push({
                id: "standard",
                label: "Standard Items",
                items: standardItems,
            });
        }

        // Custom Items (workspace-scoped)
        const customItems = toolboxItems.filter((i) => i.is_custom);
        groups.push({
            id: "custom",
            label: "Custom Items",
            items: customItems,
            showAddButton: true,
        });

        // Formatting/Structural Items
        const structuralItems = toolboxItems.filter((i) => i.type === "structural");
        if (structuralItems.length > 0) {
            groups.push({
                id: "formatting",
                label: "Formatting",
                items: structuralItems,
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
            .filter((group) => group.items.length > 0 || group.showAddButton);
    }, [categoryGroups, search]);

    // Handle custom item created
    const handleItemCreated = useCallback(() => {
        reloadCustomTypes();
        setIsCreateDialogOpen(false);
    }, [reloadCustomTypes]);

    return (
        <div className="flex flex-col h-full bg-muted/50 border-r border-border">
            {/* Header */}
            <div className="h-14 px-4 border-b border-border bg-background flex items-center gap-2.5 shrink-0">
                <SquaresFourIcon className="h-5 w-5 text-primary" weight="fill" />
                <h2 className="text-base font-semibold tracking-tight text-foreground">
                    Agenda Composer
                </h2>
            </div>

            <div className="p-4 border-b border-border bg-background">
                <h3 className="font-semibold text-sm mb-3 text-foreground">Items Library</h3>
                <div className="relative">
                    <MagnifyingGlassIcon weight="fill" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search items..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9 bg-background border-input"
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
                        <div className="space-y-6">
                            {filteredGroups.map((group) => (
                                <div key={group.id} className="space-y-3 px-1">
                                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                        {group.label}
                                    </h4>
                                    <div className="space-y-1.5">
                                        {group.items.map((item) => (
                                            <DraggableToolboxItem
                                                key={item.id}
                                                item={item}
                                                onAddItem={onAddItem}
                                                onEditItem={item.is_custom ? () => {
                                                    setItemToEdit(item);
                                                    setIsCreateDialogOpen(true);
                                                } : undefined}
                                            />
                                        ))}
                                        {group.showAddButton && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                className="w-full mt-2 text-muted-foreground hover:text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                                                onClick={() => {
                                                    setItemToEdit(null);
                                                    setIsCreateDialogOpen(true);
                                                }}
                                            >
                                                <PlusIcon weight="fill" className="h-3.5 w-3.5 mr-1.5" />
                                                New Item Type
                                            </Button>
                                        )}
                                        {group.items.length === 0 && !group.showAddButton && (
                                            <div className="text-xs text-muted-foreground text-center py-2">
                                                No items in this category
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Hint */}
            <div className="p-3 border-t border-border bg-background">
                <p className="text-xs text-muted-foreground text-center">
                    Drag items onto the agenda canvas
                </p>
            </div>

            {/* Create/Edit Item Type Dialog */}
            <CreateItemTypeDialog
                open={isCreateDialogOpen}
                onOpenChange={(open) => {
                    setIsCreateDialogOpen(open);
                    if (!open) setItemToEdit(null);
                }}
                workspaceId={workspaceId}
                onCreated={handleItemCreated}
                initialData={itemToEdit}
            />
        </div>
    );
}
