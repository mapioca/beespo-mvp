"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
    GripVertical,
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolboxItem } from "./types";
import { CategoryType } from "../add-meeting-item-dialog";

interface DraggableToolboxItemProps {
    item: ToolboxItem;
    disabled?: boolean;
}

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

export function DraggableToolboxItem({ item, disabled }: DraggableToolboxItemProps) {
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
                "flex items-center gap-2 p-2 bg-white border rounded-md",
                "hover:border-primary hover:shadow-sm transition-all cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40 z-50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            {getCategoryIcon(item.category, item.is_hymn)}
            <span className="text-sm font-medium truncate flex-1">{item.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">{item.duration_minutes}m</span>
        </div>
    );
}

// Overlay component for drag preview
export function ToolboxItemDragOverlay({ item }: { item: ToolboxItem }) {
    return (
        <div className="flex items-center gap-2 p-2 bg-white border-2 border-primary rounded-md shadow-lg">
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
            {getCategoryIcon(item.category, item.is_hymn)}
            <span className="text-sm font-medium truncate flex-1">{item.title}</span>
            <span className="text-xs text-muted-foreground shrink-0">{item.duration_minutes}m</span>
        </div>
    );
}
