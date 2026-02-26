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
    TrashIcon,
    CaretDownIcon,
    CaretRightIcon,
    DotsSixVerticalIcon,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { CanvasItem } from "./types";
import { useFormContext } from "react-hook-form";

interface AgendaCanvasProps {
    items: CanvasItem[];
    onRemoveItem: (id: string) => void;
    expandedContainers: Set<string>;
    onToggleContainer: (id: string) => void;
    selectedItemId?: string | null;
    onSelectItem?: (itemId: string | null) => void;
    isOver?: boolean;
}

// Sortable Agenda Row — read-only card
interface SortableAgendaRowProps {
    item: CanvasItem;
    onRemove: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    isSelected?: boolean;
    onSelect?: () => void;
}

function SortableAgendaRow({
    item,
    onRemove,
    isExpanded,
    onToggleExpand,
    isSelected,
    onSelect,
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

    // Container item — selectable, read-only
    if (item.isContainer && item.containerType) {
        const childCount = item.childItems?.length || 0;

        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                {...attributes}
                {...listeners}
                className={cn(
                    "rounded-md border bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                    "hover:border-muted-foreground/30",
                    isSelected && "ring-2 ring-primary border-primary/50 shadow-sm",
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
                )}
            >
                {/* Container Header */}
                <div className="flex items-center gap-2 p-1.5">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                    >
                        {isExpanded ? (
                            <CaretDownIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <CaretRightIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    <span className="font-medium text-sm flex-1 text-foreground pl-1">
                        {item.title}
                    </span>

                    <span className="text-xs text-muted-foreground">
                        {childCount} item{childCount !== 1 ? "s" : ""}
                    </span>

                    <span className="text-xs text-muted-foreground ml-2">
                        {item.duration_minutes}m
                    </span>

                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    >
                        <TrashIcon weight="fill" className="h-4 w-4" />
                    </Button>
                </div>

                {/* Container Body — read-only child list */}
                {isExpanded && item.childItems && item.childItems.length > 0 && (
                    <div className="px-3 pb-2 pt-0">
                        <div className="pl-6 space-y-1">
                            {item.childItems.map((child) => (
                                <div
                                    key={child.id}
                                    className="flex items-center gap-2 p-1.5 bg-background rounded border border-border/60"
                                >
                                    <span className="text-sm flex-1 truncate">{child.title}</span>
                                    {child.status && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted/50 capitalize">
                                            {child.status.replace("_", " ")}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Structural: Section Header — read-only
    if (item.structural_type === "section_header") {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                className={cn(
                    "flex flex-col border rounded-md bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                    "hover:border-muted-foreground/30",
                    isSelected && "ring-2 ring-primary border-primary/50 shadow-sm",
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
                )}
                {...attributes}
                {...listeners}
            >
                <div className="flex items-center gap-2 p-1.5">
                    <div className="w-7 shrink-0" />
                    <span className="font-medium text-sm flex-1 truncate text-foreground pl-1">
                        {item.title || "Untitled section"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                        Section
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <TrashIcon weight="fill" className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        );
    }

    // Structural: Divider — no selection
    if (item.structural_type === "divider") {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "py-4 flex items-center group",
                    isDragging && "opacity-50"
                )}
            >
                <div
                    {...attributes}
                    {...listeners}
                    className="p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <DotsSixVerticalIcon weight="fill" className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 h-px bg-zinc-200" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive ml-2"
                    onClick={onRemove}
                >
                    <TrashIcon weight="fill" className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    // Derive secondary text for assigned data
    const secondaryText = item.hymn_title
        ? `#${item.hymn_number} ${item.hymn_title}`
        : item.participant_name || item.speaker_name || null;

    // Regular item — read-only card
    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
            className={cn(
                "flex flex-col border rounded-md bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                "hover:border-muted-foreground/30",
                isSelected && "ring-2 ring-primary border-primary/50 shadow-sm",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
            )}
            {...attributes}
            {...listeners}
        >
            {/* Header row */}
            <div className="flex items-center gap-2 p-1.5">
                <div className="w-7 shrink-0" />
                <span className="font-medium text-sm flex-1 truncate text-foreground pl-1">
                    {item.title}
                </span>

                <span className="text-xs text-muted-foreground shrink-0">
                    {item.duration_minutes}m
                </span>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                >
                    <TrashIcon weight="fill" className="h-4 w-4" />
                </Button>
            </div>

            {/* Secondary text — assigned data displayed read-only */}
            {secondaryText && (
                <div className="px-3 pb-2 pt-0">
                    <div className="pl-7">
                        <span className="text-xs text-muted-foreground truncate block">
                            {secondaryText}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export function AgendaCanvas({
    items,
    onRemoveItem,
    expandedContainers,
    onToggleContainer,
    selectedItemId,
    onSelectItem,
    isOver,
}: AgendaCanvasProps) {
    const { watch } = useFormContext();
    const title = watch("title");

    const { setNodeRef } = useDroppable({
        id: "canvas-drop-zone",
    });

    const totalDuration = items.reduce((sum, item) => sum + item.duration_minutes, 0);
    const itemIds = items.map((item) => item.id);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
            {/* Header */}
            <div className="h-14 px-4 border-b bg-background grid grid-cols-3 items-center shrink-0">
                <div /> {/* Left spacer */}
                <h3 className="font-semibold text-sm text-center truncate">
                    {title || "Untitled Meeting Agenda"}
                </h3>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {items.length} items • {totalDuration} min
                    </span>
                </div>
            </div>

            {/* Canvas */}
            <ScrollArea className="flex-1">
                <div
                    ref={setNodeRef}
                    className={cn(
                        "p-3 min-h-full flex flex-col items-center",
                        isOver && "bg-primary/5"
                    )}
                    onClick={() => onSelectItem?.(null)}
                >
                    {items.length === 0 ? (
                        <div
                            className={cn(
                                "flex flex-col items-center justify-center py-16 mt-8 bg-background/50 backdrop-blur-sm w-full max-w-xl",
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
                        <div className="bg-background/80 backdrop-blur-sm rounded-lg shadow-sm border p-3 w-full max-w-xl">
                            <SortableContext
                                items={itemIds}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-1">
                                    {items.map((item) => (
                                        <SortableAgendaRow
                                            key={item.id}
                                            item={item}
                                            onRemove={() => onRemoveItem(item.id)}
                                            isExpanded={expandedContainers.has(item.id)}
                                            onToggleExpand={() => onToggleContainer(item.id)}
                                            isSelected={selectedItemId === item.id}
                                            onSelect={() => onSelectItem?.(item.id)}
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
