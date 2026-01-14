import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Trash2, Music, BookOpen, MessageSquare, Briefcase, Megaphone, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TemplateItem } from "./types";
import { AddTemplateItemDialog, NewItemData } from "./add-template-item-dialog";
import { getItemTypeBadgeVariant, getItemTypeLabel } from "@/types/agenda";
import { cn } from "@/lib/utils";

interface TemplateBuilderProps {
    items: TemplateItem[];
    onChange: (items: TemplateItem[]) => void;
    isLoading?: boolean;
}

export function TemplateBuilder({ items, onChange, isLoading }: TemplateBuilderProps) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleAddItem = (newItem: NewItemData) => {
        const item: TemplateItem = {
            id: crypto.randomUUID(),
            title: newItem.title,
            description: "",
            duration_minutes: newItem.duration_minutes,
            item_type: newItem.item_type,
            procedural_item_type_id: newItem.procedural_item_type_id,
            hymn_id: null,
            is_hymn_type: newItem.is_hymn,
            isNew: true,
        };
        onChange([...items, item]);
    };

    const handleRemoveItem = (id: string) => {
        onChange(items.filter((item) => item.id !== id));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleUpdateItem = (id: string, field: keyof TemplateItem, value: any) => {
        onChange(
            items.map((item) => (item.id === id ? { ...item, [field]: value } : item))
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

        onChange(newItems);
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const getIcon = (item: TemplateItem) => {
        if (item.is_hymn_type) {
            return <Music className="h-4 w-4 text-blue-500" />;
        }

        switch (item.item_type) {
            case 'procedural':
                return <BookOpen className="h-4 w-4 text-slate-500" />;
            case 'discussion': return <MessageSquare className="h-4 w-4 text-green-500" />;
            case 'business': return <Briefcase className="h-4 w-4 text-purple-500" />;
            case 'announcement': return <Megaphone className="h-4 w-4 text-orange-500" />;
            case 'speaker': return <User className="h-4 w-4 text-pink-500" />;
            default: return <BookOpen className="h-4 w-4" />;
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Agenda Items</CardTitle>
                        <CardDescription>
                            Define the structure of your meeting.
                        </CardDescription>
                    </div>
                    <AddTemplateItemDialog
                        onAddItem={handleAddItem}
                        existingItemTypes={items.map(i => i.item_type)}
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                        No items added yet. Click &quot;Add Item&quot; to start building your template.
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
                            "flex gap-4 p-4 border rounded-lg bg-card group hover:border-sidebar-accent transition-all relative",
                            draggedIndex === index && "opacity-50 scale-95",
                            dragOverIndex === index && draggedIndex !== null && draggedIndex !== index && "border-primary border-2"
                        )}
                    >
                        <div className="flex items-center pt-2 cursor-move">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="flex gap-3 items-start">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getIcon(item)}
                                        <Badge variant={getItemTypeBadgeVariant(item.item_type)} className="capitalize">
                                            {getItemTypeLabel(item.item_type)}
                                        </Badge>
                                    </div>

                                    <div>
                                        <Label htmlFor={`item-title-${item.id}`} className="sr-only">Title</Label>
                                        <Input
                                            id={`item-title-${item.id}`}
                                            value={item.title}
                                            onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                                            placeholder="Item Title"
                                            className="font-medium"
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div className="w-24 space-y-2">
                                    <Label htmlFor={`item-duration-${item.id}`} className="text-xs text-muted-foreground">
                                        Min
                                    </Label>
                                    <Input
                                        id={`item-duration-${item.id}`}
                                        type="number"
                                        min="1"
                                        value={item.duration_minutes}
                                        onChange={(e) => handleUpdateItem(item.id, "duration_minutes", parseInt(e.target.value) || 5)}
                                        disabled={isLoading}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label htmlFor={`item-desc-${item.id}`} className="sr-only">Description</Label>
                                <Textarea
                                    id={`item-desc-${item.id}`}
                                    value={item.description || ""}
                                    onChange={(e) => handleUpdateItem(item.id, "description", e.target.value)}
                                    placeholder="Optional description or instructions..."
                                    rows={1}
                                    className="min-h-[40px] text-sm resize-y"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        <div className="flex items-start pt-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isLoading}
                                className="text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
