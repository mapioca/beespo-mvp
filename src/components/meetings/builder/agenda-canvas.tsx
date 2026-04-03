"use client";

import { useEffect, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverAnchor, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ChevronDown, ChevronRight, GripVertical, Copy, Plus, Search, Pin, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasItem, ToolboxItem } from "./types";
import { ItemPropertiesPanel } from "./item-properties-panel";
import type { SpeakerSelection } from "./speaker-selector-popover";
import type { DiscussionSelection } from "./discussion-selector-popover";
import type { BusinessSelection } from "./business-selector-popover";
import type { AnnouncementSelection } from "./announcement-selector-popover";
import { Input } from "@/components/ui/input";


interface AgendaCanvasProps {
    items: CanvasItem[];
    onRemoveItem: (id: string) => void;
    onDuplicateItem?: (id: string) => void;
    title?: string;
    dateLabel?: string;
    timeLabel?: string;
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
    onToggleByInvitation?: (enabled: boolean) => void;
    onSelectSpeaker?: (speaker: SpeakerSelection) => void;
    onToggleSpeakerByInvitation?: (enabled: boolean) => void;
    selectedSpeakerIdsInMeeting?: string[];
    onAddToContainer?: () => void;
    onRemoveChildItem?: (childId: string) => void;
    onSelectDiscussion?: (discussions: DiscussionSelection[]) => void;
    onSelectBusiness?: (items: BusinessSelection[]) => void;
    onSelectAnnouncement?: (announcements: AnnouncementSelection[]) => void;
    toolboxItems?: ToolboxItem[];
    pinnedIds?: string[];
    recentIds?: string[];
    onInsertItemAt?: (index: number, item: ToolboxItem) => void;
    openInsertAt?: number | null;
    onInsertOpenHandled?: () => void;
}

