"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveMeetingMarkdown(meetingId: string, markdown: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("meetings") as any)
        .update({ markdown_agenda: markdown })
        .eq("id", meetingId);

    if (error) {
        console.error("Failed to save meeting markdown:", error);
        return { error: error.message };
    }

    return { success: true };
}

export interface ParticipantHistoryItem {
    id: string;
    title: string;
    description: string | null;
    item_type: string;
    participant_name: string | null;
    meeting: {
        id: string;
        title: string;
        scheduled_date: string;
    } | null;
}

export async function getParticipantHistory(
    participantId: string
): Promise<{ items: ParticipantHistoryItem[]; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [], error: "Unauthorized" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("agenda_items") as any)
        .select(
            "id, title, description, item_type, participant_name, meeting:meetings(id, title, scheduled_date)"
        )
        .eq("participant_id", participantId);

    if (error) return { items: [], error: error.message };

    // Sort by meeting scheduled_date descending (client-side since PostgREST
    // does not support ordering by joined columns)
    const sorted = ((data as ParticipantHistoryItem[]) || []).sort((a, b) => {
        const dateA = a.meeting?.scheduled_date ?? "";
        const dateB = b.meeting?.scheduled_date ?? "";
        return dateB.localeCompare(dateA);
    });

    return { items: sorted, error: null };
}
