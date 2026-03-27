"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationType, NotificationEmailFrequency } from "@/types/database";
import type { Notification, NotificationPreference } from "@/lib/notifications/types";

// ── Create notification ────────────────────────────────────────────────────

export async function createNotification({
    recipientUserId,
    type,
    title,
    body,
    metadata = {},
}: {
    recipientUserId: string;
    type: NotificationType;
    title: string;
    body?: string;
    metadata?: Record<string, unknown>;
}) {
    const supabase = await createClient();

    // Check if user has in-app notifications enabled for this type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: pref } = await (supabase as any)
        .from("notification_preferences")
        .select("in_app_enabled")
        .eq("user_id", recipientUserId)
        .eq("notification_type", type)
        .maybeSingle();

    // Default is enabled — only skip if explicitly disabled
    if (pref && pref.in_app_enabled === false) {
        return { skipped: true };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("notifications")
        .insert({
            user_id: recipientUserId,
            type,
            title,
            body: body ?? null,
            metadata,
        })
        .select("id")
        .single();

    if (error) {
        console.error("Failed to create notification:", error);
        return { error: error.message };
    }

    return { id: data.id };
}

// ── Fetch notifications ────────────────────────────────────────────────────

export async function getNotifications({
    limit = 20,
    offset = 0,
    unreadOnly = false,
}: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
} = {}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { notifications: [], count: 0 };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (unreadOnly) {
        query = query.is("read_at", null);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error("Failed to fetch notifications:", error);
        return { notifications: [], count: 0 };
    }

    return { notifications: (data ?? []) as Notification[], count: count ?? 0 };
}

// ── Unread count ───────────────────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count, error } = await (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);

    if (error) {
        console.error("Failed to get unread count:", error);
        return 0;
    }

    return count ?? 0;
}

// ── Mark as read ───────────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user.id);

    if (error) return { error: error.message };
    return { success: true };
}

export async function markAllNotificationsRead() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

    if (error) return { error: error.message };
    return { success: true };
}

// ── Preferences ────────────────────────────────────────────────────────────

export async function getNotificationPreferences(): Promise<NotificationPreference[]> {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id);

    if (error) {
        console.error("Failed to fetch notification preferences:", error);
        return [];
    }

    return (data ?? []) as NotificationPreference[];
}

export async function upsertNotificationPreference({
    notificationType,
    inAppEnabled,
    emailEnabled,
    emailFrequency,
}: {
    notificationType: NotificationType;
    inAppEnabled: boolean;
    emailEnabled: boolean;
    emailFrequency: NotificationEmailFrequency;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
        .from("notification_preferences")
        .upsert(
            {
                user_id: user.id,
                notification_type: notificationType,
                in_app_enabled: inAppEnabled,
                email_enabled: emailEnabled,
                email_frequency: emailFrequency,
            },
            { onConflict: "user_id,notification_type" }
        );

    if (error) return { error: error.message };
    return { success: true };
}
