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
import {
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Trash2,
    Plus,
    ChevronDown,
    ChevronRight,
    UserPlus,
    Mic,
    Puzzle,
    Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasItem } from "./types";
import { CategoryType } from "../add-meeting-item-dialog";
import { ContainerType } from "../container-agenda-item";

interface AgendaCanvasProps {
    items: CanvasItem[];
    onRemoveItem: (id: string) => void;
    expandedContainers: Set<string>;
    onToggleContainer: (id: string) => void;
    onAddToContainer: (containerId: string, containerType: ContainerType) => void;
    onRemoveChildItem: (containerId: string, childId: string) => void;
    onSelectHymn: (itemId: string) => void;
    onSelectParticipant: (itemId: string) => void;
    onSelectSpeaker: (itemId: string) => void;
    isOver?: boolean;
}

// Check if item is a custom item (with fallback to procedural_item_type_id check)
const isCustomItem = (item: CanvasItem): boolean => {
    if (item.is_custom === true) return true;
    // Fallback: custom items have IDs starting with "custom-"
    return !!item.procedural_item_type_id?.startsWith("custom-");

};

// Get icon for canvas item - supports custom items with config
const getCanvasItemIcon = (item: CanvasItem) => {
    // Custom items get purple-themed icons
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
    return icons[item.category] || <Layers className="h-4 w-4 text-blue-500" />;
};

const getContainerColors = (type: ContainerType) => {
    const colors: Record<ContainerType, { bg: string; border: string; text: string }> = {
        discussion: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
        business: { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
        announcement: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
    };
    return colors[type];
};

// Sortable Agenda Row
interface SortableAgendaRowProps {
    item: CanvasItem;
    onRemove: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    onAddToContainer?: () => void;
    onRemoveChildItem?: (childId: string) => void;
    onSelectHymn?: () => void;
    onSelectParticipant?: () => void;
    onSelectSpeaker?: () => void;
}

function SortableAgendaRow({
    item,
    onRemove,
    isExpanded,
    onToggleExpand,
    onAddToContainer,
    onRemoveChildItem,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
}: SortableAgendaRowProps) {
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

    // Container item
    if (item.isContainer && item.containerType) {
        const colors = getContainerColors(item.containerType);
        const childCount = item.childItems?.length || 0;

        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "rounded-md border-2 transition-all cursor-grab active:cursor-grabbing touch-none",
                    colors.bg,
                    colors.border,
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
                )}
            >
                {/* Container Header */}
                <div className="flex items-center gap-2 p-3">

                    <button
                        onClick={onToggleExpand}
                        className="shrink-0"
                    >
                        {isExpanded ? (
                            <ChevronDown className={cn("h-4 w-4", colors.text)} />
                        ) : (
                            <ChevronRight className={cn("h-4 w-4", colors.text)} />
                        )}
                    </button>

                    {getCanvasItemIcon(item)}

                    <span className={cn("font-medium text-sm flex-1", colors.text)}>
                        {item.title}
                    </span>

                    <span className="text-xs text-muted-foreground">
                        {childCount} item{childCount !== 1 ? "s" : ""}
                    </span>

                    <span className="text-xs text-muted-foreground">
                        {item.duration_minutes}m
                    </span>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={onAddToContainer}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Container Children */}
                {isExpanded && item.childItems && item.childItems.length > 0 && (
                    <div className="px-3 pb-3 pt-0">
                        <div className="space-y-1.5 pl-8">
                            {item.childItems.map((child) => (
                                <div
                                    key={child.id}
                                    className="flex items-center gap-2 p-2 bg-white rounded border"
                                >
                                    <span className="text-sm flex-1 truncate">{child.title}</span>
                                    {child.status && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted capitalize">
                                            {child.status.replace("_", " ")}
                                        </span>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemoveChildItem?.(child.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty state for containers */}
                {isExpanded && (!item.childItems || item.childItems.length === 0) && (
                    <div className="px-3 pb-3 pt-0">
                        <div className="pl-8">
                            <button
                                onClick={onAddToContainer}
                                className={cn(
                                    "w-full p-3 border-2 border-dashed rounded-md text-sm",
                                    "hover:border-solid hover:bg-white/50 transition-all",
                                    colors.border,
                                    colors.text
                                )}
                            >
                                <Plus className="h-4 w-4 inline mr-1" />
                                Add {item.containerType}
                            </button>
                        </div>
                    </div>
                )}
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
                "flex items-center gap-2 p-2.5 border rounded-md bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                "hover:border-muted-foreground/30",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
            )}
        >

            {getCanvasItemIcon(item)}

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                </div>

                {/* Hymn selector - always show for hymn items */}
                {item.is_hymn && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-6 text-xs mt-1 p-0",
                            item.hymn_title
                                ? "text-blue-600"
                                : "text-blue-500 hover:text-blue-700"
                        )}
                        onClick={onSelectHymn}
                    >
                        <Music className="h-3 w-3 mr-1" />
                        {item.hymn_title
                            ? `#${item.hymn_number} ${item.hymn_title}`
                            : "Select Hymn"}
                    </Button>
                )}

                {/* Participant selector - always show for participant items */}
                {(item.requires_participant || item.config?.requires_assignee) && !item.is_hymn && item.category !== "speaker" && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-6 text-xs mt-1 p-0",
                            item.participant_name
                                ? "text-slate-600"
                                : "text-slate-500 hover:text-slate-700"
                        )}
                        onClick={onSelectParticipant}
                    >
                        <UserPlus className="h-3 w-3 mr-1" />
                        {item.participant_name || "Select Person"}
                    </Button>
                )}

                {/* Speaker selector - always show for speaker items */}
                {item.category === "speaker" && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-6 text-xs mt-1 p-0",
                            item.speaker_name
                                ? "text-indigo-600"
                                : "text-indigo-500 hover:text-indigo-700"
                        )}
                        onClick={onSelectSpeaker}
                    >
                        <Mic className="h-3 w-3 mr-1" />
                        {item.speaker_name || "Select Speaker"}
                    </Button>
                )}
            </div>

            <span className="text-xs text-muted-foreground shrink-0">
                {item.duration_minutes}m
            </span>

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

