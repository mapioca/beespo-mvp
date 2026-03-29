"use client";

import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ChevronDown, ChevronRight, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasItem } from "./types";
import { ItemPropertiesPanel } from "./item-properties-panel";
import type { SpeakerSelection } from "./speaker-selector-popover";
import type { DiscussionSelection } from "./discussion-selector-popover";
import type { BusinessSelection } from "./business-selector-popover";
import type { AnnouncementSelection } from "./announcement-selector-popover";


interface AgendaCanvasProps {
    items: CanvasItem[];
    onRemoveItem: (id: string) => void;
    expandedContainers: Set<string>;
    onToggleContainer: (id: string) => void;
    selectedItemId?: string | null;
    onSelectItem?: (itemId: string | null) => void;
    isOver?: boolean;
    onUpdateItem?: (id: string, newTitle: string) => void;
    onUpdateDescription?: (id: string, newDescription: string) => void;
    onUpdateItemNotes?: (id: string, newNotes: string) => void;
    onUpdateDuration?: (id: string, newDuration: number) => void;
    onSelectHymn?: (hymn: { id: string; number: number; title: string }) => void;
    onSelectParticipant?: (participant: { id: string; name: string }) => void;
    onSelectSpeaker?: (speaker: SpeakerSelection) => void;
    selectedSpeakerIdsInMeeting?: string[];
    onAddToContainer?: () => void;
    onRemoveChildItem?: (childId: string) => void;
    onSelectDiscussion?: (discussions: DiscussionSelection[]) => void;
    onSelectBusiness?: (items: BusinessSelection[]) => void;
    onSelectAnnouncement?: (announcements: AnnouncementSelection[]) => void;
}

// Sortable Agenda Row — read-only card
interface SortableAgendaRowProps {
    item: CanvasItem;
    onRemove: () => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
    isSelected?: boolean;
    onSelect?: () => void;
    onDeselect?: () => void;
    itemProperties?: React.ReactNode;
}

