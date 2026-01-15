"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Plus,
    Trash2,
    GripVertical,
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    ChevronRight,
    Pencil,
    UserPlus,
    Mic,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AddMeetingItemDialog, SelectedItem, CategoryType } from "./add-meeting-item-dialog";
import { UnifiedSelectorModal, UnifiedSelectorMode, SpeakerSelection } from "./unified-selector-modal";
import { ContainerAgendaItem, ContainerChildItem, ContainerType } from "./container-agenda-item";

// Composed agenda item type
export interface ComposedAgendaItem {
    id: string; // Temporary client-side ID
    category: CategoryType;
    title: string;
    description?: string | null;
    duration_minutes: number;
    order_index: number;
    // Type-specific IDs
    procedural_item_type_id?: string;
    discussion_id?: string;
    business_item_id?: string;
    announcement_id?: string;
    speaker_id?: string;
    // Hymn selection
    is_hymn?: boolean;
    hymn_id?: string;
    hymn_number?: number;
    hymn_title?: string;
    // Speaker details
    speaker_name?: string;
    // Container support
    isContainer?: boolean;
    containerType?: ContainerType;
    childItems?: ContainerChildItem[];
    // Participant assignment (for procedural items)
    participant_id?: string;
    participant_name?: string;
    requires_participant?: boolean;
    // Status/type for child items
    status?: string;
    business_type?: string;
    priority?: string;
}

interface MeetingComposerProps {
    templateId: string;
    meetingTitle: string;
    meetingDate: Date;
    onBack: () => void;
    onNext: (composedAgenda: ComposedAgendaItem[]) => void;
}

