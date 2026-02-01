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
    GripVertical,
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateCanvasItem } from "./types";

interface TemplateCanvasProps {
    items: TemplateCanvasItem[];
    onRemoveItem: (id: string) => void;
    onUpdateItem: (id: string, field: keyof TemplateCanvasItem, value: string | number) => void;
    isOver?: boolean;
}

type CategoryType = "procedural" | "discussion" | "business" | "announcement" | "speaker";

const getCategoryIcon = (category: CategoryType, isHymn?: boolean) => {
    if (category === "procedural" && isHymn) {
        return <Music className="h-4 w-4 text-blue-500" />;
    }
    const icons: Record<CategoryType, React.ReactNode> = {
        procedural: <BookOpen className="h-4 w-4 text-slate-500" />,
        discussion: <MessageSquare className="h-4 w-4 text-green-500" />,
        business: <Briefcase className="h-4 w-4 text-purple-500" />,
        announcement: <Megaphone className="h-4 w-4 text-orange-500" />,
        speaker: <User className="h-4 w-4 text-pink-500" />,
    };
    return icons[category];
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex items-center gap-3 p-3 border rounded-lg bg-card transition-all group",
                "hover:border-muted-foreground/30",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40 z-50"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
                <GripVertical className="h-4 w-4 text-muted-foreground/50" />
            </div>

            {/* Category Icon */}
            <div className="shrink-0">
                {getCategoryIcon(item.category as CategoryType, item.is_hymn)}
            </div>

            {/* Title - Editable */}
            <div className="flex-1 min-w-0">
                <Input
                    value={item.title}
                    onChange={(e) => onUpdateTitle(e.target.value)}
                    className="h-8 text-sm font-medium border-0 px-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
                    placeholder="Item title..."
                />
                {item.is_hymn && (
                    <p className="text-xs text-blue-600 mt-0.5">
                        Hymn will be selected when creating meeting
                    </p>
                )}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1 shrink-0">
                <Input
                    type="number"
                    min="1"
                    value={item.duration_minutes}
                    onChange={(e) => onUpdateDuration(parseInt(e.target.value) || 5)}
                    className="w-14 h-8 text-xs text-center"
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
            <div className="px-6 py-3 border-b bg-background flex items-center justify-between">
                <h3 className="font-semibold text-sm">Template Agenda</h3>
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
                        <div className="bg-white rounded-lg shadow-sm border p-4">
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
            <div className="px-6 py-3 border-t bg-background">
                <p className="text-xs text-muted-foreground text-center">
                    Drag to reorder • Edit titles and durations inline
                </p>
            </div>
        </div>
    );
}
