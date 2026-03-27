import type { NotificationType } from "@/types/database";

export interface NotificationTypeConfig {
    type: NotificationType;
    label: string;
    description: string;
    /** Whether this type supports digest frequency options. When false, emails
     *  are always sent immediately (e.g. daily meeting reminders). */
    supportsDigest: boolean;
}

export const NOTIFICATION_TYPES: NotificationTypeConfig[] = [
    {
        type: "meeting_shared",
        label: "Meeting Shared",
        description: "When someone shares a meeting with you",
        supportsDigest: true,
    },
    {
        type: "meeting_starting_soon",
        label: "Daily Meeting Reminder",
        description: "A daily email with your meetings scheduled for that day",
        supportsDigest: false,
    },
    {
        type: "meeting_status_changed",
        label: "Meeting Status Changed",
        description: "When a shared meeting's status changes",
        supportsDigest: true,
    },
    {
        type: "workspace_member_joined",
        label: "New Team Member",
        description: "When a new member joins your workspace",
        supportsDigest: true,
    },
];