// Sortable Agenda Row — read-only card
interface SortableAgendaRowProps {
    item: CanvasItem;
    onRemove: () => void;
    onDuplicate?: () => void;
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
    onDuplicate,
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
                            "rounded-xl border border-border/40 bg-background shadow-builder-card transition-all duration-200 group cursor-grab active:cursor-grabbing touch-none",
                            "hover:bg-background hover:border-border/60",
                            isSelected && "ring-2 ring-primary/25 border-primary/50 shadow-builder-card-selected",
                            isDragging && "opacity-60 ring-2 ring-primary/30"
                        )}
                    >
                        {/* Container Header */}
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "w-[2px] h-6 rounded-full transition-colors",
                                    isSelected ? "bg-primary/60" : "bg-border/60 group-hover:bg-border/90"
                                )} />
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                                    className="p-1 hover:bg-control-hover rounded-md transition-colors"
                                >
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                </button>
                                <span className="font-semibold text-builder-md flex-1 text-foreground pl-1">
                                    {item.title}
                                </span>
                            </div>

                            <span className="text-builder-xs text-muted-foreground tabular-nums">
                                {childCount} item{childCount !== 1 ? "s" : ""}
                            </span>

                            <span className="text-builder-xs text-muted-foreground ml-3 tabular-nums">
                                {item.duration_minutes}m
                            </span>

                            {onDuplicate && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/90 hover:text-foreground hover:bg-control-hover",
                                        isSelected && "opacity-100 text-foreground bg-control-hover"
                                    )}
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/90 hover:text-destructive hover:bg-destructive/10 ml-0.5",
                                    isSelected && "opacity-100 text-foreground bg-control-hover"
                                )}
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Container Body — read-only child list */}
                        {isExpanded && item.childItems && item.childItems.length > 0 && (
                            <div className="px-3 pb-2 pt-0">
                            <div className="pl-6 space-y-2">
                                    {item.childItems.map((child) => (
                                        <div
                                            key={child.id}
                                        className="flex flex-col gap-1.5 p-2.5 bg-background/80 rounded-lg border border-border/40"
                                    >
                                        <div className="flex items-center gap-2">
                                                <span className="text-builder-md font-medium flex-1 truncate">{child.title}</span>
                                                {child.status && (
                                    <span className="text-builder-2xs px-1.5 py-0.5 rounded bg-muted/60 capitalize font-medium">
                                        {child.status.replace("_", " ")}
                                    </span>
                                                )}
                                            </div>
                                            {child.description && (
                                                <p className="text-builder-xs text-muted-foreground italic line-clamp-2">
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
                            "flex flex-col border border-border/40 rounded-xl bg-background shadow-builder-card transition-all duration-200 group cursor-grab active:cursor-grabbing touch-none",
                            "hover:bg-background hover:border-border/60",
                            isSelected && "ring-2 ring-primary/25 border-primary/50 shadow-builder-card-selected",
                            isDragging && "opacity-60 ring-2 ring-primary/30"
                        )}
                        {...attributes}
                        {...listeners}
                    >
                        <div className="flex items-center gap-2 px-3 py-2.5">
                            <div className={cn(
                                "w-[2px] h-5 rounded-full transition-colors",
                                isSelected ? "bg-primary/60" : "bg-border/60 group-hover:bg-border/90"
                            )} />
                            <span className="font-semibold text-builder-xs tracking-[0.18em] uppercase flex-1 truncate text-muted-foreground pl-2">
                                {item.title || "Untitled section"}
                            </span>
                            <span className="text-builder-2xs text-muted-foreground shrink-0">
                                Section
                            </span>
                            {onDuplicate && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/90 hover:text-foreground hover:bg-control-hover",
                                        isSelected && "opacity-100 text-foreground bg-control-hover"
                                    )}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDuplicate();
                                    }}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/90 hover:text-destructive hover:bg-destructive/10",
                                    isSelected && "opacity-100 text-foreground bg-control-hover"
                                )}
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
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 h-px bg-border/60" />
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive ml-2 hover:bg-destructive/10"
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
                            "flex flex-col border border-border/40 rounded-xl bg-background shadow-builder-card transition-all duration-200 group cursor-grab active:cursor-grabbing touch-none",
                            "hover:bg-background hover:border-border/60",
                            isSelected && "ring-2 ring-primary/25 border-primary/50 shadow-builder-card-selected",
                            isDragging && "opacity-60 ring-2 ring-primary/30"
                        )}
                    {...attributes}
                    {...listeners}
                >
                    {/* Header row */}
                    <div className="flex items-center gap-2 px-3 py-2.5">
                        <div className={cn(
                            "w-[2px] h-6 rounded-full transition-colors",
                            isSelected ? "bg-primary/60" : "bg-border/60 group-hover:bg-border/90"
                        )} />
                        <span className="font-semibold text-builder-md flex-1 truncate text-foreground pl-2">
                            {item.title}
                        </span>

                        <span className="text-builder-xs text-muted-foreground shrink-0 tabular-nums">
                            {item.duration_minutes}m
                        </span>

                        {onDuplicate && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/90 hover:text-foreground hover:bg-control-hover",
                                    isSelected && "opacity-100 text-foreground bg-control-hover"
                                )}
                                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        )}

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                                "h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/90 hover:text-destructive hover:bg-destructive/10 ml-0.5",
                                isSelected && "opacity-100 text-foreground bg-control-hover"
                            )}
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Secondary text — assigned data displayed read-only */}
                    {secondaryText && (
                        <div className="px-3 pb-2.5 pt-0">
                            <div className="pl-7">
                                <span className="text-builder-xs text-muted-foreground truncate block">
                                    {secondaryText}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Description — only shown as a placeholder hint when no value is assigned yet */}
                    {item.description && !secondaryText && (
                        <div className="px-3 pb-2.5 pt-0">
                            <div className="pl-7">
                                <span className="text-builder-xs text-muted-foreground/80 line-clamp-2 italic">
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

function InsertRow({
    isOpen,
    onOpenChange,
    searchValue,
    onSearchChange,
    pinnedItems,
    recentItems,
    items,
    onSelectItem,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    searchValue: string;
    onSearchChange: (value: string) => void;
    pinnedItems: ToolboxItem[];
    recentItems: ToolboxItem[];
    items: ToolboxItem[];
    onSelectItem: (item: ToolboxItem) => void;
}) {
    return (
        <div className="relative group">
            <div className="flex items-center justify-center z-10 relative">
                <Popover open={isOpen} onOpenChange={onOpenChange}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <PopoverAnchor asChild>
                                <button
                                    type="button"
                                    onPointerDown={(e) => e.stopPropagation()}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onOpenChange(!isOpen);
                                    }}
                                    className={cn(
                                        "flex items-center justify-center h-6 w-6 rounded-full border border-border/40 bg-background text-muted-foreground shadow-sm",
                                        "opacity-0 group-hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20",
                                        isOpen && "opacity-100"
                                    )}
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                            </PopoverAnchor>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center" sideOffset={8}>
                            Insert item
                        </TooltipContent>
                    </Tooltip>
                    <PopoverContent align="center" className="w-72 p-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder="Insert item..."
                                className="h-8 pl-8 text-builder-sm bg-background border-border/60 focus-visible:border-foreground/30"
                                autoFocus
                            />
                        </div>

                        <div className="mt-2 max-h-64 overflow-y-auto space-y-3 pr-1">
                            {pinnedItems.length > 0 && (
                                <InsertSection
                                    title="Pinned"
                                    icon={<Pin className="h-3 w-3" />}
                                    items={pinnedItems}
                                    onSelectItem={onSelectItem}
                                />
                            )}
                            {recentItems.length > 0 && (
                                <InsertSection
                                    title="Recent"
                                    icon={<Clock className="h-3 w-3" />}
                                    items={recentItems}
                                    onSelectItem={onSelectItem}
                                />
                            )}
                            <InsertSection
                                title="All items"
                                items={items}
                                onSelectItem={onSelectItem}
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
            <div className="absolute left-0 right-0 top-1/2 h-px bg-border/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}

function InsertSection({
    title,
    icon,
    items,
    onSelectItem,
}: {
    title: string;
    icon?: React.ReactNode;
    items: ToolboxItem[];
    onSelectItem: (item: ToolboxItem) => void;
}) {
    if (items.length === 0) return null;
    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-builder-xs font-medium text-muted-foreground px-1.5">
                {icon && <span className="text-muted-foreground/80">{icon}</span>}
                <span>{title}</span>
            </div>
            <div className="space-y-1">
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelectItem(item)}
                        className="w-full text-left px-2.5 py-1.5 rounded-md text-builder-sm hover:bg-control-hover"
                    >
                        {item.title}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function AgendaCanvas({
    items,
    onRemoveItem,
    onDuplicateItem,
    title,
    dateLabel,
    timeLabel,
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
    onToggleByInvitation,
    onSelectSpeaker,
    onToggleSpeakerByInvitation,
    selectedSpeakerIdsInMeeting = [],
    onAddToContainer,
    onRemoveChildItem,
    onSelectDiscussion,
    onSelectBusiness,
    onSelectAnnouncement,
    toolboxItems = [],
    pinnedIds = [],
    recentIds = [],
    onInsertItemAt,
    openInsertAt,
    onInsertOpenHandled,
}: AgendaCanvasProps) {
    const { setNodeRef } = useDroppable({
        id: "canvas-drop-zone",
    });

    const itemIds = items.map((item) => item.id);
    const [openInsertIndex, setOpenInsertIndex] = useState<number | null>(null);
    const [insertSearch, setInsertSearch] = useState("");

    const pinnedItems = pinnedIds
        .map((id) => toolboxItems.find((i) => i.id === id))
        .filter(Boolean) as ToolboxItem[];
    const recentItems = recentIds
        .filter((id) => !pinnedIds.includes(id))
        .map((id) => toolboxItems.find((i) => i.id === id))
        .filter(Boolean) as ToolboxItem[];

    const searchValue = insertSearch.trim().toLowerCase();
    const filteredItems = searchValue
        ? toolboxItems.filter((item) =>
            item.title.toLowerCase().includes(searchValue)
        )
        : toolboxItems;
    const filteredPinned = searchValue
        ? pinnedItems.filter((item) => item.title.toLowerCase().includes(searchValue))
        : pinnedItems;
    const filteredRecent = searchValue
        ? recentItems.filter((item) => item.title.toLowerCase().includes(searchValue))
        : recentItems;

    useEffect(() => {
        if (openInsertAt === null || openInsertAt === undefined) return;
        setOpenInsertIndex(openInsertAt);
        setInsertSearch("");
        onInsertOpenHandled?.();
    }, [openInsertAt, onInsertOpenHandled]);

    return (
        <div
            className="flex flex-col h-full p-3 overflow-hidden"
            onClick={() => onSelectItem?.(null)}
        >
            {/* Card container */}
            <div
                className={cn(
                    "rounded-2xl border border-border/50 bg-paper shadow-builder-canvas ring-1 ring-border/20 flex flex-col flex-1 overflow-hidden relative"
                )}
            >
                {/* Canvas */}
                <ScrollArea className="flex-1">
                    <div
                        ref={setNodeRef}
                        className={cn(
                            "p-8 sm:p-12 min-h-full flex flex-col items-center",
                            isOver && "bg-primary/5"
                        )}
                    >
                        {items.length === 0 ? (
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center py-20 mt-6 w-full max-w-xl",
                                    "rounded-2xl border border-border/40 bg-background/60",
                                    "text-muted-foreground transition-all",
                                    isOver && "border-primary/40 bg-primary/5"
                                )}
                            >
                                <div className="text-center max-w-sm">
                                    <p className="text-builder-xl font-semibold text-foreground">Start your agenda</p>
                                    <p className="text-builder-sm mt-1 text-muted-foreground">
                                        Drag items from the library, or press <span className="font-medium">I</span> to insert.
                                    </p>
                                    <p className="text-builder-xs mt-2 text-muted-foreground">
                                        Tip: Pin your most common items for one‑click access.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full max-w-[850px]">
                                <div className="mb-6 rounded-2xl border border-border/30 bg-background/70 px-6 py-5 shadow-builder-header">
                                    <div className="text-builder-2xs uppercase tracking-[0.16em] text-muted-foreground">
                                        Agenda
                                    </div>
                                    <div className="mt-1 text-builder-title font-semibold text-foreground">
                                        {title || "Untitled Meeting"}
                                    </div>
                                    {(dateLabel || timeLabel) && (
                                        <div className="mt-1 text-builder-xs text-muted-foreground">
                                            {dateLabel}{dateLabel && timeLabel ? " · " : ""}{timeLabel}
                                        </div>
                                    )}
                                </div>
                                <SortableContext
                                    items={itemIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        <InsertRow
                                            isOpen={openInsertIndex === 0}
                                            onOpenChange={(open) => setOpenInsertIndex(open ? 0 : null)}
                                            searchValue={insertSearch}
                                            onSearchChange={setInsertSearch}
                                            pinnedItems={filteredPinned}
                                            recentItems={filteredRecent}
                                            items={filteredItems}
                                            onSelectItem={(toolboxItem) => {
                                                onInsertItemAt?.(0, toolboxItem);
                                                setOpenInsertIndex(null);
                                                setInsertSearch("");
                                            }}
                                        />
                                        {items.map((item, index) => (
                                            <div key={item.id} className="space-y-2">
                                                <SortableAgendaRow
                                                    item={item}
                                                    onRemove={() => onRemoveItem(item.id)}
                                                    onDuplicate={onDuplicateItem ? () => onDuplicateItem(item.id) : undefined}
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
                                                            onToggleByInvitation={onToggleByInvitation}
                                                            onSelectSpeaker={onSelectSpeaker}
                                                            onToggleSpeakerByInvitation={onToggleSpeakerByInvitation}
                                                            selectedSpeakerIdsInMeeting={selectedSpeakerIdsInMeeting}
                                                            onAddToContainer={onAddToContainer}
                                                            onRemoveChildItem={onRemoveChildItem}
                                                            onSelectDiscussion={onSelectDiscussion}
                                                            onSelectBusiness={onSelectBusiness}
                                                            onSelectAnnouncement={onSelectAnnouncement}
                                                        />
                                                    }
                                                />
                                                <InsertRow
                                                    isOpen={openInsertIndex === index + 1}
                                                    onOpenChange={(open) => setOpenInsertIndex(open ? index + 1 : null)}
                                                    searchValue={insertSearch}
                                                    onSearchChange={setInsertSearch}
                                                    pinnedItems={filteredPinned}
                                                    recentItems={filteredRecent}
                                                    items={filteredItems}
                                                    onSelectItem={(toolboxItem) => {
                                                        onInsertItemAt?.(index + 1, toolboxItem);
                                                        setOpenInsertIndex(null);
                                                        setInsertSearch("");
                                                    }}
                                                />
                                            </div>
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
