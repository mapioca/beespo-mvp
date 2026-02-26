"use client";

import { useState, useRef, useEffect } from "react";
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
    Trash2,
    Minus,
    ChevronDown,
    ChevronRight,
    GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasItem } from "./types";
import { ContainerType } from "../container-agenda-item";
import { useFormContext } from "react-hook-form";

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
    editingItemId?: string | null;
    onSelectItem?: (itemId: string | null) => void;
    onUpdateTitle?: (id: string, newTitle: string) => void;
    isOver?: boolean;
}


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
    isSelected?: boolean;
    onSelect?: () => void;
    onUpdateTitle?: (newTitle: string) => void;
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
    isSelected,
    onSelect,
    onUpdateTitle,
}: SortableAgendaRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const [editValue, setEditValue] = useState(item.title);
    const inputRef = useRef<HTMLInputElement>(null);

    // Sync with external updates only when not being edited locally
    useEffect(() => {
        if (!inputRef.current || document.activeElement !== inputRef.current) {
            setEditValue(item.title);
        }
    }, [item.title]);

    const handleSaveTitle = () => {
        if (onUpdateTitle && editValue.trim() !== "" && editValue !== item.title) {
            onUpdateTitle(editValue.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveTitle();
        } else if (e.key === "Escape") {
            setEditValue(item.title);
        }
    };

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    // Container item
    if (item.isContainer && item.containerType) {
        const childCount = item.childItems?.length || 0;

        return (
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
                className={cn(
                    "rounded-md border bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                    "hover:border-muted-foreground/30",
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
                )}
            >
                {/* Container Header */}
                <div className="flex items-center gap-2 p-1.5">

                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="p-1 hover:bg-muted rounded-md transition-colors"
                    >
                        {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Container Body */}
                {isExpanded && (
                    <div className="px-3 pb-3 pt-0">
                        <div className="pl-6 space-y-3">
                            {/* Children List */}
                            {item.childItems && item.childItems.length > 0 && (
                                <div className="space-y-1">
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
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => onRemoveChildItem?.(child.id)}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Button - Always visible when expanded */}
                            <button
                                type="button"
                                onClick={onAddToContainer}
                                className={cn(
                                    "w-full py-2 px-3 border-2 border-dashed rounded-md text-sm transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground"
                                )}
                            >
                                Add {item.containerType}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Structural: Section Header
    if (item.structural_type === "section_header") {
        return (
            <div
                ref={setNodeRef}
                style={style}
                onClick={onSelect}
                className={cn(
                    "flex flex-col border rounded-md bg-card transition-all group mb-2 mt-4",
                    "hover:border-muted-foreground/30",
                    isSelected ? "ring-2 ring-primary border-primary/50 shadow-sm" : "border-zinc-200",
                    isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
                )}
            >
                <div className="flex items-center gap-2 p-1.5 border-b bg-muted/20">
                    <div
                        {...attributes}
                        {...listeners}
                        className="w-7 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted rounded transition-colors"
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex-1">
                        Section Header
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove();
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
                <div className="p-3">
                    <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleKeyDown}
                        placeholder="SECTION TITLE"
                        className="h-9 text-sm font-bold uppercase tracking-widest text-foreground border-transparent bg-transparent hover:border-zinc-200 focus:border-primary focus:bg-background transition-all"
                    />
                </div>
            </div>
        );
    }

    // Structural: Divider
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
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 h-px bg-zinc-200" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive ml-2"
                    onClick={onRemove}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    // Regular item
    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex flex-col border rounded-md bg-card transition-all group cursor-grab active:cursor-grabbing touch-none",
                "hover:border-muted-foreground/30",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
            )}
            {...attributes}
            {...listeners}
        >
            {/* Header row: Icon, Title, Duration, Actions */}
            <div className="flex items-center gap-2 p-1.5">
                <div className="w-7 shrink-0" /> {/* Spacer to align with container chevrons */}
                {isSelected ? (
                    <div className="flex-1 flex items-center gap-2">
                        <Input
                            ref={inputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveTitle}
                            onKeyDown={handleKeyDown}
                            className="flex-1 h-7 text-sm font-medium my-[-4px]"
                        />
                    </div>
                ) : (
                    <span
                        className="font-medium text-sm flex-1 truncate text-foreground pl-1"
                        onDoubleClick={onSelect}
                    >
                        {item.title}
                    </span>
                )}

                <span className="text-xs text-muted-foreground shrink-0">
                    {item.duration_minutes}m
                </span>

                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onRemove}
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Body: Selector Button */}
            {(item.is_hymn || item.requires_participant || item.config?.requires_assignee || item.category === "speaker") && (
                <div className="px-3 pb-3 pt-0">
                    <div className="pl-6">
                        {/* Hymn selector - always show for hymn items */}
                        {item.is_hymn && (
                            <button
                                type="button"
                                className={cn(
                                    "w-full py-2 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                    item.hymn_title && "border-solid bg-blue-50/50 border-blue-200 text-blue-700 font-medium"
                                )}
                                onClick={onSelectHymn}
                            >
                                <span className="truncate">
                                    {item.hymn_title
                                        ? `#${item.hymn_number} ${item.hymn_title}`
                                        : "Select Hymn"}
                                </span>
                            </button>
                        )}

                        {/* Participant selector - always show for participant items */}
                        {(item.requires_participant || item.config?.requires_assignee) && !item.is_hymn && item.category !== "speaker" && (
                            <button
                                type="button"
                                className={cn(
                                    "w-full py-2 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                    item.participant_name && "border-solid bg-slate-50/50 border-slate-200 text-slate-700 font-medium"
                                )}
                                onClick={onSelectParticipant}
                            >
                                <span className="truncate">
                                    {item.participant_name || "Select Participant"}
                                </span>
                            </button>
                        )}

                        {/* Speaker selector - always show for speaker items */}
                        {item.category === "speaker" && (
                            <button
                                type="button"
                                className={cn(
                                    "w-full py-2 px-3 border-2 border-dashed rounded-md text-sm flex items-center justify-center gap-2 transition-all",
                                    "hover:border-solid hover:bg-muted/50 border-muted-foreground/20 text-muted-foreground",
                                    item.speaker_name && "border-solid bg-indigo-50/50 border-indigo-200 text-indigo-700 font-medium"
                                )}
                                onClick={onSelectSpeaker}
                            >
                                <span className="truncate">
                                    {item.speaker_name || "Select Speaker"}
                                </span>
                            </button>
                        )}
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
    onAddToContainer,
    onRemoveChildItem,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
    editingItemId,
    onSelectItem,
    onUpdateTitle,
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
                                            isSelected={editingItemId === item.id}
                                            onSelect={() => onSelectItem?.(item.id)}
                                            onUpdateTitle={(newTitle) => onUpdateTitle?.(item.id, newTitle)}
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
