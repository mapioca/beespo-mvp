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
                            "group cursor-grab active:cursor-grabbing touch-none transition-colors border-l-2",
                            isSelected
                                ? "bg-primary/5 border-l-primary"
                                : "bg-zinc-50/60 border-l-transparent hover:bg-zinc-100/70 hover:border-l-zinc-200",
                            isDragging && "opacity-50"
                        )}
                    >
                        {/* Container Header */}
                        <div className="flex items-center gap-2 px-4 py-3">
                            <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                                className="p-0.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                ) : (
                                    <ChevronRight className="h-3.5 w-3.5" />
                                )}
                            </button>
                            <span className="text-[13px] font-semibold text-zinc-800 flex-1 leading-snug">
                                {item.title}
                            </span>
                            <span className="text-[11px] text-zinc-400 tabular-nums">
                                {childCount} {childCount === 1 ? "item" : "items"}
                            </span>
                            <span className="text-[11px] font-medium text-zinc-400 tabular-nums w-8 text-right">
                                {item.duration_minutes}m
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {onDuplicate && (
                                    <Button type="button" variant="ghost" size="icon"
                                        className="h-6 w-6 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                                <Button type="button" variant="ghost" size="icon"
                                    className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* Container Body — child rows */}
                        {isExpanded && item.childItems && item.childItems.length > 0 && (
                            <div className="border-t border-zinc-100">
                                {item.childItems.map((child, i) => (
                                    <div
                                        key={child.id}
                                        className={cn(
                                            "flex flex-col gap-0.5 py-2.5 pr-4 pl-12",
                                            i < item.childItems!.length - 1 && "border-b border-zinc-100"
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            <span className="text-[13px] font-medium text-zinc-700 flex-1 leading-snug">{child.title}</span>
                                            {child.status && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 capitalize font-medium shrink-0 mt-0.5">
                                                    {child.status.replace("_", " ")}
                                                </span>
                                            )}
                                        </div>
                                        {child.description && (
                                            <p className="text-[12px] text-zinc-400 line-clamp-2 leading-relaxed">
                                                {child.description}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </PopoverTrigger>
                {itemProperties && (
                    <PopoverContent side="right" align="start" sideOffset={12}
                        className="p-0 w-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                        {itemProperties}
                    </PopoverContent>
                )}
            </Popover>
        );
    }

    // Structural: Section Header
    if (item.structural_type === "section_header") {
        return (
            <Popover open={!!isSelected} onOpenChange={(open) => (open ? onSelect?.() : onDeselect?.())}>
                <PopoverTrigger asChild>
                    <div
                        ref={setNodeRef}
                        style={style}
                        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 group cursor-grab active:cursor-grabbing touch-none transition-colors",
                            isSelected ? "bg-primary/5" : "bg-zinc-50/60 hover:bg-zinc-100/70",
                            isDragging && "opacity-50"
                        )}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                        <span className="text-[10px] font-bold tracking-[0.18em] uppercase flex-1 text-zinc-400">
                            {item.title || "Untitled section"}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onDuplicate && (
                                <Button type="button" variant="ghost" size="icon"
                                    className="h-6 w-6 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </PopoverTrigger>
                {itemProperties && (
                    <PopoverContent side="right" align="start" sideOffset={12}
                        className="p-0 w-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
                        {itemProperties}
                    </PopoverContent>
                )}
            </Popover>
        );
    }

    // Structural: Divider
    if (item.structural_type === "divider") {
        return (
            <div ref={setNodeRef} style={style}
                className={cn("py-5 flex items-center group", isDragging && "opacity-50")}>
                <div {...attributes} {...listeners}
                    className="p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="h-3.5 w-3.5 text-zinc-400" />
                </div>
                <div className="flex-1 h-px bg-zinc-200" />
                <Button type="button" variant="ghost" size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-red-400 ml-2 hover:bg-red-50"
                    onClick={onRemove}>
                    <Trash2 className="h-3.5 w-3.5" />
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

    // Regular item — flat row with clear hierarchy
    return (
        <Popover open={!!isSelected} onOpenChange={(open) => (open ? onSelect?.() : onDeselect?.())}>
            <PopoverTrigger asChild>
                <div
                    ref={setNodeRef}
                    style={style}
                    onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
                    className={cn(
                        "flex flex-col group cursor-grab active:cursor-grabbing touch-none transition-colors border-l-2",
                        isSelected
                            ? "bg-primary/5 border-l-primary"
                            : "bg-zinc-50/60 border-l-transparent hover:bg-zinc-100/70 hover:border-l-zinc-200",
                        isDragging && "opacity-50"
                    )}
                    {...attributes}
                    {...listeners}
                >
                    {/* Primary row */}
                    <div className="flex items-center gap-2 px-4 py-3">
                        <GripVertical className="h-3.5 w-3.5 shrink-0 text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                        <span className="text-[14px] font-semibold text-zinc-800 flex-1 leading-snug">
                            {item.title}
                        </span>
                        <span className="text-[11px] font-medium text-zinc-400 shrink-0 tabular-nums w-8 text-right">
                            {item.duration_minutes}m
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onDuplicate && (
                                <Button type="button" variant="ghost" size="icon"
                                    className="h-6 w-6 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                                    onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            )}
                            <Button type="button" variant="ghost" size="icon"
                                className="h-6 w-6 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Secondary text — metadata (hymn, speaker, participant) */}
                    {secondaryText && (
                        <div className="px-4 pb-2.5 pt-0 pl-[2.375rem]">
                            <span className="text-[12px] text-zinc-500 block leading-snug">
                                {secondaryText}
                            </span>
                        </div>
                    )}

                    {/* Description */}
                    {item.description && !secondaryText && (
                        <div className="px-4 pb-2.5 pt-0 pl-[2.375rem]">
                            <span className="text-[12px] text-zinc-400 line-clamp-2 italic block leading-relaxed">
                                {item.description}
                            </span>
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
        <div className="relative group h-[3px]">
            <div className="absolute inset-0 flex items-center justify-center z-10">
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
            className="flex flex-col h-full overflow-hidden bg-white dark:bg-background"
            onClick={() => onSelectItem?.(null)}
        >
            <ScrollArea className="flex-1">
                    <div
                        ref={setNodeRef}
                        className={cn(
                            "px-6 py-6 sm:px-10 min-h-full flex flex-col items-center",
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
                                <div className="mb-5 px-1">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-1.5">
                                        Agenda
                                    </div>
                                    <div className="text-[22px] font-bold text-zinc-900 leading-tight tracking-tight">
                                        {title || "Untitled Meeting"}
                                    </div>
                                    {(dateLabel || timeLabel) && (
                                        <div className="mt-1 text-[13px] text-zinc-500">
                                            {dateLabel}{dateLabel && timeLabel ? " · " : ""}{timeLabel}
                                        </div>
                                    )}
                                </div>
                                <SortableContext
                                    items={itemIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="rounded-xl border border-zinc-100 overflow-hidden divide-y divide-zinc-100 shadow-sm">
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
                                            <div key={item.id}>
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
    );
}
