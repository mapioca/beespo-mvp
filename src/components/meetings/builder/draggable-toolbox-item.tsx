"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
    MusicNoteIcon,
    BookOpenIcon,
    BriefcaseIcon,
    MegaphoneIcon,
    UserIcon,
    StackIcon,
    PuzzlePieceIcon,
    PlusIcon,
    TextHOneIcon,
    MinusIcon,
    HandsPrayingIcon,
    ChatsIcon,
    PencilSimpleIcon
} from "@phosphor-icons/react";
import * as PhosphorIcons from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ToolboxItem } from "./types";
import { CategoryType } from "../add-meeting-item-dialog";

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
        const DynamicIcon = (PhosphorIcons as any)[item.icon];
        if (DynamicIcon) {
            return <DynamicIcon weight="fill" className="h-4 w-4 text-black dark:text-white" />;
        }
    }

    if (item.title?.toLowerCase().includes("prayer")) {
        return <HandsPrayingIcon weight="fill" className="h-4 w-4" />;
    }

    // Custom items get puzzle icon
    if (item.is_custom) {
        // But if they have specific config, show appropriate icon
        if (item.config?.requires_resource) {
            return <MusicNoteIcon weight="fill" className="h-4 w-4" />;
        }
        if (item.config?.requires_assignee) {
            return <UserIcon weight="fill" className="h-4 w-4" />;
        }
        return <PuzzlePieceIcon weight="fill" className="h-4 w-4" />;
    }

    // Core items
    if (item.is_hymn || item.config?.requires_resource) {
        return <MusicNoteIcon weight="fill" className="h-4 w-4" />;
    }

    if (item.type === "structural") {
        if (item.structural_type === "section_header") {
            return <TextHOneIcon weight="fill" className="h-4 w-4" />;
        }
        if (item.structural_type === "divider") {
            return <MinusIcon weight="fill" className="h-4 w-4" />;
        }
        return <StackIcon weight="fill" className="h-4 w-4" />;
    }

    const icons: Record<CategoryType, React.ReactNode> = {
        procedural: <BookOpenIcon weight="fill" className="h-4 w-4" />,
        discussion: <ChatsIcon weight="fill" className="h-4 w-4" />,
        business: <BriefcaseIcon weight="fill" className="h-4 w-4" />,
        announcement: <MegaphoneIcon weight="fill" className="h-4 w-4" />,
        speaker: <UserIcon weight="fill" className="h-4 w-4" />,
        structural: <StackIcon weight="fill" className="h-4 w-4" />,
    };
    return icons[item.category] || <StackIcon weight="fill" className="h-4 w-4" />;
};

export function DraggableToolboxItem({ item, disabled, onAddItem, onEditItem }: DraggableToolboxItemProps) {
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

            <div className={cn(
                "flex-1 min-w-0",
                (onEditItem && onAddItem) ? "pr-[72px]" : (onEditItem || onAddItem) ? "pr-10" : "pr-2"
            )}>
                <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-foreground leading-tight break-words">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
                        {item.description}
                    </p>
                )}
            </div>

            <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                {onEditItem && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            onEditItem();
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                        title="Edit Item Type"
                        type="button"
                    >
                        <PencilSimpleIcon weight="fill" className="h-4 w-4" />
                    </button>
                )}
                {onAddItem && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            // Prevent the click from starting a drag
                            e.preventDefault();
                            onAddItem(item);
                        }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                        title="Quick Insert"
                    >
                        <PlusIcon weight="fill" className="h-4 w-4" />
                    </button>
                )}
            </div>
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
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-start gap-2 mt-0.5">
                    <span className="text-sm font-medium leading-tight break-words">{item.title}</span>
                </div>
                {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-snug">
                        {item.description}
                    </p>
                )}
            </div>
        </div>
    );
}
