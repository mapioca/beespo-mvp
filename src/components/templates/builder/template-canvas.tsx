"use client";

import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Trash2,
    Puzzle,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateCanvasItem } from "./types";
import { ContainerType } from "@/components/meetings/container-agenda-item";

interface TemplateCanvasProps {
    items: TemplateCanvasItem[];
    onRemoveItem: (id: string) => void;
    onUpdateItem: (id: string, field: keyof TemplateCanvasItem, value: string | number) => void;
    isOver?: boolean;
}

type CategoryType = "procedural" | "discussion" | "business" | "announcement" | "speaker";

// Check if item is a custom item (with fallback to procedural_item_type_id check)
const isCustomItem = (item: TemplateCanvasItem): boolean => {
    if (item.is_custom === true) return true;
    // Fallback: custom items have IDs starting with "custom-"
    return !!item.procedural_item_type_id?.startsWith("custom-");
};

// Get icon for canvas item - supports custom items with Puzzle icon
const getCanvasItemIcon = (item: TemplateCanvasItem) => {
    // Custom items get purple-themed icons with Puzzle as default
    if (isCustomItem(item)) {
        if (item.config?.requires_resource) {
            return <Music className="h-4 w-4 text-purple-500" />;
        }
        if (item.config?.requires_assignee) {
            return <User className="h-4 w-4 text-purple-500" />;
        }
        return <Puzzle className="h-4 w-4 text-purple-500" />;
    }

    // Core/standard items - check for hymn
    if (item.is_hymn || item.config?.requires_resource) {
        return <Music className="h-4 w-4 text-blue-500" />;
    }

    // Category-based icons
    const icons: Record<CategoryType, React.ReactNode> = {
        procedural: <BookOpen className="h-4 w-4 text-slate-500" />,
        discussion: <MessageSquare className="h-4 w-4 text-green-500" />,
        business: <Briefcase className="h-4 w-4 text-purple-500" />,
        announcement: <Megaphone className="h-4 w-4 text-orange-500" />,
        speaker: <User className="h-4 w-4 text-pink-500" />,
    };
    return icons[item.category as CategoryType] || <Layers className="h-4 w-4 text-blue-500" />;
};

const getContainerColors = (type: ContainerType) => {
    const colors: Record<ContainerType, { bg: string; border: string; text: string }> = {
        discussion: { bg: "bg-green-50/50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-300" },
        business: { bg: "bg-purple-50/50 dark:bg-purple-900/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-300" },
        announcement: { bg: "bg-orange-50/50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300" },
    };
    return colors[type];
};

// Get helper text for items that will be configured when creating a meeting
const getItemHelperText = (item: TemplateCanvasItem): string | null => {
    const title = item.title.toLowerCase();
    const category = item.category.toLowerCase();

    // Items with hymn/resource requirements
    if (item.is_hymn || item.config?.requires_resource || title.includes("hymn")) {
        return "Hymn will be selected when creating meeting";
    }

    // Speaker items (check category OR title)
    if (category === "speaker" || title.includes("speaker")) {
        return "Speaker will be assigned when creating meeting";
    }

    // Custom items with requires_assignee
    if (item.is_custom && item.config?.requires_assignee) {
        return "Person will be assigned when creating meeting";
    }

    // Items that require participant assignment - check explicit flags OR title patterns
    if (item.requires_participant || item.config?.requires_assignee) {
        return "Person will be assigned when creating meeting";
    }

    // Legacy fallback: check title for known participant-requiring items
    if (
        title.includes("prayer") ||
        title.includes("testimony") ||
        title.includes("testimonies") ||
        title.includes("presid") ||
        title.includes("conduct") ||
        title.includes("invocation") ||
        title.includes("benediction") ||
        title.includes("spiritual thought") ||
        title.includes("sacrament")
    ) {
        return "Person will be assigned when creating meeting";
    }

    return null;
};

// Sortable Template Item Row
interface SortableTemplateRowProps {
    item: TemplateCanvasItem;
    onRemove: () => void;
    onUpdateTitle: (title: string) => void;
    onUpdateDuration: (duration: number) => void;
}

