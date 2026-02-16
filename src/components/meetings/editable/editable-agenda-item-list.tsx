"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Clock,
    Music,
    User,
    GripVertical,
    Trash2,
    MoreVertical,
    Plus,
    Loader2,
    MessageSquare,
    Briefcase,
    Megaphone,
    FileText,
    ChevronDown,
    ChevronRight,
    ScrollText,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { InlineInput } from "./inline-input";
import { InlineCombobox, ComboboxOption } from "./inline-combobox";
import { AgendaItemDivider } from "./agenda-item-divider";
import { AgendaGroupRow } from "./agenda-group-row";
import { AddMeetingItemDialog, SelectedItem, CategoryType } from "../add-meeting-item-dialog";
import {
    groupAgendaItems,
    getGroupedItemIds,
    StoredChildItem,
} from "@/lib/agenda-grouping";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { Database } from "@/types/database";
import {
    generateBusinessScript,
    BUSINESS_CATEGORIES,
} from "@/lib/business-script-generator";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"] & {
    hymn?: { title: string; hymn_number: number } | null;
    child_items?: StoredChildItem[] | null;
    // Config passed from procedural item type
    config?: {
        requires_assignee: boolean;
        requires_resource: boolean;
        has_rich_text: boolean;
    };
};

interface EditableAgendaItemListProps {
    items: AgendaItem[];
    meetingId: string;
    isEditable?: boolean;
    onItemsChange?: (items: AgendaItem[]) => void;
}

// Item config type
interface ItemConfig {
    requires_assignee: boolean;
    requires_resource: boolean;
    has_rich_text: boolean;
}

// Legacy fallback: Check if item is a hymn based on title
const isLegacyHymnItem = (item: AgendaItem): boolean => {
    const title = item.title.toLowerCase();
    return (
        item.item_type === "procedural" &&
        (title.includes("hymn") ||
            title.includes("opening song") ||
            title.includes("closing song") ||
            title.includes("sacrament song") ||
            title.includes("rest hymn") ||
            title.includes("intermediate hymn"))
    );
};

// Get item config - uses stored config or falls back to legacy heuristics
function getItemConfig(item: AgendaItem): ItemConfig {
    // If item has stored config, use it
    if (item.config) {
        return item.config;
    }

    // Legacy fallback for backward compatibility
    const isHymn = isLegacyHymnItem(item);

    return {
        requires_assignee: item.item_type === "speaker" ||
            (item.item_type === "procedural" && !isHymn),
        requires_resource: isHymn,
        has_rich_text: item.item_type === "speaker",
    };
}

// Hymn book logos
const getHymnBookLogo = (bookId: string) => {
    const logos: Record<string, { src: string; alt: string }> = {
        hymns_church: {
            src: "/images/lds-hymns.svg",
            alt: "LDS Hymns",
        },
        hymns_home_church: {
            src: "/images/home-church.svg",
            alt: "Home Church Collection",
        },
    };
    return logos[bookId] || { src: "/images/lds-hymns.svg", alt: "Hymnal" };
};

interface Participant {
    id: string;
    name: string;
}

interface Hymn {
    id: string;
    hymn_number: number;
    title: string;
    book_id: string;
}

interface SortableAgendaRowProps {
    item: AgendaItem;
    isEditable: boolean;
    isUpdating: boolean;
    onUpdate: (
        itemId: string,
        updates: Partial<AgendaItem>,
        optimisticItem: AgendaItem
    ) => Promise<boolean>;
    onDelete: (itemId: string) => void;
    participants: Participant[];
    hymns: Hymn[];
    onLoadParticipants: () => void;
    onLoadHymns: () => void;
    isLoadingParticipants: boolean;
    isLoadingHymns: boolean;
    onCreateParticipant: (name: string) => Promise<Participant | null>;
}

