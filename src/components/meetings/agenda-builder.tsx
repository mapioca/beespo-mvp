"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
    Trash2,
    Music,
    BookOpen,
    MessageSquare,
    Briefcase,
    Megaphone,
    User,
    Plus,
} from "lucide-react";
import { Database } from "@/types/database";
import { AddItemDialog, NewAgendaItem } from "./add-item-dialog";
import { getItemTypeBadgeVariant, getItemTypeLabel } from "@/types/agenda";
import { cn } from "@/lib/utils";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];

interface AgendaBuilderProps {
    items: AgendaItem[];
    setItems: (items: AgendaItem[]) => void;
    onDeleteItem: (id: string, isNew: boolean) => void;
    isLoading?: boolean;
}

export function AgendaBuilder({
    items,
    setItems,
    onDeleteItem,
    isLoading,
}: AgendaBuilderProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleAddItem = (newItem: NewAgendaItem) => {
        const tempId = `temp-${Date.now()}`;

        const item: AgendaItem = {
            ...newItem,
            id: tempId,
            meeting_id: items[0]?.meeting_id || "",
            notes: null,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            discussion_id: null,
            business_item_id: null,
            announcement_id: null,
            speaker_id: null,
            hymn_id: null,
            participant_id: null,
            participant_name: null,
        };

        setItems([...items, item]);
    };

    const handleUpdateItem = (
        id: string,
        field: keyof AgendaItem,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        value: any
    ) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newItems = [...items];
        const draggedItem = newItems[draggedIndex];

        // Remove from old position
        newItems.splice(draggedIndex, 1);
        // Insert at new position
        newItems.splice(dropIndex, 0, draggedItem);

        // Update order_index for all items
        const reorderedItems = newItems.map((item, index) => ({
            ...item,
            order_index: index,
        }));

        setItems(reorderedItems);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const getIcon = (item: AgendaItem) => {
        const title = item.title.toLowerCase();
        const isHymn =
            item.item_type === "procedural" &&
            (title.includes("hymn") ||
                title.includes("song") ||
                title.includes("music"));

        if (isHymn) {
            return <Music className="h-4 w-4 text-blue-500" />;
        }

        switch (item.item_type) {
            case "procedural":
                return <BookOpen className="h-4 w-4 text-slate-500" />;
            case "discussion":
                return <MessageSquare className="h-4 w-4 text-green-500" />;
            case "business":
                return <Briefcase className="h-4 w-4 text-purple-500" />;
            case "announcement":
                return <Megaphone className="h-4 w-4 text-orange-500" />;
            case "speaker":
                return <User className="h-4 w-4 text-pink-500" />;
            default:
                return <BookOpen className="h-4 w-4" />;
        }
    };

    const totalDuration = items.reduce(
        (sum, item) => sum + (item.duration_minutes || 0),
        0
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Agenda Items</CardTitle>
                        <CardDescription>
                            {items.length} items • {totalDuration} minutes total
                        </CardDescription>
                    </div>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => setIsDialogOpen(true)}
                        disabled={isLoading}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No items added yet. Click &quot;Add Item&quot; to start
                        building your agenda.
                    </div>
                )}
                {items.map((item, index) => (
                    <div
                        key={item.id}
                        draggable={!isLoading}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                            "flex gap-4 p-3 border rounded-lg bg-card group hover:border-sidebar-accent transition-all relative cursor-move",
                            draggedIndex === index && "opacity-50 scale-95",
                            dragOverIndex === index &&
                            draggedIndex !== null &&
                            draggedIndex !== index &&
                            "border-primary border-2"
                        )}
                    >
                        {/* Main Content */}
                        <div className="flex-1 space-y-3">
                            <div className="flex gap-3 items-start">
                                <div className="flex-1 space-y-2">
                                    {/* Type Badge with Icon */}
                                    <div className="flex items-center gap-2 mb-1">
                                        {getIcon(item)}
                                        <Badge
                                            variant={getItemTypeBadgeVariant(
                                                item.item_type
                                            )}
                                            className="capitalize"
                                        >
                                            {getItemTypeLabel(item.item_type)}
                                        </Badge>
                                        {item.id.startsWith("temp-") && (
                                            <Badge
                                                variant="outline"
                                                className="text-blue-500 border-blue-500"
                                            >
                                                New
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Title Input */}
                                    <div>
                                        <Label
                                            htmlFor={`item-title-${item.id}`}
                                            className="sr-only"
                                        >
                                            Title
                                        </Label>
                                        <Input
                                            id={`item-title-${item.id}`}
                                            value={item.title}
                                            onChange={(e) =>
                                                handleUpdateItem(
                                                    item.id,
                                                    "title",
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Item Title"
                                            className="font-medium"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                {/* Duration Input */}
                                <div className="w-24 space-y-2">
                                    <Label
                                        htmlFor={`item-duration-${item.id}`}
                                        className="text-xs text-muted-foreground"
                                    >
                                        Min
                                    </Label>
                                    <Input
                                        id={`item-duration-${item.id}`}
                                        type="number"
                                        min="1"
                                        value={item.duration_minutes || ""}
                                        onChange={(e) =>
                                            handleUpdateItem(
                                                item.id,
                                                "duration_minutes",
                                                parseInt(e.target.value) || 0
                                            )
                                        }
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <Label
                                    htmlFor={`item-desc-${item.id}`}
                                    className="sr-only"
                                >
                                    Description
                                </Label>
                                <Textarea
                                    id={`item-desc-${item.id}`}
                                    value={item.description || ""}
                                    onChange={(e) =>
                                        handleUpdateItem(
                                            item.id,
                                            "description",
                                            e.target.value
                                        )
                                    }
                                    placeholder="Optional description or notes..."
                                    rows={1}
                                    className="min-h-[40px] text-sm resize-y"
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Association Info */}
                            {(item.participant_name ||
                                item.hymn_id ||
                                item.speaker_id) && (
                                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                        {item.participant_name && (
                                            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                                                <User className="h-3 w-3" />
                                                {item.participant_name}
                                            </span>
                                        )}
                                        {item.hymn_id && (
                                            <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                                                <Music className="h-3 w-3" />
                                                Hymn assigned
                                            </span>
                                        )}
                                    </div>
                                )}
                        </div>

                        {/* Delete Button */}
                        <div className="flex items-start pt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    onDeleteItem(
                                        item.id,
                                        item.id.startsWith("temp-")
                                    )
                                }
                                disabled={isLoading}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>

            <AddItemDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onAdd={handleAddItem}
                nextOrderIndex={items.length}
            />
        </Card >
    );
}