function SortableAgendaRow({
    item,
    onRemove,
    isExpanded,
    onToggleExpand,
    isSelected,
    onSelect,
    onDeselect,
    itemProperties,
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
            <Popover open={!!isSelected} onOpenChange={(open) => (open ? onSelect?.() : onDeselect?.())}>
                <PopoverTrigger asChild>
                    <div
                        ref={setNodeRef}
                        style={style}
                        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                        {...attributes}
                        {...listeners}
                        className={cn(
                            "rounded-xl border border-border/40 bg-background/70 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all group cursor-grab active:cursor-grabbing touch-none",
                            "hover:bg-background hover:border-border/60",
                            isSelected && "ring-2 ring-primary/30 border-primary/30",
                            isDragging && "opacity-60 shadow-lg ring-2 ring-primary/30"
                        )}
                    >
                        {/* Container Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                                className="p-1 hover:bg-muted rounded-md transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                            </button>

                            <span className="font-medium text-[13px] flex-1 text-foreground pl-1">
                                {item.title}
                            </span>

                            <span className="text-[11px] text-muted-foreground tabular-nums">
                                {childCount} item{childCount !== 1 ? "s" : ""}
                            </span>

                            <span className="text-[11px] text-muted-foreground ml-2 tabular-nums">
                                {item.duration_minutes}m
                            </span>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Container Body — read-only child list */}
                        {isExpanded && item.childItems && item.childItems.length > 0 && (
                            <div className="px-3 pb-2 pt-0">
                                <div className="pl-6 space-y-1">
                                    {item.childItems.map((child) => (
                                        <div
                                            key={child.id}
                                            className="flex flex-col gap-1 p-2 bg-background/70 rounded-md border border-border/40"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium flex-1 truncate">{child.title}</span>
                                                {child.status && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 capitalize font-medium">
                                                        {child.status.replace("_", " ")}
                                                    </span>
                                                )}
                                            </div>
                                            {child.description && (
                                                <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                                                    {child.description}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </PopoverTrigger>
                {itemProperties && (
                    <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="p-0 w-auto shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {itemProperties}
                    </PopoverContent>
                )}
            </Popover>
        );
    }

    // Structural: Section Header — read-only
    if (item.structural_type === "section_header") {
        return (
            <Popover open={!!isSelected} onOpenChange={(open) => (open ? onSelect?.() : onDeselect?.())}>
                <PopoverTrigger asChild>
                    <div
                        ref={setNodeRef}
                        style={style}
                        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                        className={cn(
                            "flex flex-col border rounded-xl bg-background/70 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all group cursor-grab active:cursor-grabbing touch-none",
                            "hover:bg-background hover:border-border/60",
                            isSelected && "ring-2 ring-primary/30 border-primary/30",
                            isDragging && "opacity-60 shadow-lg ring-2 ring-primary/30"
                        )}
                        {...attributes}
                        {...listeners}
                    >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <div className="w-7 shrink-0" />
                            <span className="font-medium text-[12px] tracking-[0.2em] uppercase flex-1 truncate text-muted-foreground pl-1">
                                {item.title || "Untitled section"}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
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
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </PopoverTrigger>
                {itemProperties && (
                    <PopoverContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="p-0 w-auto shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {itemProperties}
                    </PopoverContent>
                )}
            </Popover>
        );
    }

    // Structural: Divider — no selection
    if (item.structural_type === "divider") {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className={cn(
                    "py-6 flex items-center group",
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
                <div className="flex-1 h-px bg-border/60" />
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

    // Derive secondary text for assigned data
    const secondaryText = item.hymn_title
        ? `#${item.hymn_number} ${item.hymn_title}`
        : item.speaker_name 
            ? `${item.speaker_name}${item.speaker_topic ? ` — ${item.speaker_topic}` : ""}`
            : item.participant_name || null;

    // Regular item — read-only card
    return (
        <Popover open={!!isSelected} onOpenChange={(open) => (open ? onSelect?.() : onDeselect?.())}>
            <PopoverTrigger asChild>
                <div
                    ref={setNodeRef}
                    style={style}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                    className={cn(
                        "flex flex-col border rounded-xl bg-background/70 shadow-[0_1px_0_rgba(15,23,42,0.04)] transition-all group cursor-grab active:cursor-grabbing touch-none",
                        "hover:bg-background hover:border-border/60",
                        isSelected && "ring-2 ring-primary/30 border-primary/30",
                        isDragging && "opacity-60 shadow-lg ring-2 ring-primary/30"
                    )}
                    {...attributes}
                    {...listeners}
                >
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className="w-7 shrink-0" />
                        <span className="font-medium text-[13px] flex-1 truncate text-foreground pl-1">
                            {item.title}
                        </span>

                        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
                            {item.duration_minutes}m
                        </span>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Secondary text — assigned data displayed read-only */}
                    {secondaryText && (
                        <div className="px-3 pb-2 pt-0">
                            <div className="pl-7">
                                <span className="text-[11px] text-muted-foreground truncate block">
                                    {secondaryText}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description — only shown as a placeholder hint when no value is assigned yet */}
                    {item.description && !secondaryText && (
                        <div className="px-3 pb-2 pt-0">
                            <div className="pl-7">
                                <span className="text-[11px] text-muted-foreground/80 line-clamp-2 italic">
                                    {item.description}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </PopoverTrigger>
            {itemProperties && (
                <PopoverContent
                    side="right"
                    align="start"
                    sideOffset={12}
                    className="p-0 w-auto shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {itemProperties}
                </PopoverContent>
            )}
        </Popover>
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
    onUpdateItem,
    onUpdateDescription,
    onUpdateItemNotes,
    onUpdateDuration,
    onSelectHymn,
    onSelectParticipant,
    onSelectSpeaker,
    selectedSpeakerIdsInMeeting = [],
    onAddToContainer,
    onRemoveChildItem,
    onSelectDiscussion,
    onSelectBusiness,
    onSelectAnnouncement,
}: AgendaCanvasProps) {
    const { setNodeRef } = useDroppable({
        id: "canvas-drop-zone",
    });

    const totalDuration = items.reduce((sum, item) => sum + item.duration_minutes, 0);
    const itemIds = items.map((item) => item.id);

    return (
        <div
            className="flex flex-col h-full p-3 overflow-hidden"
            onClick={() => onSelectItem?.(null)}
        >
            {/* Card container */}
            <div
                className={cn(
                    "rounded-2xl border border-border/60 bg-background/70 flex flex-col flex-1 overflow-hidden relative",
                    items.length === 0 && "bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"
                )}
            >
                {/* Stats badge */}
                {items.length > 0 && (
                    <div className="absolute top-3 right-3 z-10 bg-[hsl(var(--accent-warm))] backdrop-blur-sm rounded-full px-3 py-1 border border-border/50">
                        <span className="text-[11px] text-slate-800 whitespace-nowrap">
                            {items.length} {items.length === 1 ? "item" : "items"} &bull; {totalDuration} min
                        </span>
                    </div>
                )}

                {/* Canvas */}
                <ScrollArea className="flex-1">
                    <div
                        ref={setNodeRef}
                        className={cn(
                            "p-4 min-h-full flex flex-col items-center",
                            isOver && "bg-primary/5"
                        )}
                    >
                        {items.length === 0 ? (
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center py-16 mt-8 w-full max-w-xl",
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
                            <div className="w-full max-w-xl">
                                <SortableContext
                                    items={itemIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-2">
                                        {items.map((item) => (
                                            <SortableAgendaRow
                                                key={item.id}
                                                item={item}
                                                onRemove={() => onRemoveItem(item.id)}
                                                isExpanded={expandedContainers.has(item.id)}
                                                onToggleExpand={() => onToggleContainer(item.id)}
                                                isSelected={selectedItemId === item.id}
                                                onSelect={() => onSelectItem?.(item.id)}
                                                onDeselect={() => onSelectItem?.(null)}
                                                itemProperties={
                                                    <ItemPropertiesPanel
                                                        item={item}
                                                        onUpdateItem={onUpdateItem}
                                                        onUpdateDescription={onUpdateDescription}
                                                        onUpdateItemNotes={onUpdateItemNotes}
                                                        onUpdateDuration={onUpdateDuration}
                                                        onSelectHymn={onSelectHymn}
                                                        onSelectParticipant={onSelectParticipant}
                                                        onSelectSpeaker={onSelectSpeaker}
                                                        selectedSpeakerIdsInMeeting={selectedSpeakerIdsInMeeting}
                                                        onAddToContainer={onAddToContainer}
                                                        onRemoveChildItem={onRemoveChildItem}
                                                        onSelectDiscussion={onSelectDiscussion}
                                                        onSelectBusiness={onSelectBusiness}
                                                        onSelectAnnouncement={onSelectAnnouncement}
                                                    />
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
        </div>
    );
}
