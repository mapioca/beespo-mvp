import type { NotificationEmailFrequency } from "@/types/database";

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    body: string | null;
    metadata: Record<string, unknown>;
    read_at: string | null;
    digest_sent_at: string | null;
    created_at: string;
}

export interface NotificationPreference {
    id: string;
    user_id: string;
    notification_type: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
    email_frequency: NotificationEmailFrequency;
}
