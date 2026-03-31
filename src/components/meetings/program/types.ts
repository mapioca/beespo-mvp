import type { CanvasItem } from "../builder/types";
import type { ContainerChildItem } from "../container-agenda-item";

// ── Program-specific types (decoupled from builder internals) ──

export interface ProgramItem {
    id: string;
    category: "procedural" | "speaker" | "discussion" | "business" | "announcement" | "structural";
    title: string;
    description?: string | null;
    duration_minutes: number;
    order_index: number;
    // Hymn
    is_hymn?: boolean;
    hymn_number?: number;
    hymn_title?: string;
    // Speaker
    speaker_name?: string;
    speaker_topic?: string | null;
    // Participant
    participant_name?: string;
    requires_participant?: boolean;
    // Container
    isContainer?: boolean;
    containerType?: "discussion" | "business" | "announcement";
    children?: ProgramChildItem[];
    // Structural
    structural_type?: "section_header" | "divider";
}

export interface ProgramChildItem {
    id: string;
    title: string;
    description?: string | null;
    person_name?: string;
    priority?: string;
    status?: string;
}

export interface ProgramViewData {
    title: string;
    date: Date;
    time: string; // "HH:mm"
    unitName?: string;
    roles?: {
        presiding?: string;
        conducting?: string;
        chorister?: string;
        pianistOrganist?: string;
    };
    items: ProgramItem[];
    meetingNotes?: string | null;
}

export interface ProgramViewProps {
    data: ProgramViewData;
    variant?: "standalone" | "embedded";
    density?: "comfortable" | "compact";
    viewStyle?: "cards" | "list";
    showDivider?: boolean;
    showRoles?: boolean;
    showFooter?: boolean;
    showMeetingNotes?: boolean;
    showSpeakerNames?: boolean;
    showDurations?: boolean;
    showIcons?: boolean;
    dateFormat?: "long" | "medium" | "short";
    titleCase?: "title" | "sentence" | "uppercase";
    className?: string;
}

// ── Mappers ──

export function canvasItemsToProgramItems(items: CanvasItem[]): ProgramItem[] {
    return [...items]
        .sort((a, b) => a.order_index - b.order_index)
        .map((item) => ({
            id: item.id,
            category: item.category,
            title: item.title,
            description: item.description,
            duration_minutes: item.duration_minutes,
            order_index: item.order_index,
            is_hymn: item.is_hymn,
            hymn_number: item.hymn_number,
            hymn_title: item.hymn_title,
            speaker_name: item.speaker_name,
            speaker_topic: item.speaker_topic,
            participant_name: item.participant_name,
            requires_participant: item.requires_participant,
            isContainer: item.isContainer,
            containerType: item.containerType,
            children: item.childItems?.map(childToProgramChild),
            structural_type: item.structural_type,
        }));
}

function childToProgramChild(child: ContainerChildItem): ProgramChildItem {
    return {
        id: child.id,
        title: child.title,
        description: child.description,
        person_name: child.person_name,
        priority: child.priority,
        status: child.status,
    };
}
