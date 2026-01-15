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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { AddMeetingItemDialog, SelectedItem, CategoryType } from "./add-meeting-item-dialog";
import { HymnSelectorModal } from "./hymn-selector-modal";
import { SpeakerSelector } from "./speaker-selector";

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
    const [hymnModalOpen, setHymnModalOpen] = useState(false);
    const [selectedHymnItemId, setSelectedHymnItemId] = useState<string | null>(null);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);

    useEffect(() => {
        loadTemplateAndInjectItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateId]);

    const loadTemplateAndInjectItems = async () => {
        setIsLoading(true);
        const supabase = createClient();

        try {
            // 1. Load template items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: templateItems } = await (supabase
                .from("template_items") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("*, procedural_item_types(is_hymn)")
                .eq("template_id", templateId)
                .order("order_index");

            if (!templateItems) {
                setIsLoading(false);
                return;
            }

            // 2. Load linked discussions
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: linkedDiscussions } = await (supabase
                .from("discussion_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("discussion_id, discussions(id, title, description, status)")
                .eq("template_id", templateId);

            // 3. Load linked business items
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: linkedBusiness } = await (supabase
                .from("business_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("business_item_id, business_items(id, title, description, status)")
                .eq("template_id", templateId);

            // 4. Load linked announcements
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: linkedAnnouncements } = await (supabase
                .from("announcement_templates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .select("announcement_id, announcements(id, title, description, status)")
                .eq("template_id", templateId);

            // Build composed agenda
            const composed: ComposedAgendaItem[] = [];
            let orderIndex = 0;

            for (const item of templateItems) {
                const baseItem: ComposedAgendaItem = {
                    id: `temp-${Date.now()}-${orderIndex}`,
                    category: item.item_type as CategoryType,
                    title: item.title,
                    description: item.description,
                    duration_minutes: item.duration_minutes || 5,
                    order_index: orderIndex++,
                    procedural_item_type_id: item.procedural_item_type_id,
                    is_hymn: item.procedural_item_types?.is_hymn || false,
                };

                // For specialized types, inject linked items instead of placeholder
                if (item.item_type === "discussion" && linkedDiscussions?.length) {
                    // Inject each linked discussion
                    for (const link of linkedDiscussions) {
                        const disc = link.discussions;
                        if (disc && ["new", "active", "decision_required"].includes(disc.status)) {
                            composed.push({
                                id: `temp-${Date.now()}-${orderIndex}`,
                                category: "discussion",
                                title: disc.title,
                                description: disc.description,
                                duration_minutes: 15,
                                order_index: orderIndex++,
                                discussion_id: disc.id,
                            });
                        }
                    }
                } else if (item.item_type === "business" && linkedBusiness?.length) {
                    // Inject each linked business item
                    for (const link of linkedBusiness) {
                        const biz = link.business_items;
                        if (biz && biz.status === "pending") {
                            composed.push({
                                id: `temp-${Date.now()}-${orderIndex}`,
                                category: "business",
                                title: biz.title,
                                description: biz.description,
                                duration_minutes: 3,
                                order_index: orderIndex++,
                                business_item_id: biz.id,
                            });
                        }
                    }
                } else if (item.item_type === "announcement" && linkedAnnouncements?.length) {
                    // Inject each linked announcement
                    for (const link of linkedAnnouncements) {
                        const ann = link.announcements;
                        if (ann && ann.status === "active") {
                            composed.push({
                                id: `temp-${Date.now()}-${orderIndex}`,
                                category: "announcement",
                                title: ann.title,
                                description: ann.description,
                                duration_minutes: 2,
                                order_index: orderIndex++,
                                announcement_id: ann.id,
                            });
                        }
                    }
                } else if (item.item_type === "speaker") {
                    // Speaker items are placeholders - user assigns during compose
                    composed.push(baseItem);
                } else {
                    // Procedural items go through as-is
                    composed.push(baseItem);
                }
            }

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

    const handleSelectHymn = (hymn: { id: string; number: number; title: string }) => {
        if (selectedHymnItemId) {
            setAgendaItems(agendaItems.map((item) =>
                item.id === selectedHymnItemId
                    ? {
                        ...item,
                        hymn_id: hymn.id,
                        hymn_number: hymn.number,
                        hymn_title: hymn.title,
                    }
                    : item
            ));
        }
        setHymnModalOpen(false);
        setSelectedHymnItemId(null);
    };

    const handleSelectSpeaker = (itemId: string, speaker: { id: string; name: string } | null) => {
        setAgendaItems(agendaItems.map((item) =>
            item.id === itemId
                ? {
                    ...item,
                    speaker_id: speaker?.id,
                    speaker_name: speaker?.name,
                }
                : item
        ));
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
                                                    onClick={() => {
                                                        setSelectedHymnItemId(item.id);
                                                        setHymnModalOpen(true);
                                                    }}
                                                >
                                                    {item.hymn_title
                                                        ? `#${item.hymn_number} ${item.hymn_title}`
                                                        : "Select Hymn →"
                                                    }
                                                </Button>
                                            )}

                                            {/* Speaker selector for speaker items */}
                                            {item.category === "speaker" && (
                                                <div className="mt-1 max-w-[200px]">
                                                    <SpeakerSelector
                                                        selectedSpeakerId={item.speaker_id}
                                                        onSelect={(s) => handleSelectSpeaker(item.id, s)}
                                                        selectedSpeakerIdsInMeeting={selectedSpeakerIdsInMeeting}
                                                    />
                                                </div>
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

            <HymnSelectorModal
                open={hymnModalOpen}
                onClose={() => {
                    setHymnModalOpen(false);
                    setSelectedHymnItemId(null);
                }}
                onSelect={handleSelectHymn}
                currentHymnId={
                    selectedHymnItemId
                        ? agendaItems.find((i) => i.id === selectedHymnItemId)?.hymn_id
                        : undefined
                }
            />
        </>
    );
}