function SortableAgendaRow({
    item,
    isEditable,
    isUpdating,
    onUpdate,
    onDelete,
    participants,
    hymns,
    onLoadParticipants,
    onLoadHymns,
    isLoadingParticipants,
    isLoadingHymns,
    onCreateParticipant,
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

    // Config-driven rendering
    const config = getItemConfig(item);
    const showParticipant = config.requires_assignee;
    const showHymn = config.requires_resource;
    const showRichText = config.has_rich_text;

    // Convert participants to ComboboxOption
    const participantOptions: ComboboxOption[] = participants.map((p) => ({
        id: p.id,
        label: p.name,
    }));

    // Convert hymns to ComboboxOption
    const hymnOptions: ComboboxOption[] = hymns.map((h) => {
        const logo = getHymnBookLogo(h.book_id);
        return {
            id: h.id,
            label: h.title,
            sublabel: `#${h.hymn_number}`,
            icon: (
                <div className="relative w-5 h-5 shrink-0">
                    <Image
                        src={logo.src}
                        alt={logo.alt}
                        width={20}
                        height={20}
                        className="object-contain"
                    />
                </div>
            ),
        };
    });

    // Current participant as ComboboxOption
    const currentParticipant: ComboboxOption | null = item.participant_id
        ? {
            id: item.participant_id,
            label: item.participant_name || "Unknown",
        }
        : null;

    // Current hymn as ComboboxOption
    const currentHymn: ComboboxOption | null = item.hymn_id && item.hymn
        ? {
            id: item.hymn_id,
            label: item.hymn.title,
            sublabel: `#${item.hymn.hymn_number}`,
        }
        : null;

    // Handle title save
    const handleTitleSave = useCallback(
        async (newTitle: string) => {
            if (!newTitle.trim()) return false;
            const optimisticItem: AgendaItem = { ...item, title: newTitle };
            return onUpdate(item.id, { title: newTitle }, optimisticItem);
        },
        [item, onUpdate]
    );

    // Handle duration save
    const handleDurationSave = useCallback(
        async (newDuration: string) => {
            const duration = parseInt(newDuration) || null;
            const optimisticItem: AgendaItem = {
                ...item,
                duration_minutes: duration,
            };
            return onUpdate(item.id, { duration_minutes: duration }, optimisticItem);
        },
        [item, onUpdate]
    );

    // Handle participant select
    const handleParticipantSelect = useCallback(
        async (option: ComboboxOption | null) => {
            const optimisticItem: AgendaItem = {
                ...item,
                participant_id: option?.id || null,
                participant_name: option?.label || null,
            };
            return onUpdate(
                item.id,
                {
                    participant_id: option?.id || null,
                    participant_name: option?.label || null,
                },
                optimisticItem
            );
        },
        [item, onUpdate]
    );

    // Handle hymn select
    const handleHymnSelect = useCallback(
        async (option: ComboboxOption | null) => {
            const selectedHymn = option
                ? hymns.find((h) => h.id === option.id)
                : null;
            const optimisticItem: AgendaItem = {
                ...item,
                hymn_id: option?.id || null,
                hymn: selectedHymn
                    ? {
                        title: selectedHymn.title,
                        hymn_number: selectedHymn.hymn_number,
                    }
                    : null,
            };
            return onUpdate(item.id, { hymn_id: option?.id || null }, optimisticItem);
        },
        [item, hymns, onUpdate]
    );

    // Handle create new participant
    const handleCreateParticipant = useCallback(
        async (name: string): Promise<ComboboxOption | null> => {
            const newParticipant = await onCreateParticipant(name);
            if (newParticipant) {
                return {
                    id: newParticipant.id,
                    label: newParticipant.name,
                };
            }
            return null;
        },
        [onCreateParticipant]
    );

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex gap-2 p-4 rounded-lg border bg-card transition-all",
                item.is_completed && "bg-muted/50 opacity-80",
                isUpdating && "ring-2 ring-primary/20",
                isDragging && "opacity-50 shadow-lg ring-2 ring-primary/40"
            )}
        >
            {/* Drag Handle */}
            {isEditable && (
                <div
                    {...attributes}
                    {...listeners}
                    className="flex-none pt-1 cursor-grab active:cursor-grabbing touch-none"
                >
                    <GripVertical className="w-5 h-5 text-muted-foreground/50 hover:text-muted-foreground" />
                </div>
            )}

            {/* Order Number */}
            <div className="flex-none pt-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {item.order_index + 1}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow space-y-2 min-w-0">
                {/* Title Row */}
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Inline Title */}
                            {isEditable ? (
                                <InlineInput
                                    value={item.title}
                                    onSave={handleTitleSave}
                                    placeholder="Enter title..."
                                    disabled={isUpdating}
                                    displayClassName={cn(
                                        "font-medium",
                                        item.is_completed && "line-through text-muted-foreground"
                                    )}
                                />
                            ) : (
                                <span
                                    className={cn(
                                        "font-medium",
                                        item.is_completed && "line-through text-muted-foreground"
                                    )}
                                >
                                    {item.title}
                                </span>
                            )}

                            {/* Inline Duration */}
                            {isEditable ? (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 h-5 font-normal text-muted-foreground inline-flex items-center gap-0.5"
                                >
                                    <Clock className="w-3 h-3" />
                                    <InlineInput
                                        value={item.duration_minutes?.toString() || ""}
                                        onSave={handleDurationSave}
                                        type="number"
                                        placeholder="0"
                                        emptyText="0"
                                        suffix="m"
                                        min={0}
                                        max={999}
                                        disabled={isUpdating}
                                        inputClassName="w-12 h-5 text-[10px]"
                                        displayClassName="text-[10px]"
                                    />
                                </Badge>
                            ) : item.duration_minutes ? (
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1 h-5 font-normal text-muted-foreground"
                                >
                                    <Clock className="w-3 h-3 mr-1" />
                                    {item.duration_minutes}m
                                </Badge>
                            ) : null}
                        </div>
                        {item.description && (
                            <p className="text-sm text-muted-foreground">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Subtle icon for non-procedural standalone items */}
                        {item.item_type !== "procedural" && (
                            <span
                                className="text-muted-foreground/50"
                                title={{
                                    discussion: "Discussion",
                                    business: "Business Item",
                                    announcement: "Announcement",
                                    speaker: "Speaker",
                                }[item.item_type] || item.item_type}
                            >
                                {item.item_type === "discussion" && <MessageSquare className="h-4 w-4" />}
                                {item.item_type === "business" && <Briefcase className="h-4 w-4" />}
                                {item.item_type === "announcement" && <Megaphone className="h-4 w-4" />}
                                {item.item_type === "speaker" && <User className="h-4 w-4" />}
                            </span>
                        )}
                        {/* Row Actions */}
                        {isEditable && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity"
                                    >
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => onDelete(item.id)}
                                        className="text-destructive focus:text-destructive"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Item
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Editable Fields Row */}
                {(showParticipant || showHymn || showRichText) && (
                    <div className="flex flex-wrap gap-x-2 gap-y-2 pt-1">
                        {/* Participant Selector */}
                        {showParticipant && (
                            <div
                                onMouseEnter={onLoadParticipants}
                                onFocus={onLoadParticipants}
                            >
                                {isEditable ? (
                                    <InlineCombobox
                                        value={currentParticipant}
                                        options={participantOptions}
                                        onSelect={handleParticipantSelect}
                                        onCreateNew={handleCreateParticipant}
                                        placeholder="Assign participant"
                                        emptyText="Assign participant"
                                        searchPlaceholder="Search participants..."
                                        noResultsText="No participants yet"
                                        disabled={isUpdating}
                                        isLoading={isLoadingParticipants}
                                        icon={<User className="h-3.5 w-3.5 text-muted-foreground" />}
                                        compact
                                        tooltipText="Assign participant"
                                    />
                                ) : item.participant_name ? (
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <User className="h-3.5 w-3.5" />
                                        {item.participant_name}
                                    </span>
                                ) : null}
                            </div>
                        )}

                        {/* Hymn Selector */}
                        {showHymn && (
                            <div
                                onMouseEnter={onLoadHymns}
                                onFocus={onLoadHymns}
                            >
                                {isEditable ? (
                                    <InlineCombobox
                                        value={currentHymn}
                                        options={hymnOptions}
                                        onSelect={handleHymnSelect}
                                        placeholder="Select hymn"
                                        emptyText="Select hymn"
                                        searchPlaceholder="Search by number or title..."
                                        noResultsText="No hymns found"
                                        disabled={isUpdating}
                                        isLoading={isLoadingHymns}
                                        icon={<Music className="h-3.5 w-3.5 text-muted-foreground" />}
                                        compact
                                        tooltipText="Assign hymn"
                                    />
                                ) : item.hymn ? (
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Music className="h-3.5 w-3.5" />
                                        #{item.hymn.hymn_number} - {item.hymn.title}
                                    </span>
                                ) : null}
                            </div>
                        )}
                    </div>
                )}

                {/* Rich Text / Description Editor */}
                {showRichText && (
                    <div className="pt-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Topic / Notes</span>
                        </div>
                        {isEditable ? (
                            <Textarea
                                value={item.description || ""}
                                onChange={(e) => {
                                    const optimisticItem: AgendaItem = {
                                        ...item,
                                        description: e.target.value,
                                    };
                                    onUpdate(item.id, { description: e.target.value }, optimisticItem);
                                }}
                                placeholder="Enter topic or notes..."
                                disabled={isUpdating}
                                className="min-h-[60px] text-sm resize-none"
                                rows={2}
                            />
                        ) : item.description ? (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {item.description}
                            </p>
                        ) : null}
                    </div>
                )}

                {/* Notes display */}
                {item.notes && typeof item.notes === "string" && (
                    <div className="mt-2 text-sm bg-yellow-50/50 p-2 rounded border border-yellow-100 dark:bg-yellow-950/10 dark:border-yellow-900/30">
                        <span className="font-medium text-xs text-yellow-700 dark:text-yellow-500 block mb-1">
                            Notes:
                        </span>
                        {item.notes}
                    </div>
                )}
            </div>

            {/* Completion Checkbox */}
            <div className="flex-none pt-1">
                <Checkbox
                    checked={item.is_completed}
                    disabled
                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                />
            </div>
        </div>
    );
}

