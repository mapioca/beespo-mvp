"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Search, Plus, GripVertical, Copy, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DraggableToolboxItem } from "./draggable-toolbox-item";
import { ToolboxItem, ProceduralItemType, ItemConfig, CategoryType, CanvasItem } from "./types";
import { CreateItemTypeDialog } from "./create-item-type-dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ToolboxPaneProps {
    onItemsLoaded?: (items: ToolboxItem[]) => void;
    onAddItem?: (item: ToolboxItem) => void;
    pinnedIds?: string[];
    recentIds?: string[];
    onTogglePin?: (id: string) => void;
    outlineItems?: CanvasItem[];
    selectedItemId?: string | null;
    onSelectItem?: (id: string | null) => void;
    onDuplicateItem?: (id: string) => void;
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

export function ToolboxPane({
    onItemsLoaded,
    onAddItem,
    pinnedIds = [],
    recentIds = [],
    onTogglePin,
    outlineItems = [],
    selectedItemId,
    onSelectItem,
    onDuplicateItem,
}: ToolboxPaneProps) {
    const [search, setSearch] = useState("");
    const [standardTypes, setStandardTypes] = useState<ProceduralItemType[]>([]);
    const [customTypes, setCustomTypes] = useState<ProceduralItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [itemToEdit, setItemToEdit] = useState<ToolboxItem | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [paneMode, setPaneMode] = useState<"library" | "outline">("library");
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const sectionHeaderClass =
        "flex items-center gap-1 text-builder-xs font-medium text-muted-foreground px-1.5 py-0.5 rounded-md leading-none hover:text-foreground hover:bg-control-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/15 w-full justify-start text-left";

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
                requires_participant: itemType !== "speaker" && (pt.requires_assignee ?? false),
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
                requires_participant: itemType !== "speaker" && (pt.requires_assignee ?? false),
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

    const pinnedItems = useMemo(
        () => pinnedIds.map((id) => toolboxItems.find((i) => i.id === id)).filter(Boolean) as ToolboxItem[],
        [pinnedIds, toolboxItems]
    );

    const recentItems = useMemo(() => {
        const pinnedSet = new Set(pinnedIds);
        return recentIds
            .filter((id) => !pinnedSet.has(id))
            .map((id) => toolboxItems.find((i) => i.id === id))
            .filter(Boolean) as ToolboxItem[];
    }, [recentIds, pinnedIds, toolboxItems]);

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

    const filteredPinned = useMemo(() => {
        if (!search.trim()) return pinnedItems;
        const searchLower = search.toLowerCase();
        return pinnedItems.filter((item) => item.title.toLowerCase().includes(searchLower));
    }, [pinnedItems, search]);

    const filteredRecent = useMemo(() => {
        if (!search.trim()) return recentItems;
        const searchLower = search.toLowerCase();
        return recentItems.filter((item) => item.title.toLowerCase().includes(searchLower));
    }, [recentItems, search]);

    // Handle custom item created
    const handleItemCreated = useCallback(() => {
        reloadCustomTypes();
        setIsCreateDialogOpen(false);
    }, [reloadCustomTypes]);

    return (
        <TooltipProvider delayDuration={1200}>
        <div className="flex flex-col h-full overflow-hidden p-2.5 bg-background">
            <div className="flex flex-col flex-1 overflow-hidden">
                <div className="px-3 pt-2 pb-2 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="grid grid-cols-2 gap-1 rounded-full border border-border/40 bg-background p-0.5 flex-1">
                        <button
                            type="button"
                            onClick={() => setPaneMode("library")}
                            className={cn(
                                "flex items-center justify-center rounded-full h-7 text-[11px] md:text-[11px] font-medium leading-none tracking-normal",
                                paneMode === "library"
                                    ? "border border-border/40 bg-foreground text-background"
                                    : "text-muted-foreground"
                            )}
                        >
                            Library
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaneMode("outline")}
                            className={cn(
                                "flex items-center justify-center rounded-full h-7 text-[11px] md:text-[11px] font-medium leading-none tracking-normal",
                                paneMode === "outline"
                                    ? "border border-border/40 bg-foreground text-background"
                                    : "text-muted-foreground"
                            )}
                        >
                            Outline
                        </button>
                        </div>
                    </div>

                    {paneMode === "library" && (
                        <div className="relative mt-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search items..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-8 bg-control border-control text-[11px] md:text-[11px] font-medium leading-none tracking-normal placeholder:text-[11px] placeholder:font-normal text-foreground focus-visible:ring-0 focus-visible:border-foreground/30"
                            />
                        </div>
                    )}
                </div>
                {paneMode === "library" && (
                    <div className="mx-3 border-b border-border/40" />
                )}

                {/* Library */}
                {paneMode === "library" && (
                    <>
                        <ScrollArea className="flex-1">
                            <div className="px-3 pr-6 pb-4">
                            {isLoading ? (
                                <div className="p-4 text-center text-builder-sm text-muted-foreground">
                                    Loading items...
                                </div>
                            ) : filteredGroups.length === 0 && filteredPinned.length === 0 && filteredRecent.length === 0 ? (
                                <div className="p-4 text-center text-builder-sm text-muted-foreground">
                                    No items found
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {filteredPinned.length > 0 && (
                                        <div className="space-y-2 px-1">
                                            <button
                                                type="button"
                                                aria-expanded={!collapsedSections.pinned}
                                                onClick={() =>
                                                    setCollapsedSections((prev) => ({ ...prev, pinned: !prev.pinned }))
                                                }
                                                className={sectionHeaderClass}
                                            >
                                                <ChevronDown className={cn("h-3.5 w-3.5 -translate-y-[0.5px] transition-transform", collapsedSections.pinned ? "-rotate-90" : "rotate-0")} />
                                                Pinned
                                            </button>
                                            {!collapsedSections.pinned && (
                                                <div className="space-y-1">
                                                    {filteredPinned.map((item) => (
                                                        <DraggableToolboxItem
                                                            key={item.id}
                                                            item={item}
                                                            onAddItem={onAddItem}
                                                            onTogglePin={onTogglePin ? () => onTogglePin(item.id) : undefined}
                                                            isPinned
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {filteredRecent.length > 0 && (
                                        <div className="space-y-2 px-1">
                                            <button
                                                type="button"
                                                aria-expanded={!collapsedSections.recent}
                                                onClick={() =>
                                                    setCollapsedSections((prev) => ({ ...prev, recent: !prev.recent }))
                                                }
                                                className={sectionHeaderClass}
                                            >
                                                <ChevronDown className={cn("h-3.5 w-3.5 -translate-y-[0.5px] transition-transform", collapsedSections.recent ? "-rotate-90" : "rotate-0")} />
                                                Recent
                                            </button>
                                            {!collapsedSections.recent && (
                                                <div className="space-y-1">
                                                    {filteredRecent.map((item) => (
                                                        <DraggableToolboxItem
                                                            key={item.id}
                                                            item={item}
                                                            onAddItem={onAddItem}
                                                            onTogglePin={onTogglePin ? () => onTogglePin(item.id) : undefined}
                                                            isPinned={pinnedIds.includes(item.id)}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {filteredGroups.map((group) => (
                                        <div key={group.id} className="space-y-3 px-1">
                                            <button
                                                type="button"
                                                aria-expanded={!collapsedSections[group.id]}
                                                onClick={() =>
                                                    setCollapsedSections((prev) => ({
                                                        ...prev,
                                                        [group.id]: !prev[group.id],
                                                    }))
                                                }
                                                className={sectionHeaderClass}
                                            >
                                                <ChevronDown className={cn("h-3.5 w-3.5 -translate-y-[0.5px] transition-transform", collapsedSections[group.id] ? "-rotate-90" : "rotate-0")} />
                                                {group.label}
                                            </button>
                                            {!collapsedSections[group.id] && (
                                                <div className="space-y-1">
                                                    {group.items.map((item) => (
                                                        <DraggableToolboxItem
                                                            key={item.id}
                                                            item={item}
                                                            onAddItem={onAddItem}
                                                            onEditItem={item.is_custom ? () => {
                                                                setItemToEdit(item);
                                                                setIsCreateDialogOpen(true);
                                                            } : undefined}
                                                            onTogglePin={onTogglePin ? () => onTogglePin(item.id) : undefined}
                                                            isPinned={pinnedIds.includes(item.id)}
                                                        />
                                                    ))}
                                                    {group.showAddButton && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        type="button"
                                                        className="w-full mt-2 h-8 text-builder-sm bg-foreground text-background border-foreground hover:bg-foreground/90 hover:text-background shadow-sm"
                                                        onClick={() => {
                                                            setItemToEdit(null);
                                                            setIsCreateDialogOpen(true);
                                                        }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                        New custom item
                                                    </Button>
                                                )}
                                                    {group.items.length === 0 && !group.showAddButton && (
                                                        <div className="text-builder-sm text-muted-foreground text-center py-2">
                                                            No items in this category
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        </ScrollArea>

                        {/* Hint */}
                        <div className="p-3 border-t border-border/40 shrink-0">
                            <p className="text-builder-xs text-muted-foreground text-center">
                                Click an item to add it to the end, or drag onto the canvas to place it
                            </p>
                        </div>
                    </>
                )}

                {/* Outline */}
                {paneMode === "outline" && (
                    <ScrollArea className="flex-1">
                        <div className="px-3 pr-6 pb-4">
                            {outlineItems.length === 0 ? (
                                <div className="p-4 text-center text-builder-sm text-muted-foreground">
                                    No agenda items yet
                                </div>
                            ) : (
                                <SortableContext items={outlineItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                        {outlineItems.map((item) => (
                                            <OutlineRow
                                                key={item.id}
                                                item={item}
                                                isSelected={selectedItemId === item.id}
                                                onSelect={() => onSelectItem?.(item.id)}
                                                onDuplicate={() => onDuplicateItem?.(item.id)}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            )}
                        </div>
                    </ScrollArea>
                )}
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
        </TooltipProvider>
    );
}

function OutlineRow({
    item,
    isSelected,
    onSelect,
    onDuplicate,
}: {
    item: CanvasItem;
    isSelected?: boolean;
    onSelect?: () => void;
    onDuplicate?: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 text-builder-xs",
                "hover:bg-control-hover hover:border-border/40",
                isSelected && "bg-control-hover border-border/40",
                isDragging && "opacity-60"
            )}
            onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
            }}
        >
            <div
                {...attributes}
                {...listeners}
                className="p-1 text-muted-foreground hover:text-foreground"
            >
                <GripVertical className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="truncate text-foreground">
                    {item.title}
                </div>
                {item.duration_minutes !== undefined && (
                    <div className="text-builder-2xs text-muted-foreground">
                        {item.duration_minutes}m
                    </div>
                )}
            </div>
            {onDuplicate && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-control-hover rounded-md"
                    title="Duplicate"
                >
                    <Copy className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    );
}
