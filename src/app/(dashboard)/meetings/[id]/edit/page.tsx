"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/lib/hooks/use-toast";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { AgendaEditor } from "@/components/meetings/agenda-editor";
import { Database } from "@/types/database";
import Link from "next/link";

type AgendaItem = Database['public']['Tables']['agenda_items']['Row'];
type Meeting = Database['public']['Tables']['meetings']['Row'];

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
    const [scheduledDate, setScheduledDate] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            const supabase = createClient();

            const { data: meetingData, error: mError } = await supabase
                .from('meetings')
                .select('*')
                .eq('id', id)
                .single();

            const { data: itemsData, error: iError } = await supabase
                .from('agenda_items')
                .select('*')
                .eq('meeting_id', id)
                .order('order_index');

            if (mError || iError) {
                toast({ title: "Error loading meeting", variant: "destructive" });
                return;
            }

            setMeeting(meetingData);
            setTitle(meetingData.title);
            // Format for datetime-local input: YYYY-MM-DDThh:mm
            setScheduledDate(new Date(meetingData.scheduled_date).toISOString().slice(0, 16));
            setItems(itemsData || []);
            setLoading(false);
        };

        fetchData();
    }, [id, toast]);

    const handleSave = async () => {
        if (!meeting) return;
        setSaving(true);
        const supabase = createClient();

        // 1. Update Meeting Metadata
        const { error: mError } = await supabase
            .from('meetings')
            .update({
                title,
                scheduled_date: new Date(scheduledDate).toISOString()
            })
            .eq('id', id);

        if (mError) {
            toast({
                title: "Error saving meeting",
                description: mError.message || "Unknown error",
                variant: "destructive"
            });
            setSaving(false);
            return;
        }

        // 2. Process Agenda Items
        // A. Delete removed items
        if (deletedItemIds.length > 0) {
            const { error: dError } = await supabase
                .from('agenda_items')
                .delete()
                .in('id', deletedItemIds);

            if (dError) {
                toast({
                    title: "Error deleting items",
                    description: dError.message || "Unknown error",
                    variant: "destructive"
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
            };

            // If it's a temp ID, remove the ID field so Supabase generates a new UUID
            // If it's a real ID, keep it to update
            if (item.id.startsWith('temp-')) {
                return dbItem;
            } else {
                return { ...dbItem, id: item.id };
            }
        });

        const { error: uError } = await supabase
            .from('agenda_items')
            .upsert(upsertData);

        if (uError) {
            toast({
                title: "Error saving agenda items",
                description: uError.message || "Unknown error",
                variant: "destructive"
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
        setItems(items.filter(i => i.id !== itemId));
        // If it exists in DB (not isNew), mark for deletion
        if (!isNew) {
            setDeletedItemIds([...deletedItemIds, itemId]);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/meetings/${id}`}><ArrowLeft className="w-4 h-4" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Edit Meeting</h1>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                </Button>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Metadata</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Date & Time</Label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex justify-between items-center">
                                Agenda
                                <span className="text-sm font-normal text-muted-foreground">{items.length} items</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AgendaEditor
                                items={items}
                                setItems={setItems}
                                onDeleteItem={handleDeleteItem}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
