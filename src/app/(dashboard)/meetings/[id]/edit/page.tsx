"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";
import { AgendaBuilder } from "@/components/meetings/agenda-builder";
import { Database } from "@/types/database";
import Link from "next/link";

type AgendaItem = Database["public"]["Tables"]["agenda_items"]["Row"];
type Meeting = Database["public"]["Tables"]["meetings"]["Row"];

interface EditMeetingProps {
    params: Promise<{
        id: string;
    }>;
}

export default function EditMeetingPage({ params }: EditMeetingProps) {
    const { id } = use(params);
    const router = useRouter();
    const { toast } = useToast();

    const [meeting, setMeeting] = useState<Meeting | null>(null);
    const [items, setItems] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [scheduledDate, setScheduledDate] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const { data: meetingData, error: mError } = await supabase
                .from("meetings")
                .select("*")
                .eq("id", id)
                .single();

            const { data: itemsData, error: iError } = await supabase
                .from("agenda_items")
                .select("*")
                .eq("meeting_id", id)
                .order("order_index");

            if (mError || iError) {
                toast({
                    title: "Error loading meeting",
                    variant: "destructive",
                });
                return;
            }

            const mData = meetingData as Meeting;
            setMeeting(mData);
            setTitle(mData.title);
            setDescription(mData.description || "");
            // Format for datetime-local input: YYYY-MM-DDThh:mm
            setScheduledDate(
                new Date(mData.scheduled_date).toISOString().slice(0, 16)
            );
            setItems((itemsData as AgendaItem[]) || []);
            setLoading(false);
        };

        fetchData();
    }, [id, toast]);

    const handleSave = async () => {
        if (!meeting) return;
        setSaving(true);
        const supabase = createClient();

        // 1. Update Meeting Metadata
        const { error: mError } = await (
            supabase.from("meetings") as any // eslint-disable-line @typescript-eslint/no-explicit-any
        )
            .update({
                title,
                description: description || null,
                scheduled_date: new Date(scheduledDate).toISOString(),
            })
            .eq("id", id);

        if (mError) {
            toast({
                title: "Error saving meeting",
                description: mError.message || "Unknown error",
                variant: "destructive",
            });
            setSaving(false);
            return;
        }

        // 2. Process Agenda Items
        // A. Delete removed items
        if (deletedItemIds.length > 0) {
            const { error: dError } = await (
                supabase.from("agenda_items") as any // eslint-disable-line @typescript-eslint/no-explicit-any
            )
                .delete()
                .in("id", deletedItemIds);

            if (dError) {
                toast({
                    title: "Error deleting items",
                    description: dError.message || "Unknown error",
                    variant: "destructive",
                });
                setSaving(false);
                return;
            }
        }

        // B. Upsert (Update existing + Insert new) items
        const upsertData = items.map((item, index) => {
            // Prepare object for DB
            const dbItem = {
                meeting_id: id,
                title: item.title,
                description: item.description,
                order_index: index, // Ensure order is saved based on current array position
                duration_minutes: item.duration_minutes,
                item_type: item.item_type,
                // Keep associations
                discussion_id: item.discussion_id,
                business_item_id: item.business_item_id,
                announcement_id: item.announcement_id,
                speaker_id: item.speaker_id,
                hymn_id: item.hymn_id,
                participant_id: item.participant_id,
            };

            // If it's a temp ID, remove the ID field so Supabase generates a new UUID
            // If it's a real ID, keep it to update
            if (item.id.startsWith("temp-")) {
                return dbItem;
            } else {
                return { ...dbItem, id: item.id };
            }
        });

        const { error: uError } = await (
            supabase.from("agenda_items") as any // eslint-disable-line @typescript-eslint/no-explicit-any
        ).upsert(upsertData);

        if (uError) {
            toast({
                title: "Error saving agenda items",
                description: uError.message || "Unknown error",
                variant: "destructive",
            });
            setSaving(false);
            return;
        }

        toast({ title: "Meeting saved successfully" });
        router.push(`/meetings/${id}`);
        router.refresh();
        setSaving(false);
    };

    const handleDeleteItem = (itemId: string, isNew: boolean) => {
        // Remove from UI state
        setItems(items.filter((i) => i.id !== itemId));
        // If it exists in DB (not isNew), mark for deletion
        if (!isNew) {
            setDeletedItemIds([...deletedItemIds, itemId]);
        }
    };

    if (loading)
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );

    return (
        <div className="h-full overflow-auto">
            <div className="container mx-auto p-6 max-w-4xl">
                {/* Header */}
                <div className="mb-6">
                    <Button variant="ghost" asChild>
                        <Link href={`/meetings/${id}`}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Meeting
                        </Link>
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Metadata Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Edit Meeting</CardTitle>
                            <CardDescription>
                                Update your meeting details and agenda items
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Meeting Title *</Label>
                                <Input
                                    id="title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Ward Council Meeting"
                                    required
                                    disabled={saving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Brief description of this meeting"
                                    rows={3}
                                    disabled={saving}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="scheduledDate">
                                    Date & Time *
                                </Label>
                                <Input
                                    id="scheduledDate"
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) =>
                                        setScheduledDate(e.target.value)
                                    }
                                    required
                                    disabled={saving}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Agenda Builder */}
                    <AgendaBuilder
                        items={items}
                        setItems={setItems}
                        onDeleteItem={handleDeleteItem}
                        isLoading={saving}
                    />

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.push(`/meetings/${id}`)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
