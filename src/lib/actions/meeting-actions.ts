"use server";

import { createClient } from "@/lib/supabase/server";
import { assertLegacy } from "@/lib/actions/legacy-guards";

export async function saveMeetingMarkdown(meetingId: string, markdown: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Not authenticated" };
    }

    try {
        await assertLegacy(meetingId);
    } catch (error) {
        return { error: error instanceof Error ? error.message : "Legacy guard failed" };
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

// ── Unified directory assignment types ──────────────────────────────────────

export interface DirectoryAssignment {
    id: string;
    assignment_type: string;
    topic: string | null;
    is_confirmed: boolean;
    workspace_speaker_id: string | null;
    created_at: string;
    agenda_item: {
        id: string;
        title: string;
        meeting: {
            id: string;
            title: string;
            scheduled_date: string;
        } | null;
    } | null;
}

export async function getDirectoryAssignments(
    directoryId: string
): Promise<{ items: DirectoryAssignment[]; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [], error: "Unauthorized" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("meeting_assignments") as any)
        .select(
            "id, assignment_type, topic, is_confirmed, workspace_speaker_id, created_at, agenda_item:agenda_items(id, title, meeting:meetings(id, title, scheduled_date))"
        )
        .eq("directory_id", directoryId)
        .order("created_at", { ascending: false });

    if (error) return { items: [], error: error.message };

    return { items: (data as DirectoryAssignment[]) || [], error: null };
}

// ── Legacy aliases for backward compatibility during transition ──────────────

export interface ParticipantHistoryItem {
    id: string;
    title: string;
    description: string | null;
    item_type: string;
    participant_name: string | null;
    speaker_topic: string | null;
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
            "id, title, description, item_type, participant_name, speaker_topic, meeting:meetings(id, title, scheduled_date)"
        )
        .eq("participant_id", participantId);

    if (error) return { items: [], error: error.message };

    const sorted = ((data as ParticipantHistoryItem[]) || []).sort((a, b) => {
        const dateA = a.meeting?.scheduled_date ?? "";
        const dateB = b.meeting?.scheduled_date ?? "";
        return dateB.localeCompare(dateA);
    });

    return { items: sorted, error: null };
}

export interface SpeakingAssignment {
    id: string;
    name: string;
    topic: string;
    is_confirmed: boolean;
    created_at: string;
    meeting: {
        id: string;
        title: string;
        scheduled_date: string;
    } | null;
}

export async function getSpeakingAssignments(
    directoryId: string
): Promise<{ items: SpeakingAssignment[]; error: string | null }> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { items: [], error: "Unauthorized" };

    // Query meeting_assignments for speaker-type assignments for this directory entry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from("meeting_assignments") as any)
        .select(
            "id, topic, is_confirmed, created_at, workspace_speaker_id, directory:directory(name), agenda_item:agenda_items(meeting:meetings(id, title, scheduled_date))"
        )
        .eq("directory_id", directoryId)
        .eq("assignment_type", "speaker");

    if (error) return { items: [], error: error.message };

    const items: SpeakingAssignment[] = ((data as Array<{
        id: string;
        topic: string;
        is_confirmed: boolean;
        created_at: string;
        workspace_speaker_id: string | null;
        directory?: { name: string } | null;
        agenda_item?: { meeting: { id: string; title: string; scheduled_date: string } | null } | null;
    }>) || []).map((s) => ({
        id: s.id,
        name: s.directory?.name ?? "",
        topic: s.topic,
        is_confirmed: s.is_confirmed,
        created_at: s.created_at,
        meeting: s.agenda_item?.meeting ?? null,
    }));

    items.sort((a, b) => b.created_at.localeCompare(a.created_at));

    return { items, error: null };
}
