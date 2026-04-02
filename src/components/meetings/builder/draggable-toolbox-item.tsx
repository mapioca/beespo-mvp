"use client";

import { useMemo, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
    Music,
    BookOpen,
    Briefcase,
    Megaphone,
    User,
    Layers,
    Puzzle,
    Heading1,
    Minus,
    Hand,
    MessagesSquare,
    Speech,
    Pencil
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ToolboxItem } from "./types";
import { CategoryType } from "../add-meeting-item-dialog";

/** Match `PointerSensor` activation distance in meeting-builder so clicks don’t add after a drag gesture */
const ADD_ITEM_CLICK_MAX_MOVE_PX = 8;

interface DraggableToolboxItemProps {
    item: ToolboxItem;
    disabled?: boolean;
    onAddItem?: (item: ToolboxItem) => void;
    onEditItem?: () => void;
}

const getCategoryIcon = (item: ToolboxItem) => {
    // If a custom icon is defined, try rendering it dynamically
    if (item.icon) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const DynamicIcon = (LucideIcons as any)[item.icon];
        if (DynamicIcon) {
            return <DynamicIcon className="h-4 w-4 text-muted-foreground" />;
        }
    }

    if (item.title?.toLowerCase().includes("prayer")) {
        return <Hand className="h-4 w-4" />;
    }

    // Custom items get puzzle icon
    if (item.is_custom) {
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

    if (item.type === "structural") {
        if (item.structural_type === "section_header") {
            return <Heading1 className="h-4 w-4" />;
        }
        if (item.structural_type === "divider") {
            return <Minus className="h-4 w-4" />;
        }
        return <Layers className="h-4 w-4" />;
    }

    const icons: Record<CategoryType, React.ReactNode> = {
        procedural: <BookOpen className="h-4 w-4" />,
        discussion: <MessagesSquare className="h-4 w-4" />,
        business: <Briefcase className="h-4 w-4" />,
        announcement: <Megaphone className="h-4 w-4" />,
        speaker: <Speech className="h-4 w-4" />,
        structural: <Layers className="h-4 w-4" />,
    };
    return icons[item.category] || <Layers className="h-4 w-4" />;
};

export function DraggableToolboxItem({ item, disabled, onAddItem, onEditItem }: DraggableToolboxItemProps) {
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

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

    const mergedListeners = useMemo(() => {
        if (!listeners) return listeners;
        return {
            ...listeners,
            onPointerDown: (e: React.PointerEvent) => {
                listeners.onPointerDown?.(e);
                if (disabled || e.button !== 0) return;
                pointerStartRef.current = { x: e.clientX, y: e.clientY };
            },
        };
    }, [listeners, disabled]);

    const style = transform
        ? {
            transform: CSS.Translate.toString(transform),
        }
        : undefined;

    const row = (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...mergedListeners}
            onPointerUp={(e) => {
                if (e.button !== 0 || disabled || !onAddItem) return;
                if ((e.target as HTMLElement).closest("button")) return;
                const start = pointerStartRef.current;
                pointerStartRef.current = null;
                if (!start) return;
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                if (Math.hypot(dx, dy) >= ADD_ITEM_CLICK_MAX_MOVE_PX) return;
                onAddItem(item);
            }}
            className={cn(
                "group flex items-center gap-3 px-2.5 py-2 rounded-lg border border-transparent",
                "text-[13px] font-normal",
                "hover:bg-control-hover hover:border-border/40 transition-colors cursor-grab active:cursor-grabbing relative",
                isDragging && "opacity-60 shadow-lg ring-2 ring-primary/20 z-50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-control text-muted-foreground border border-control">
                {getCategoryIcon(item)}
            </div>

            <div className={cn("flex-1 min-w-0", onEditItem ? "pr-10" : "pr-2")}>
                <span className="text-[13px] font-normal text-foreground leading-tight break-words">{item.title}</span>
            </div>

            {onEditItem && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onEditItem();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onPointerUp={(e) => e.stopPropagation()}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-control-hover rounded-md transition-colors"
                    title="Edit Item Type"
                >
                    <Pencil className="h-4 w-4" />
                </button>
                </div>
            )}
        </div>
    );

    if (item.description) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{row}</TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs text-left">
                    <p className="text-xs leading-snug whitespace-pre-wrap">{item.description}</p>
                </TooltipContent>
            </Tooltip>
        );
    }

    return row;
}

// Overlay component for drag preview
export function ToolboxItemDragOverlay({ item }: { item: ToolboxItem }) {
    return (
        <div className="flex items-center gap-3 p-2 bg-background/90 border border-border/60 rounded-lg shadow-lg text-foreground w-[300px]">
            <div className="flex items-center justify-center shrink-0 w-7 h-7 rounded-full bg-muted/60 text-foreground">
                {getCategoryIcon(item)}
            </div>
            <div className="flex-1 min-w-0 pr-2">
                <span className="text-sm font-medium leading-tight break-words">{item.title}</span>
            </div>
        </div>
    );
}
