import type { ProgramItem, ProgramChildItem } from "@/components/meetings/program/types";

/**
 * Maps database agenda_items rows (with hymn join) to ProgramItem[] for the ProgramView component.
 * Used by the standalone public program route.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAgendaToProgramItems(agendaItems: any[]): ProgramItem[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return agendaItems.map((item: any) => {
        const isSpeakerItem = item.item_type === "speaker";
        const isContainer = ["discussion", "business", "announcement"].includes(item.item_type);
        const titleLower = (item.title || "").toLowerCase();
        const isHymn = !!item.hymn_id || titleLower.includes("hymn");
        const requiresParticipant =
            !isSpeakerItem &&
            (!!item.participant_id ||
                ["prayer", "benediction", "invocation"].some((keyword) => titleLower.includes(keyword)));

        const children: ProgramChildItem[] = (item.child_items || []).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (child: any) => ({
                id: child.id,
                title: child.title,
                description: child.description,
                person_name: child.person_name,
                priority: child.priority,
                status: child.status,
            })
        );

        return {
            id: item.id,
            category: item.item_type,
            title: item.title,
            description: item.description,
            duration_minutes: item.duration_minutes ?? 0,
            order_index: item.order_index,
            is_hymn: isHymn,
            hymn_number: item.hymn?.hymn_number ?? item.hymns?.hymn_number,
            hymn_title: item.hymn?.title ?? item.hymns?.title,
            speaker_name: isSpeakerItem ? item.participant_name || undefined : undefined,
            speaker_topic: isSpeakerItem ? item.speaker_topic : undefined,
            participant_name: !isSpeakerItem ? item.participant_name : undefined,
            requires_participant: requiresParticipant,
            isContainer,
            containerType: isContainer ? item.item_type : undefined,
            children: isContainer ? children : undefined,
            structural_type: item.structural_type,
        } satisfies ProgramItem;
    });
}