export function AgendaCanvas({
    items,
    onRemoveItem,
    expandedContainers,
    onToggleContainer,
    onAddToContainer,
    onRemoveChildItem,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
    isOver,
}: AgendaCanvasProps) {
    const { setNodeRef } = useDroppable({
        id: "canvas-drop-zone",
    });

    const totalDuration = items.reduce((sum, item) => sum + item.duration_minutes, 0);
    const itemIds = items.map((item) => item.id);

    return (
        <div className="flex flex-col h-full bg-muted/20 bg-[radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Header */}
            <div className="px-6 py-3 border-b bg-background flex items-center justify-between">
                <h3 className="font-semibold text-sm">Agenda</h3>
                <span className="text-sm text-muted-foreground">
                    {items.length} items • {totalDuration} min
                </span>
            </div>

            {/* Canvas */}
            <ScrollArea className="flex-1">
                <div
                    ref={setNodeRef}
                    className={cn(
                        "p-4 lg:p-6 min-h-full",
                        isOver && "bg-primary/5"
                    )}
                >
                    {items.length === 0 ? (
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center py-16 mt-8 bg-background/50 backdrop-blur-sm",
                                "border-2 border-dashed rounded-lg",
                                "text-muted-foreground transition-all",
                                isOver ? "border-primary bg-primary/5" : "border-muted-foreground/20"
                            )}
                        >
                            <div className="text-center">
                                <p className="font-medium">Drag items here</p>
                                <p className="text-sm mt-1">
                                    Or select a template to get started
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-sm border p-4">
                            <SortableContext
                                items={itemIds}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1.5">
                                    {items.map((item) => (
                                        <SortableAgendaRow
                                            key={item.id}
                                            item={item}
                                            onRemove={() => onRemoveItem(item.id)}
                                            isExpanded={expandedContainers.has(item.id)}
                                            onToggleExpand={() => onToggleContainer(item.id)}
                                            onAddToContainer={
                                                item.isContainer && item.containerType
                                                    ? () => onAddToContainer(item.id, item.containerType!)
                                                    : undefined
                                            }
                                            onRemoveChildItem={(childId) =>
                                                onRemoveChildItem(item.id, childId)
                                            }
                                            onSelectHymn={
                                                item.is_hymn ? () => onSelectHymn(item.id) : undefined
                                            }
                                            onSelectParticipant={
                                                (item.requires_participant || item.config?.requires_assignee) && !item.is_hymn && item.category !== "speaker"
                                                    ? () => onSelectParticipant(item.id)
                                                    : undefined
                                            }
                                            onSelectSpeaker={
                                                item.category === "speaker"
                                                    ? () => onSelectSpeaker(item.id)
                                                    : undefined
                                            }
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
