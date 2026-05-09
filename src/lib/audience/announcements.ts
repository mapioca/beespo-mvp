import type { AudienceAnnouncement } from "@/components/audience/audience-program";

export type AudienceAnnouncementSelection = {
    id?: string;
    checked?: boolean;
};

type AnnouncementRow = { id: string; title: string; content: string | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function loadAudienceAnnouncements(
    supabase: SupabaseLike,
    workspaceId: string,
    selection: AudienceAnnouncementSelection[] | undefined | null,
): Promise<AudienceAnnouncement[]> {
    if (!Array.isArray(selection) || selection.length === 0) return [];

    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const item of selection) {
        if (!item || item.checked === false) continue;
        if (typeof item.id !== "string" || !item.id || seen.has(item.id)) continue;
        seen.add(item.id);
        orderedIds.push(item.id);
    }
    if (orderedIds.length === 0) return [];

    const { data } = await supabase
        .from("announcements")
        .select("id, title, content")
        .eq("workspace_id", workspaceId)
        .in("id", orderedIds);

    const rows = (data ?? []) as AnnouncementRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    return orderedIds
        .map((id) => byId.get(id))
        .filter((row): row is AnnouncementRow => Boolean(row))
        .map((row) => ({
            id: row.id,
            title: row.title,
            content: row.content ?? null,
        }));
}