export function EditableAgendaItemList({
    items: initialItems,
    meetingId,
    isEditable = true,
    onItemsChange,
}: EditableAgendaItemListProps) {
    const [items, setItems] = useState<AgendaItem[]>(initialItems);
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [hymns, setHymns] = useState<Hymn[]>([]);
    const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
    const [isLoadingHymns, setIsLoadingHymns] = useState(false);
    const [participantsLoaded, setParticipantsLoaded] = useState(false);
    const [hymnsLoaded, setHymnsLoaded] = useState(false);
    const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    // Modal state for item picker
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);
    const [preFilterCategory, setPreFilterCategory] = useState<CategoryType | undefined>(undefined);

    // Compute grouped entries for rendering
    const groupedEntries = useMemo(() => groupAgendaItems(items), [items]);
    const groupedIds = useMemo(() => getGroupedItemIds(groupedEntries), [groupedEntries]);

    // dnd-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Sync with external items changes
    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    // Load participants lazily
    const loadParticipants = useCallback(async () => {
        if (participantsLoaded || isLoadingParticipants) return;

        setIsLoadingParticipants(true);
        const supabase = createClient();

        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
            setIsLoadingParticipants(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase.from("profiles") as any)
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) {
            setIsLoadingParticipants(false);
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("participants") as any)
            .select("id, name")
            .eq("workspace_id", profile.workspace_id)
            .order("name");

        if (!error && data) {
            setParticipants(data);
        }
        setParticipantsLoaded(true);
        setIsLoadingParticipants(false);
    }, [participantsLoaded, isLoadingParticipants]);

    // Load hymns lazily
    const loadHymns = useCallback(async () => {
        if (hymnsLoaded || isLoadingHymns) return;

        setIsLoadingHymns(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.from("hymns") as any)
            .select("id, hymn_number, title, book_id")
            .order("hymn_number");

        if (!error && data) {
            setHymns(data);
        }
        setHymnsLoaded(true);
        setIsLoadingHymns(false);
    }, [hymnsLoaded, isLoadingHymns]);

    // Create new participant
    const createParticipant = useCallback(
        async (name: string): Promise<Participant | null> => {
            const supabase = createClient();

            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!user) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: profile } = await (supabase.from("profiles") as any)
                .select("workspace_id")
                .eq("id", user.id)
                .single();

            if (!profile?.workspace_id) return null;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("participants") as any)
                .insert({
                    name: name.trim(),
                    workspace_id: profile.workspace_id,
                })
                .select()
                .single();

            if (!error && data) {
                // Add to local participants list
                setParticipants((prev) => [...prev, data].sort((a, b) =>
                    a.name.localeCompare(b.name)
                ));
                return data;
            }
            return null;
        },
        []
    );

    // Optimistic update helper
    const updateItem = useCallback(
        async (
            itemId: string,
            updates: Partial<AgendaItem>,
            optimisticItem: AgendaItem
        ): Promise<boolean> => {
            // Optimistic update
            const previousItems = items;
            const newItems = items.map((item) =>
                item.id === itemId ? optimisticItem : item
            );
            setItems(newItems);
            onItemsChange?.(newItems);

            // Persist to database
            setUpdatingItemId(itemId);
            const supabase = createClient();

            // Use .select() to return updated data and detect RLS failures
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from("agenda_items") as any)
                .update(updates)
                .eq("id", itemId)
                .select();

            setUpdatingItemId(null);

            if (error) {
                // Database error
                setItems(previousItems);
                onItemsChange?.(previousItems);
                toast.error("Update failed", { description: error.message || "Could not save changes. Please try again." });
                return false;
            }

            if (!data || data.length === 0) {
                // RLS policy blocked the update (no rows affected)
                setItems(previousItems);
                onItemsChange?.(previousItems);
                toast.error("Update failed", { description: "You don't have permission to edit this item." });
                return false;
            }

            toast.success("Saved", { description: "Changes saved successfully." });
            return true;
        },
        [items, onItemsChange]
    );

    // Open the item picker modal at a specific position
    const openPickerAtPosition = useCallback((index: number) => {
        setInsertAtIndex(index);
        setIsPickerOpen(true);
    }, []);

    // Handle item selected from modal
    const handleItemSelected = useCallback(
        async (selectedItem: SelectedItem) => {
            const targetIndex = insertAtIndex ?? items.length;
            await insertItemAtPosition({
                title: selectedItem.title,
                item_type: selectedItem.category === "procedural" ? "procedural" : selectedItem.category,
                duration_minutes: selectedItem.duration_minutes,
                discussion_id: selectedItem.discussion_id,
                business_item_id: selectedItem.business_item_id,
                announcement_id: selectedItem.announcement_id,
                speaker_id: selectedItem.speaker_id,
                hymn_id: selectedItem.is_hymn ? selectedItem.procedural_item_type_id : undefined,
            }, targetIndex);
            setInsertAtIndex(null);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [insertAtIndex, items.length]
    );

    // Insert item at specific position
    const insertItemAtPosition = useCallback(
        async (
            data: {
                title: string;
                item_type: string;
                duration_minutes: number | null;
                discussion_id?: string;
                business_item_id?: string;
                announcement_id?: string;
                speaker_id?: string;
                hymn_id?: string;
            },
            targetIndex: number
        ): Promise<boolean> => {
            const supabase = createClient();

            // Insert the new item
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: newItem, error: insertError } = await (supabase.from("agenda_items") as any)
                .insert({
                    meeting_id: meetingId,
                    title: data.title,
                    item_type: data.item_type,
                    duration_minutes: data.duration_minutes,
                    order_index: targetIndex,
                    discussion_id: data.discussion_id || null,
                    business_item_id: data.business_item_id || null,
                    announcement_id: data.announcement_id || null,
                    speaker_id: data.speaker_id || null,
                })
                .select()
                .single();

            if (insertError || !newItem) {
                toast.error("Failed to add item", { description: insertError?.message || "Could not add item. Please try again." });
                return false;
            }

            // Shift existing items that come after the insertion point
            const itemsToShift = items.filter((item) => item.order_index >= targetIndex);
            if (itemsToShift.length > 0) {
                const updates = itemsToShift.map((item) => ({
                    id: item.id,
                    order_index: item.order_index + 1,
                }));

                for (const update of updates) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    await (supabase.from("agenda_items") as any)
                        .update({ order_index: update.order_index })
                        .eq("id", update.id);
                }
            }

            // Update local state
            const updatedItems = items.map((item) =>
                item.order_index >= targetIndex
                    ? { ...item, order_index: item.order_index + 1 }
                    : item
            );
            updatedItems.push(newItem as AgendaItem);
            updatedItems.sort((a, b) => a.order_index - b.order_index);

            setItems(updatedItems);
            onItemsChange?.(updatedItems);

            toast.success("Item added", { description: `"${data.title}" has been added to the agenda.` });
            return true;
        },
        [items, meetingId, onItemsChange]
    );
    // Open picker for adding at bottom
    const openPickerAtBottom = useCallback(() => {
        const nextIndex = items.length > 0
            ? Math.max(...items.map((i) => i.order_index)) + 1
            : 0;
        setInsertAtIndex(nextIndex);
        setPreFilterCategory(undefined); // No pre-filter
        setIsPickerOpen(true);
    }, [items]);

    // Open picker pre-filtered for a specific group type
    const openPickerForGroup = useCallback((groupType: string) => {
        // Find the last item of this type to insert after it
        const itemsOfType = items.filter((i) => i.item_type === groupType);
        const lastItemOfType = itemsOfType.length > 0
            ? itemsOfType[itemsOfType.length - 1]
            : null;

        const insertIdx = lastItemOfType
            ? lastItemOfType.order_index + 1
            : items.length > 0
                ? Math.max(...items.map((i) => i.order_index)) + 1
                : 0;

        setInsertAtIndex(insertIdx);
        // Map groupType to picker category
        const categoryMap: Record<string, CategoryType> = {
            announcement: "announcement",
            business: "business",
            discussion: "discussion",
        };
        setPreFilterCategory(categoryMap[groupType] || undefined);
        setIsPickerOpen(true);
    }, [items]);

    // Delete item
    const handleDeleteItem = useCallback(async () => {
        if (!deletingItemId) return;

        setIsDeleting(true);
        const supabase = createClient();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from("agenda_items") as any)
            .delete()
            .eq("id", deletingItemId);

        setIsDeleting(false);

        if (error) {
            toast.error("Failed to delete", { description: error.message || "Could not delete item. Please try again." });
            setDeletingItemId(null);
            return;
        }

        // Update local state and re-index
        const filteredItems = items.filter((item) => item.id !== deletingItemId);
        const reindexedItems = filteredItems.map((item, idx) => ({
            ...item,
            order_index: idx,
        }));

        setItems(reindexedItems);
        onItemsChange?.(reindexedItems);
        setDeletingItemId(null);

        // Update order_index in database
        for (const item of reindexedItems) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("agenda_items") as any)
                .update({ order_index: item.order_index })
                .eq("id", item.id);
        }

        toast.success("Item deleted", { description: "The agenda item has been removed." });
    }, [deletingItemId, items, onItemsChange]);

    // Handle drag end for reordering
    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;

            if (!over || active.id === over.id) return;

            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            // Optimistic update
            const reorderedItems = arrayMove(items, oldIndex, newIndex).map(
                (item, idx) => ({ ...item, order_index: idx })
            );

            setItems(reorderedItems);
            onItemsChange?.(reorderedItems);

            // Persist to database
            const supabase = createClient();
            const updates = reorderedItems.map((item) => ({
                id: item.id,
                order_index: item.order_index,
            }));

            for (const update of updates) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase.from("agenda_items") as any)
                    .update({ order_index: update.order_index })
                    .eq("id", update.id);
            }

            toast.success("Order updated", { description: "Agenda order has been saved." });
        },
        [items, onItemsChange]
    );

    if (items.length === 0) {
        return (
            <>
                <div className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed text-sm">
                        No agenda items added yet.
                    </div>
                    {isEditable && (
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={openPickerAtBottom}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Agenda Item
                        </Button>
                    )}
                </div>
                {/* Add Meeting Item Dialog */}
                <AddMeetingItemDialog
                    open={isPickerOpen}
                    onClose={() => {
                        setIsPickerOpen(false);
                        setInsertAtIndex(null);
                        setPreFilterCategory(undefined);
                    }}
                    onAddItem={handleItemSelected}
                    initialCategory={preFilterCategory}
                />
            </>
        );
    }

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={groupedIds}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {groupedEntries.map((entry) => {
                            if (entry.type === "group") {
                                return (
                                    <div key={entry.id}>
                                        {/* Ghost Divider before group */}
                                        {isEditable && (
                                            <AgendaItemDivider
                                                onAddClick={() => openPickerAtPosition(entry.order_index)}
                                                disabled={!isEditable}
                                            />
                                        )}
                                        <AgendaGroupRow
                                            group={entry}
                                            isEditable={isEditable}
                                            onAddToGroup={openPickerForGroup}
                                            renderChildItem={(item) => (
                                                <div className="bg-background rounded-md border p-3">
                                                    <div className="flex items-center gap-2">
                                                        {/* No badge for grouped items - group header provides context */}
                                                        <span className="text-sm font-medium flex-1 truncate">
                                                            {item.title}
                                                        </span>
                                                        {isEditable && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 w-6 p-0"
                                                                    >
                                                                        <MoreVertical className="h-3 w-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem
                                                                        onClick={() => setDeletingItemId(item.id)}
                                                                        className="text-destructive focus:text-destructive"
                                                                    >
                                                                        <Trash2 className="mr-2 h-3 w-3" />
                                                                        Delete
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        />
                                    </div>
                                );
                            } else if (entry.type === "container") {
                                // Stored container from the meeting builder (Discussions, Announcements, Business)
                                return (
                                    <div key={entry.id}>
                                        {/* Ghost Divider before container */}
                                        {isEditable && (
                                            <AgendaItemDivider
                                                onAddClick={() => openPickerAtPosition(entry.order_index)}
                                                disabled={!isEditable}
                                            />
                                        )}
                                        <AgendaGroupRow
                                            container={entry}
                                            isEditable={isEditable}
                                            onAddToGroup={openPickerForGroup}
                                            renderStoredChildItem={(childItem, index) => {
                                                // Check if this is a business item with script data
                                                const isBusinessItem = !!childItem.business_item_id && !!childItem.business_category;
                                                const conductingScript = isBusinessItem
                                                    ? generateBusinessScript({
                                                          person_name: childItem.person_name || childItem.title.split(" - ")[0] || "",
                                                          position_calling: childItem.position_calling || null,
                                                          category: childItem.business_category || "other",
                                                          notes: childItem.description || null,
                                                          // Cast to correct type since it comes from JSONB
                                                          details: childItem.business_details as Parameters<typeof generateBusinessScript>[0]["details"],
                                                      })
                                                    : null;

                                                return (
                                                    <div key={index} className="bg-background rounded-md border overflow-hidden">
                                                        {/* Header with title */}
                                                        <div className="flex items-center gap-2 p-3">
                                                            <span className="text-sm font-medium flex-1">
                                                                {childItem.title}
                                                            </span>
                                                            {isBusinessItem && childItem.business_category && (
                                                                <Badge variant="outline" className="text-xs shrink-0">
                                                                    {BUSINESS_CATEGORIES[childItem.business_category as keyof typeof BUSINESS_CATEGORIES] || childItem.business_category}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Conducting Script for business items */}
                                                        {isBusinessItem && conductingScript && (
                                                            <details className="group border-t">
                                                                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm text-blue-600 font-medium">
                                                                    <ScrollText className="h-4 w-4" />
                                                                    <span>Conducting Script</span>
                                                                    <ChevronRight className="h-4 w-4 ml-auto group-open:hidden" />
                                                                    <ChevronDown className="h-4 w-4 ml-auto hidden group-open:block" />
                                                                </summary>
                                                                <div className="px-3 pb-3">
                                                                    <div className="p-3 bg-blue-50 rounded-md border border-blue-200 text-sm font-serif leading-relaxed whitespace-pre-wrap">
                                                                        {conductingScript}
                                                                    </div>
                                                                </div>
                                                            </details>
                                                        )}

                                                        {/* Description/Notes for non-business items */}
                                                        {!isBusinessItem && childItem.description && (
                                                            <div className="px-3 pb-3 pt-0">
                                                                <p className="text-xs text-muted-foreground">
                                                                    {childItem.description}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }}
                                        />
                                    </div>
                                );
                            } else {
                                // Single item
                                const item = entry.item;
                                const flatIndex = items.findIndex((i) => i.id === item.id);
                                return (
                                    <div key={item.id} className="group">
                                        {/* Ghost Divider before item */}
                                        {isEditable && (
                                            <AgendaItemDivider
                                                onAddClick={() => openPickerAtPosition(flatIndex)}
                                                disabled={!isEditable}
                                            />
                                        )}
                                        <SortableAgendaRow
                                            item={item}
                                            isEditable={isEditable}
                                            isUpdating={updatingItemId === item.id}
                                            onUpdate={updateItem}
                                            onDelete={setDeletingItemId}
                                            participants={participants}
                                            hymns={hymns}
                                            onLoadParticipants={loadParticipants}
                                            onLoadHymns={loadHymns}
                                            isLoadingParticipants={isLoadingParticipants}
                                            isLoadingHymns={isLoadingHymns}
                                            onCreateParticipant={createParticipant}
                                        />
                                    </div>
                                );
                            }
                        })}
                        {/* Ghost Divider after last entry */}
                        {isEditable && (
                            <AgendaItemDivider
                                onAddClick={() => openPickerAtPosition(items.length)}
                                disabled={!isEditable}
                            />
                        )}
                    </div>
                </SortableContext>
            </DndContext>

            {/* Add Item Button at Bottom */}
            {isEditable && (
                <div className="mt-4">
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={openPickerAtBottom}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Agenda Item
                    </Button>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingItemId} onOpenChange={() => setDeletingItemId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Agenda Item?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this item from the agenda.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteItem}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add Meeting Item Dialog */}
            <AddMeetingItemDialog
                open={isPickerOpen}
                onClose={() => {
                    setIsPickerOpen(false);
                    setInsertAtIndex(null);
                    setPreFilterCategory(undefined);
                }}
                onAddItem={handleItemSelected}
                initialCategory={preFilterCategory}
            />
        </>
    );
}