function SortableTemplateRow({
    item,
    onRemove,
    onUpdateTitle,
    onUpdateDuration,
}: SortableTemplateRowProps) {
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

    // Container item - render with colored background
    if (item.isContainer && item.containerType) {
        const colors = getContainerColors(item.containerType);

        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "rounded-lg border-2 transition-all cursor-grab active:cursor-grabbing touch-none",
                    colors.bg,
                    colors.border,
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40 z-50"
                )}
            >
                <div className="flex items-center gap-3 p-3">

                    {/* Category Icon */}
                    <div className="shrink-0">
                        {getCanvasItemIcon(item)}
                    </div>

                    {/* Title - Editable */}
                    <div className="flex-1 min-w-0">
                        <Input
                            value={item.title}
                            onChange={(e) => onUpdateTitle(e.target.value)}
                            className={cn(
                                "h-8 text-sm font-medium border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent",
                                colors.text
                            )}
                            placeholder="Container title..."
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Items will be added when creating a meeting
                        </p>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center gap-1 shrink-0">
                        <Input
                            type="number"
                            min="1"
                            value={item.duration_minutes}
                            onChange={(e) => onUpdateDuration(parseInt(e.target.value) || 5)}
                            className="w-14 h-8 text-xs text-center bg-background/50 border-input"
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                    </div>

                    {/* Remove Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-white/50"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Regular item
    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "flex items-center gap-3 p-3 border rounded-lg bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                "hover:border-primary/50",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40 z-50"
            )}
        >

            {/* Category Icon */}
            <div className="shrink-0">
                {getCanvasItemIcon(item)}
            </div>

            {/* Title - Editable */}
            <div className="flex-1 min-w-0">
                <Input
                    value={item.title}
                    onChange={(e) => onUpdateTitle(e.target.value)}
                    className="h-8 text-sm font-medium border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent text-foreground placeholder:text-muted-foreground"
                    placeholder="Item title..."
                />
                {/* Helper text - shown for items that will be configured when creating meeting */}
                {(() => {
                    const helperText = getItemHelperText(item);
                    if (helperText) {
                        return (
                            <p className="text-xs text-blue-600 mt-0.5">
                                {helperText}
                            </p>
                        );
                    }
                    return null;
                })()}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1 shrink-0">
                <Input
                    type="number"
                    min="1"
                    value={item.duration_minutes}
                    onChange={(e) => onUpdateDuration(parseInt(e.target.value) || 5)}
                    className="w-14 h-8 text-xs text-center bg-background border-input"
                />
                <span className="text-xs text-muted-foreground">min</span>
            </div>

            {/* Remove Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={onRemove}
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </div>
    );
}

export function TemplateCanvas({
    items,
    onRemoveItem,
    onUpdateItem,
    isOver,
}: TemplateCanvasProps) {
    const { setNodeRef } = useDroppable({
        id: "template-canvas-drop-zone",
    });

    const totalDuration = items.reduce((sum, item) => sum + item.duration_minutes, 0);
    const itemIds = items.map((item) => item.id);

    return (
        <div className="flex flex-col h-full bg-muted/20">
            {/* Header */}
            <div className="px-6 py-3 border-b border-border bg-background flex items-center justify-between">
                <h3 className="font-semibold text-sm text-foreground">Template Agenda</h3>
                <span className="text-sm text-muted-foreground">
                    {items.length} items • {totalDuration} min
                </span>
            </div>

            {/* Canvas */}
            <ScrollArea className="flex-1">
                <div
                    ref={setNodeRef}
                    className={cn(
                        "p-6 min-h-full",
                        isOver && "bg-primary/5"
                    )}
                >
                    {items.length === 0 ? (
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center py-16",
                                "border-2 border-dashed rounded-lg",
                                "text-muted-foreground transition-all",
                                isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                            )}
                        >
                            <div className="text-center">
                                <p className="font-medium">Drag items here</p>
                                <p className="text-sm mt-1">
                                    Build your template agenda structure
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card rounded-lg shadow-sm border border-border p-4">
                            <SortableContext
                                items={itemIds}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-2">
                                    {items.map((item) => (
                                        <SortableTemplateRow
                                            key={item.id}
                                            item={item}
                                            onRemove={() => onRemoveItem(item.id)}
                                            onUpdateTitle={(title) =>
                                                onUpdateItem(item.id, "title", title)
                                            }
                                            onUpdateDuration={(duration) =>
                                                onUpdateItem(item.id, "duration_minutes", duration)
                                            }
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer Hint */}
            <div className="px-6 py-3 border-t border-border bg-background">
                <p className="text-xs text-muted-foreground text-center">
                    Drag to reorder • Edit titles and durations inline
                </p>
            </div>
        </div>
    );
}
