import type { NotificationType } from "@/types/database";

export const NOTIFICATION_TYPES: {
    type: NotificationType;
    label: string;
    description: string;
}[] = [
    {
        type: "meeting_shared",
        label: "Meeting Shared",
        description: "When someone shares a meeting with you",
    },
    {
        type: "meeting_starting_soon",
        label: "Meeting Starting Soon",
        description: "Reminder before a meeting starts",
    },
    {
        type: "meeting_status_changed",
        label: "Meeting Status Changed",
        description: "When a shared meeting's status changes",
    },
    {
        type: "workspace_member_joined",
        label: "New Team Member",
        description: "When a new member joins your workspace",
    },
];
