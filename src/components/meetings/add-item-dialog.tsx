"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { AgendaItemType } from "@/types/database";

// Define the shape of a new item without database IDs
export interface NewAgendaItem {
    title: string;
    description: string;
    duration_minutes: number;
    item_type: AgendaItemType;
    order_index: number;
}

interface AddItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (item: NewAgendaItem) => void;
    nextOrderIndex: number;
}

export function AddItemDialog({ open, onOpenChange, onAdd, nextOrderIndex }: AddItemDialogProps) {
    const [type, setType] = useState<AgendaItemType>("procedural");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [duration, setDuration] = useState("5");

    const handleSubmit = () => {
        onAdd({
            title,
            description,
            duration_minutes: parseInt(duration) || 0,
            item_type: type,
            order_index: nextOrderIndex,
        });

        // Reset form
        setTitle("");
        setDescription("");
        setType("procedural");
        setDuration("5");
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Agenda Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={(v) => setType(v as AgendaItemType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="procedural">Procedural</SelectItem>
                                <SelectItem value="discussion">Discussion</SelectItem>
                                <SelectItem value="business">Business Item</SelectItem>
                                <SelectItem value="announcement">Announcement</SelectItem>
                                <SelectItem value="speaker">Speaker</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Opening Prayer"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Duration (Minutes)</Label>
                        <Input
                            type="number"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!title}>Add Item</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