export function MeetingComposer({
    templateId,
    meetingTitle,
    meetingDate,
    onBack,
    onNext,
}: MeetingComposerProps) {
    const [agendaItems, setAgendaItems] = useState<ComposedAgendaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    // Container state
    const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
    // Unified selector modal state
    const [unifiedModalOpen, setUnifiedModalOpen] = useState(false);
    const [unifiedModalMode, setUnifiedModalMode] = useState<UnifiedSelectorMode>("hymn");
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [targetContainerId, setTargetContainerId] = useState<string | null>(null);

    useEffect(() => {
        loadTemplateAndInjectItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    const loadTemplateAndInjectItems = async () => {
        console.log("Loading template items for templateId:", templateId);
        setIsLoading(true);
        const supabase = createClient();

        try {
            // 1. Load template items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: templateItems, error: templateError } = await (supabase
                .from("template_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("*, procedural_item_types(id, name, is_hymn)")
                .eq("template_id", templateId)
                .order("order_index");

            console.log("Template items query result:", { templateItems, templateError });

            if (templateError) {
                console.error("Error loading template items:", templateError);
                setIsLoading(false);
                return;
            }

            if (!templateItems || templateItems.length === 0) {
                console.log("No template items found for templateId:", templateId);
                setIsLoading(false);
                return;
            }

            // 2. Load linked discussions from junction table
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let linkedDiscussions: any[] | null = null;
            const { data: discData, error: discError } = await (supabase
                .from("discussion_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("discussion_id, discussions(id, title, description, status)")
                .eq("template_id", templateId);
            if (!discError) linkedDiscussions = discData;

            // 3. Load linked business items from junction table
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let linkedBusiness: any[] | null = null;
            const { data: bizData, error: bizError } = await (supabase
                .from("business_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("business_item_id, business_items(id, person_name, position_calling, category, notes, status)")
                .eq("template_id", templateId);
            if (!bizError) linkedBusiness = bizData;
            console.log("Linked business items:", linkedBusiness?.length || 0);

            // 4. Load linked announcements from junction table
            // Note: announcements table uses 'content' not 'description'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let linkedAnnouncements: any[] | null = null;
            const { data: annData, error: annError } = await (supabase
                .from("announcement_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("announcement_id, announcements(id, title, content, status, priority)")
                .eq("template_id", templateId);
            if (!annError) linkedAnnouncements = annData;
            console.log("Linked announcements:", linkedAnnouncements?.length || 0);

            // Build composed agenda
            const composed: ComposedAgendaItem[] = [];
            let orderIndex = 0;

            for (const item of templateItems) {
                // Infer requires_participant from item name if column doesn't exist
                const itemName = (item.procedural_item_types?.name || item.title || "").toLowerCase();
                const inferredRequiresParticipant =
                    item.procedural_item_types?.requires_participant ??
                    (itemName.includes("prayer") ||
                        itemName.includes("preside") ||
                        itemName.includes("conduct") ||
                        itemName.includes("invocation") ||
                        itemName.includes("benediction") ||
                        itemName.includes("spiritual thought") ||
                        itemName.includes("testimony"));

                const baseItem: ComposedAgendaItem = {
                    id: `temp-${Date.now()}-${orderIndex}`,
                    category: item.item_type as CategoryType,
                    title: item.title,
                    description: item.description,
                    duration_minutes: item.duration_minutes || 5,
                    order_index: orderIndex++,
                    procedural_item_type_id: item.procedural_item_type_id,
                    is_hymn: item.procedural_item_types?.is_hymn || itemName.includes("hymn"),
                    requires_participant: inferredRequiresParticipant,
                };

                // For specialized types, create containers with child items
                if (item.item_type === "discussion") {
                    // Create container for discussions
                    const childItems: ContainerChildItem[] = [];
                    if (linkedDiscussions?.length) {
                        for (const link of linkedDiscussions) {
                            const disc = link.discussions;
                            if (disc && ["new", "active", "decision_required"].includes(disc.status)) {
                                childItems.push({
                                    id: `child-disc-${disc.id}`,
                                    title: disc.title,
                                    description: disc.description,
                                    discussion_id: disc.id,
                                    status: disc.status,
                                });
                            }
                        }
                    }
                    composed.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "discussion",
                        childItems,
                    });
                } else if (item.item_type === "business") {
                    // Create container for business items - populate from linked items in junction table
                    const childItems: ContainerChildItem[] = [];
                    if (linkedBusiness?.length) {
                        for (const link of linkedBusiness) {
                            const biz = link.business_items;
                            if (biz && biz.status === "pending") {
                                childItems.push({
                                    id: `child-biz-${biz.id}`,
                                    title: `${biz.person_name}${biz.position_calling ? ` - ${biz.position_calling}` : ""}`,
                                    description: biz.notes,
                                    business_item_id: biz.id,
                                    business_type: biz.category,
                                });
                            }
                        }
                    }
                    composed.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "business",
                        childItems,
                    });
                } else if (item.item_type === "announcement") {
                    // Create container for announcements - populate from linked items in junction table
                    const childItems: ContainerChildItem[] = [];
                    if (linkedAnnouncements?.length) {
                        for (const link of linkedAnnouncements) {
                            const ann = link.announcements;
                            if (ann && ann.status === "active") {
                                childItems.push({
                                    id: `child-ann-${ann.id}`,
                                    title: ann.title,
                                    description: ann.content, // Note: announcements table uses 'content' not 'description'
                                    announcement_id: ann.id,
                                    priority: ann.priority,
                                });
                            }
                        }
                    }
                    composed.push({
                        ...baseItem,
                        isContainer: true,
                        containerType: "announcement",
                        childItems,
                    });
                } else if (item.item_type === "speaker") {
                    // Speaker items are placeholders - user assigns during compose
                    composed.push(baseItem);
                } else {
                    // Procedural items go through as-is
                    composed.push(baseItem);
                }
            }

            // Expand all containers by default
            const containerIds = composed
                .filter((item) => item.isContainer)
                .map((item) => item.id);
            setExpandedContainers(new Set(containerIds));

            console.log("Setting agenda items:", composed.length, "items", composed);
            setAgendaItems(composed);
        } catch (error) {
            console.error("Error loading template:", error);
        }

        setIsLoading(false);
    };

    const handleAddItem = (item: SelectedItem) => {
        const newItem: ComposedAgendaItem = {
            id: `temp-${Date.now()}`,
            category: item.category,
            title: item.title,
            description: item.description,
            duration_minutes: item.duration_minutes,
            order_index: agendaItems.length,
            procedural_item_type_id: item.procedural_item_type_id,
            is_hymn: item.is_hymn,
            discussion_id: item.discussion_id,
            business_item_id: item.business_item_id,
            announcement_id: item.announcement_id,
            speaker_id: item.speaker_id,
        };
        setAgendaItems([...agendaItems, newItem]);
    };

    const handleRemoveItem = (id: string) => {
        setAgendaItems(agendaItems.filter((item) => item.id !== id));
    };

    // Handle hymn selection from unified modal
    const handleSelectHymn = (hymn: { id: string; number: number; title: string }) => {
        if (selectedItemId) {
            setAgendaItems(agendaItems.map((item) =>
                item.id === selectedItemId
                    ? {
                        ...item,
                        hymn_id: hymn.id,
                        hymn_number: hymn.number,
                        hymn_title: hymn.title,
                    }
                    : item
            ));
        }
        setUnifiedModalOpen(false);
        setSelectedItemId(null);
    };

    // Handle participant selection from unified modal
    const handleSelectParticipant = (participant: { id: string; name: string }) => {
        if (selectedItemId) {
            setAgendaItems(agendaItems.map((item) =>
                item.id === selectedItemId
                    ? {
                        ...item,
                        participant_id: participant.id,
                        participant_name: participant.name,
                    }
                    : item
            ));
        }
        setUnifiedModalOpen(false);
        setSelectedItemId(null);
    };

    // Handle adding item to container from unified modal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddToContainer = (
        selectedItem: any,
        type: ContainerType
    ) => {
        if (!targetContainerId) return;

        let itemTitle: string;
        let itemDescription: string | null;
        let businessType: string | undefined;

        if (type === "business") {
            // BusinessSelection uses person_name, position_calling, category, notes
            itemTitle = `${selectedItem.person_name}${selectedItem.position_calling ? ` - ${selectedItem.position_calling}` : ""}`;
            itemDescription = selectedItem.notes;
            businessType = selectedItem.category;
        } else {
            // Discussion and Announcement selections use title and description
            itemTitle = selectedItem.title;
            itemDescription = selectedItem.description;
        }

        const newChild: ContainerChildItem = {
            id: `child-${type}-${selectedItem.id}-${Date.now()}`,
            title: itemTitle,
            description: itemDescription,
        };

        if (type === "discussion") {
            newChild.discussion_id = selectedItem.id;
            newChild.status = selectedItem.status;
        } else if (type === "business") {
            newChild.business_item_id = selectedItem.id;
            newChild.business_type = businessType;
        } else if (type === "announcement") {
            newChild.announcement_id = selectedItem.id;
            newChild.priority = selectedItem.priority;
        }

        setAgendaItems(agendaItems.map((item) =>
            item.id === targetContainerId
                ? {
                    ...item,
                    childItems: [...(item.childItems || []), newChild],
                }
                : item
        ));

        setUnifiedModalOpen(false);
        setTargetContainerId(null);
    };

    // Container toggle expand/collapse
    const toggleContainer = (containerId: string) => {
        setExpandedContainers((prev) => {
            const next = new Set(prev);
            if (next.has(containerId)) {
                next.delete(containerId);
            } else {
                next.add(containerId);
            }
            return next;
        });
    };

    // Hide child item (client-side only)
    const hideChildItem = (containerId: string, childId: string) => {
        setAgendaItems(agendaItems.map((item) =>
            item.id === containerId
                ? {
                    ...item,
                    childItems: (item.childItems || []).filter((c) => c.id !== childId),
                }
                : item
        ));
    };

    // Open unified modal for hymn selection
    const openHymnSelector = (itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("hymn");
        setUnifiedModalOpen(true);
    };

    // Open unified modal for participant selection
    const openParticipantSelector = (itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("participant");
        setUnifiedModalOpen(true);
    };

    // Open unified modal for adding to container
    const openContainerAddModal = (containerId: string, containerType: ContainerType) => {
        setTargetContainerId(containerId);
        setUnifiedModalMode(containerType as UnifiedSelectorMode);
        setUnifiedModalOpen(true);
    };

    // Open unified modal for speaker selection
    const openSpeakerSelector = (itemId: string) => {
        setSelectedItemId(itemId);
        setUnifiedModalMode("speaker");
        setUnifiedModalOpen(true);
    };

    // Handle speaker selection from unified modal
    const handleSelectSpeaker = (speaker: SpeakerSelection) => {
        if (selectedItemId) {
            setAgendaItems(agendaItems.map((item) =>
                item.id === selectedItemId
                    ? {
                        ...item,
                        speaker_id: speaker.id,
                        speaker_name: speaker.name,
                    }
                    : item
            ));
        }
        setUnifiedModalOpen(false);
        setSelectedItemId(null);
    };

    const handleUpdateTitle = (id: string, title: string) => {
        setAgendaItems(agendaItems.map((item) =>
            item.id === id ? { ...item, title } : item
        ));
    };

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

    const totalDuration = agendaItems.reduce((sum, item) => sum + item.duration_minutes, 0);

    // Collect all selected speaker IDs for display in dropdowns
    const selectedSpeakerIdsInMeeting = agendaItems
        .filter((item) => item.speaker_id)
        .map((item) => item.speaker_id as string);

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Compose Agenda</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            {meetingTitle} • {totalDuration} minutes total
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 text-center text-muted-foreground">
                            Loading template...
                        </div>
                    ) : agendaItems.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            No agenda items. Click &quot;Add Item&quot; to get started.
                        </div>
                    ) : (
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-2">
                                {agendaItems.map((item) => (
                                    item.isContainer ? (
                                        // Container item (Discussion, Business, Announcement)
                                        <ContainerAgendaItem
                                            key={item.id}
                                            id={item.id}
                                            title={item.title}
                                            containerType={item.containerType!}
                                            duration_minutes={item.duration_minutes}
                                            isExpanded={expandedContainers.has(item.id)}
                                            onToggleExpand={() => toggleContainer(item.id)}
                                            childItems={item.childItems || []}
                                            onAddChild={() => openContainerAddModal(item.id, item.containerType!)}
                                            onRemoveChild={(childId) => hideChildItem(item.id, childId)}
                                        />
                                    ) : (
                                        // Regular item (Procedural, Speaker)
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-2 p-3 border rounded-lg bg-card hover:bg-accent/30 transition-colors group"
                                        >
                                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />

                                            <div className="shrink-0">
                                                {getCategoryIcon(item.category, item.is_hymn)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {editingItemId === item.id ? (
                                                    <Input
                                                        value={item.title}
                                                        onChange={(e) => handleUpdateTitle(item.id, e.target.value)}
                                                        onBlur={() => setEditingItemId(null)}
                                                        onKeyDown={(e) => e.key === "Enter" && setEditingItemId(null)}
                                                        autoFocus
                                                        className="h-7 text-sm"
                                                    />
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm truncate">
                                                            {item.title}
                                                        </span>
                                                        <button
                                                            onClick={() => setEditingItemId(item.id)}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Hymn selector for hymn items */}
                                                {item.is_hymn && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs mt-1 text-blue-600"
                                                        onClick={() => openHymnSelector(item.id)}
                                                    >
                                                        {item.hymn_title
                                                            ? `#${item.hymn_number} ${item.hymn_title}`
                                                            : "Select Hymn →"
                                                        }
                                                    </Button>
                                                )}

                                                {/* Participant selector for procedural items that require a person */}
                                                {item.category === "procedural" && item.requires_participant && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs mt-1 text-slate-600"
                                                        onClick={() => openParticipantSelector(item.id)}
                                                    >
                                                        <UserPlus className="h-3 w-3 mr-1" />
                                                        {item.participant_name
                                                            ? item.participant_name
                                                            : "Select participant →"
                                                        }
                                                    </Button>
                                                )}

                                                {/* Speaker selector for speaker items */}
                                                {item.category === "speaker" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs mt-1 text-indigo-600"
                                                        onClick={() => openSpeakerSelector(item.id)}
                                                    >
                                                        <Mic className="h-3 w-3 mr-1" />
                                                        {item.speaker_name
                                                            ? item.speaker_name
                                                            : "Select speaker →"
                                                        }
                                                    </Button>
                                                )}
                                            </div>

                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {item.duration_minutes}m
                                            </span>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => handleRemoveItem(item.id)}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button variant="ghost" onClick={onBack}>
                        Back
                    </Button>
                    <Button onClick={() => onNext(agendaItems)} disabled={agendaItems.length === 0}>
                        Next: Review
                        <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                </CardFooter>
            </Card>

            <AddMeetingItemDialog
                open={addDialogOpen}
                onClose={() => setAddDialogOpen(false)}
                onAddItem={handleAddItem}
                templateId={templateId}
                meetingDate={meetingDate}
            />

            <UnifiedSelectorModal
                open={unifiedModalOpen}
                onClose={() => {
                    setUnifiedModalOpen(false);
                    setSelectedItemId(null);
                    setTargetContainerId(null);
                }}
                mode={unifiedModalMode}
                currentSelectionId={
                    selectedItemId
                        ? agendaItems.find((i) => i.id === selectedItemId)?.hymn_id ||
                        agendaItems.find((i) => i.id === selectedItemId)?.participant_id ||
                        agendaItems.find((i) => i.id === selectedItemId)?.speaker_id
                        : undefined
                }
                onSelectHymn={handleSelectHymn}
                onSelectParticipant={handleSelectParticipant}
                onSelectSpeaker={handleSelectSpeaker}
                onSelectDiscussion={(disc) => handleAddToContainer(disc, "discussion")}
                onSelectBusiness={(biz) => handleAddToContainer(biz, "business")}
                onSelectAnnouncement={(ann) => handleAddToContainer(ann, "announcement")}
                selectedSpeakerIdsInMeeting={selectedSpeakerIdsInMeeting}
            />
        </>
    );
}
