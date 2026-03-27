import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";

export const maxDuration = 60;

interface MeetingRow {
    id: string;
    title: string;
    workspace_id: string;
    scheduled_date: string;
    created_by: string | null;
    zoom_join_url: string | null;
}

interface ProfileRow {
    id: string;
    email: string | null;
    full_name: string | null;
}

interface PrefRow {
    user_id: string;
    in_app_enabled: boolean;
    email_enabled: boolean;
}

interface ShareRow {
    recipient_user_id: string | null;
}

/**
 * GET /api/cron/meeting-reminders
 *
 * Runs every 5 minutes via Vercel Cron. Finds meetings starting within the
 * next 15 minutes and sends "meeting_starting_soon" notifications to:
 *   1. All workspace members
 *   2. Users the meeting is shared with (cross-workspace)
 *
 * Duplicate prevention: checks if a notification with matching
 * type + metadata.meeting_id already exists for the user.
 */
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    // Window: all meetings scheduled for today (rest of the day from now)
    // Runs once daily on Hobby plan. When upgrading to Pro, switch to
    // a 15-minute window with `*/5 * * * *` schedule for real-time reminders.
    const now = new Date();
    const windowEnd = new Date(now);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const { data: meetings, error: meetingsError } = await supabase
        .from("meetings")
        .select("id, title, workspace_id, scheduled_date, created_by, zoom_join_url")
        .eq("status", "scheduled")
        .gte("scheduled_date", now.toISOString())
        .lte("scheduled_date", windowEnd.toISOString());

    if (meetingsError) {
        console.error("[meeting-reminders] Failed to query meetings:", meetingsError);
        return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!meetings || meetings.length === 0) {
        return NextResponse.json({ processed: 0 });
    }

    let notificationCount = 0;
    let emailCount = 0;

    for (const meeting of meetings as MeetingRow[]) {
        // Collect user IDs to notify: workspace members + shared users
        const userIds = new Set<string>();

        // 1. Workspace members
        const { data: members } = await supabase
            .from("profiles")
            .select("id")
            .eq("workspace_id", meeting.workspace_id);

        for (const m of (members ?? []) as { id: string }[]) {
            userIds.add(m.id);
        }

        // 2. Users the meeting is shared with
        const { data: shares } = await supabase
            .from("meeting_shares")
            .select("recipient_user_id")
            .eq("meeting_id", meeting.id)
            .eq("status", "active");

        for (const s of (shares ?? []) as ShareRow[]) {
            if (s.recipient_user_id) userIds.add(s.recipient_user_id);
        }

        if (userIds.size === 0) continue;

        // Fetch preferences for all target users for this notification type
        const userIdArray = Array.from(userIds);
        const { data: prefs } = await supabase
            .from("notification_preferences")
            .select("user_id, in_app_enabled, email_enabled")
            .eq("notification_type", "meeting_starting_soon")
            .in("user_id", userIdArray);

        const prefMap = new Map<string, PrefRow>();
        for (const p of (prefs ?? []) as PrefRow[]) {
            prefMap.set(p.user_id, p);
        }

        // Check existing notifications to avoid duplicates
        const { data: existingNotifs } = await supabase
            .from("notifications")
            .select("user_id")
            .eq("type", "meeting_starting_soon")
            .in("user_id", userIdArray)
            .contains("metadata", { meeting_id: meeting.id });

        const alreadyNotified = new Set(
            ((existingNotifs ?? []) as { user_id: string }[]).map((n) => n.user_id)
        );

        // Batch fetch profiles for email sending
        const { data: profiles } = await supabase
            .from("profiles")
            .select("id, email, full_name")
            .in("id", userIdArray);

        const profileMap = new Map<string, ProfileRow>();
        for (const p of (profiles ?? []) as ProfileRow[]) {
            profileMap.set(p.id, p);
        }

        const formattedDate = new Date(meeting.scheduled_date).toLocaleString(
            "en-US",
            {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            }
        );

        for (const userId of userIdArray) {
            if (alreadyNotified.has(userId)) continue;

            const pref = prefMap.get(userId);
            // Default: enabled for both channels
            const inAppEnabled = pref?.in_app_enabled ?? true;
            const emailEnabled = pref?.email_enabled ?? true;

            if (!inAppEnabled && !emailEnabled) continue;

            const profile = profileMap.get(userId);

            // In-app notification
            if (inAppEnabled) {
                const { error: insertError } = await supabase
                    .from("notifications")
                    .insert({
                        user_id: userId,
                        type: "meeting_starting_soon",
                        title: `"${meeting.title}" is scheduled for today`,
                        body: formattedDate,
                        metadata: { meeting_id: meeting.id },
                    });

                if (!insertError) notificationCount++;
            }

            // Email notification
            if (emailEnabled && profile?.email && resend) {
                try {
                    await resend.emails.send({
                        from: "Beespo <no-reply@beespo.com>",
                        to: profile.email,
                        subject: `Reminder: "${meeting.title}" is scheduled for today`,
                        html: buildReminderEmailHtml({
                            meetingTitle: meeting.title,
                            formattedDate,
                            meetingLink: `${appUrl}/meetings/${meeting.id}`,
                            zoomLink: meeting.zoom_join_url,
                        }),
                    });
                    emailCount++;
                } catch (err) {
                    console.error(
                        `[meeting-reminders] Email failed for ${profile.email}:`,
                        err
                    );
                }
            }
        }
    }

    return NextResponse.json({
        processed: meetings.length,
        notifications: notificationCount,
        emails: emailCount,
    });
}

function buildReminderEmailHtml({
    meetingTitle,
    formattedDate,
    meetingLink,
    zoomLink,
}: {
    meetingTitle: string;
    formattedDate: string;
    meetingLink: string;
    zoomLink: string | null;
}) {
    const zoomButton = zoomLink
        ? `<a href="${zoomLink}" style="display: inline-block; background-color: #2d8cff; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-left: 8px;">Join Zoom</a>`
        : "";

    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #ffffff; color: #111827;">
    <div style="max-width: 600px; margin: 0 auto; padding: 48px 24px;">
      <div style="margin-bottom: 48px;">
        <div style="font-size: 24px; font-weight: 700; letter-spacing: -0.025em; color: #111827;">Beespo</div>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #f3f4f6; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 16px 0; color: #111827;">You have a meeting today</h1>
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 500; color: #6b7280; margin-bottom: 8px;">Meeting</div>
          <div style="font-size: 18px; font-weight: 600; color: #111827;">${meetingTitle}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">${formattedDate}</div>
        </div>
        <div style="margin-bottom: 32px;">
          <a href="${meetingLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Agenda</a>
          ${zoomButton}
        </div>
        <div style="height: 1px; background-color: #f3f4f6; margin-bottom: 32px;"></div>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">You can manage notification preferences in your Beespo settings.</p>
      </div>
      <div style="margin-top: 40px; text-align: center;">
        <div style="font-size: 12px; color: #d1d5db;">&copy; ${new Date().getFullYear()} Beespo. All rights reserved.</div>
      </div>
    </div>
  </body>
</html>`;
}
