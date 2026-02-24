"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Layers,
    Puzzle,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolboxItem } from "./types";
import { CategoryType } from "../add-meeting-item-dialog";

interface DraggableToolboxItemProps {
    item: ToolboxItem;
    disabled?: boolean;
    onAddItem?: (item: ToolboxItem) => void;
}

const getCategoryIcon = (item: ToolboxItem) => {
    // Custom items get puzzle icon
    if (item.is_custom) {
        // But if they have specific config, show appropriate icon
        if (item.config?.requires_resource) {
            return <Music className="h-4 w-4" />;
        }
        if (item.config?.requires_assignee) {
            return <User className="h-4 w-4" />;
        }
        return <Puzzle className="h-4 w-4" />;
    }

    // Core items
    if (item.is_hymn || item.config?.requires_resource) {
        return <Music className="h-4 w-4" />;
    }

    const icons: Record<CategoryType, React.ReactNode> = {
        procedural: <BookOpen className="h-4 w-4" />,
        discussion: <MessageSquare className="h-4 w-4" />,
        business: <Briefcase className="h-4 w-4" />,
        announcement: <Megaphone className="h-4 w-4" />,
        speaker: <User className="h-4 w-4" />,
    };
    return icons[item.category] || <Layers className="h-4 w-4" />;
};

export function DraggableToolboxItem({ item, disabled, onAddItem }: DraggableToolboxItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: `toolbox-${item.id}`,
        data: {
            type: "toolbox_item",
            item,
        },
        disabled,
    });

    const style = transform
        ? {
            transform: CSS.Translate.toString(transform),
        }
        : undefined;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group flex items-start gap-3 p-2 bg-card border border-border rounded-md",
                "hover:border-primary/50 hover:bg-accent/50 transition-all cursor-grab active:cursor-grabbing relative",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40 z-50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-md bg-muted text-foreground border border-border/50">
                {getCategoryIcon(item)}
            </div>

            <div className="flex-1 min-w-0 pr-8">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate text-foreground">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {item.description}
                    </p>
                )}
            </div>

            {onAddItem && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        // Prevent the click from starting a drag
                        e.preventDefault();
                        onAddItem(item);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute right-2 top-2 p-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                    title="Quick Insert"
                >
                    <Plus className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}

// Overlay component for drag preview
export function ToolboxItemDragOverlay({ item }: { item: ToolboxItem }) {
    return (
        <div className="flex items-start gap-3 p-2 bg-card border rounded-md shadow-lg text-foreground w-[300px]">
            <div className="flex items-center justify-center shrink-0 w-8 h-8 rounded-md bg-muted text-foreground border border-border/50">
                {getCategoryIcon(item)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm font-medium truncate leading-none">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                    </p>
                )}
            </div>
        </div>
    );
}
