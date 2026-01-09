"use client";

import { useState } from "react";
import { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import { AddItemDialog, NewAgendaItem } from "./add-item-dialog";
import { MeetingTypeBadge } from "./meeting-type-badge";

type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];

interface AgendaEditorProps {
    items: AgendaItem[];
    setItems: (items: AgendaItem[]) => void;
    onDeleteItem: (id: string, isNew: boolean) => void;
}

export function AgendaEditor({ items, setItems, onDeleteItem }: AgendaEditorProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // We handle local "new" items by giving them a temporary negative ID or string ID
    // For simplicity in this MVP, we'll assume the parent Page handles the actual DB sync logic
    // and expects us to just manipulate the simplified array state.

    const handleAddItem = (newItem: NewAgendaItem) => {
        const tempId = `temp-${Date.now()}`;
        // @ts-expect-error - Creating a partial object compatible with AgendaItem for UI purposes
        const item: AgendaItem = {
            ...newItem,
            id: tempId,
            meeting_id: items[0]?.meeting_id || "",
            details: null,
            notes: null,
            is_completed: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Associations default to null for a generic add
            discussion_id: null,
            business_item_id: null,
            announcement_id: null,
            speaker_id: null,
        };

        setItems([...items, item]);
    };

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const newItems = [...items];
        const temp = newItems[index];
        newItems[index] = newItems[index - 1];
        newItems[index - 1] = temp;

        // Update order_index
        newItems[index].order_index = index;
        newItems[index - 1].order_index = index - 1;

        setItems(newItems);
    };

    const handleMoveDown = (index: number) => {
        if (index === items.length - 1) return;
        const newItems = [...items];
        const temp = newItems[index];
        newItems[index] = newItems[index + 1];
        newItems[index + 1] = temp;

        // Update order_index
        newItems[index].order_index = index;
        newItems[index + 1].order_index = index + 1;

        setItems(newItems);
    };

    return (
        <div className="space-y-4">
            {items.map((item, index) => (
                <div key={item.id} className="flex gap-4 items-start p-4 bg-card border rounded-lg group">
                    <div className="flex flex-col gap-1 mt-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === 0}
                            onClick={() => handleMoveUp(index)}
                        >
                            ▲
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            disabled={index === items.length - 1}
                            onClick={() => handleMoveDown(index)}
                        >
                            ▼
                        </Button>
                    </div>

                    <div className="flex-grow space-y-3">
                        <div className="flex gap-3">
                            <Input
                                value={item.title}
                                onChange={(e) => {
                                    const newItems = [...items];
                                    newItems[index] = { ...item, title: e.target.value };
                                    setItems(newItems);
                                }}
                                className="font-medium"
                            />
                            <div className="w-24 flex-none relative">
                                <Input
                                    type="number"
                                    value={item.duration_minutes || ""}
                                    onChange={(e) => {
                                        const newItems = [...items];
                                        newItems[index] = { ...item, duration_minutes: parseInt(e.target.value) || 0 };
                                        setItems(newItems);
                                    }}
                                    className="pr-8"
                                />
                                <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">min</span>
                            </div>
                        </div>

                        <Textarea
                            value={item.description || ""}
                            onChange={(e) => {
                                const newItems = [...items];
                                newItems[index] = { ...item, description: e.target.value };
                                setItems(newItems);
                            }}
                            className="text-sm h-16 min-h-[60px]"
                            placeholder="Description..."
                        />

                        <div className="flex items-center justify-between">
                            <MeetingTypeBadge type={item.item_type} />
                            {item.id.startsWith("temp-") && <span className="text-xs text-blue-500 font-medium">New Item</span>}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDeleteItem(item.id, item.id.startsWith("temp-"))}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ))}

            <div className="pt-4 border-t flex justify-center">
                <Button variant="outline" onClick={() => setIsDialogOpen(true)} className="w-full border-dashed">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Agenda Item
                </Button>
            </div>

            <AddItemDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onAdd={handleAddItem}
                nextOrderIndex={items.length}
            />
        </div>
    );
}
