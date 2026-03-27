import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/lib/email/resend";

export const maxDuration = 120;

interface NotificationRow {
    id: string;
    type: string;
    title: string;
    body: string | null;
    created_at: string;
}

interface PrefRow {
    user_id: string;
    notification_type: string;
    email_frequency: string;
}

interface ProfileRow {
    id: string;
    email: string | null;
    full_name: string | null;
}

/**
 * GET /api/cron/notification-digest
 *
 * Runs daily at 8 AM UTC. Sends digest emails to users whose email_frequency
 * is set to "daily_digest" or "weekly_digest" (weekly only on Mondays).
 *
 * Collects all notifications where digest_sent_at IS NULL, groups by user,
 * renders a summary email, and marks them as digested.
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
    const isMonday = new Date().getUTCDay() === 1;

    // 1. Find all users with digest preferences
    const frequenciesToProcess = ["daily_digest"];
    if (isMonday) frequenciesToProcess.push("weekly_digest");

    const { data: prefs, error: prefsError } = await supabase
        .from("notification_preferences")
        .select("user_id, notification_type, email_frequency")
        .eq("email_enabled", true)
        .in("email_frequency", frequenciesToProcess);

    if (prefsError) {
        console.error("[notification-digest] Failed to query preferences:", prefsError);
        return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!prefs || prefs.length === 0) {
        return NextResponse.json({ processed: 0, emails: 0 });
    }

    // Group preferences by user: { userId → Set<notificationType> }
    const userDigestTypes = new Map<string, Set<string>>();
    for (const pref of prefs as PrefRow[]) {
        if (!userDigestTypes.has(pref.user_id)) {
            userDigestTypes.set(pref.user_id, new Set());
        }
        userDigestTypes.get(pref.user_id)!.add(pref.notification_type);
    }

    const userIds = Array.from(userDigestTypes.keys());

    // 2. Fetch profiles for email addresses
    const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

    const profileMap = new Map<string, ProfileRow>();
    for (const p of (profiles ?? []) as ProfileRow[]) {
        profileMap.set(p.id, p);
    }

    // 3. For each user, fetch undigested notifications matching their digest types
    let emailCount = 0;

    for (const [userId, digestTypes] of userDigestTypes) {
        const profile = profileMap.get(userId);
        if (!profile?.email) continue;

        const typesArray = Array.from(digestTypes);

        const { data: notifications } = await supabase
            .from("notifications")
            .select("id, type, title, body, created_at")
            .eq("user_id", userId)
            .in("type", typesArray)
            .is("digest_sent_at", null)
            .order("created_at", { ascending: false })
            .limit(50);

        const notifs = (notifications ?? []) as NotificationRow[];
        if (notifs.length === 0) continue;

        // 4. Send digest email
        if (resend) {
            try {
                await resend.emails.send({
                    from: "Beespo <no-reply@beespo.com>",
                    to: profile.email,
                    subject: `Your Beespo digest — ${notifs.length} notification${notifs.length !== 1 ? "s" : ""}`,
                    html: buildDigestEmailHtml({
                        userName: profile.full_name || "there",
                        notifications: notifs,
                        settingsLink: `${appUrl}/settings?tab=notifications`,
                        appUrl,
                    }),
                });
                emailCount++;
            } catch (err) {
                console.error(`[notification-digest] Email failed for ${profile.email}:`, err);
                continue; // Don't mark as digested if email failed
            }
        }

        // 5. Mark notifications as digested
        const notifIds = notifs.map((n) => n.id);
        await supabase
            .from("notifications")
            .update({ digest_sent_at: new Date().toISOString() })
            .in("id", notifIds);
    }

    return NextResponse.json({
        processed: userIds.length,
        emails: emailCount,
    });
}

// ── Email template ─────────────────────────────────────────────────────────

function buildDigestEmailHtml({
    userName,
    notifications,
    settingsLink,
    appUrl,
}: {
    userName: string;
    notifications: NotificationRow[];
    settingsLink: string;
    appUrl: string;
}) {
    const notifRows = notifications
        .map((n) => {
            const date = new Date(n.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
            });
            const typeLabel = n.type
                .replace(/_/g, " ")
                .replace(/\b\w/g, (l) => l.toUpperCase());

            return `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f3f4f6;">
            <div style="font-size: 14px; font-weight: 500; color: #111827;">${n.title}</div>
            ${n.body ? `<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">${n.body}</div>` : ""}
            <div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">${typeLabel} &middot; ${date}</div>
          </td>
        </tr>`;
        })
        .join("");

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
        <h1 style="font-size: 24px; font-weight: 600; margin: 0 0 8px 0; color: #111827;">Your notification digest</h1>
        <p style="font-size: 16px; color: #6b7280; margin: 0 0 24px 0;">
          Hi ${userName}, here's what you missed.
        </p>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #f3f4f6; border-radius: 8px; overflow: hidden;">
          ${notifRows}
        </table>
        <div style="margin-top: 24px;">
          <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Beespo</a>
        </div>
        <div style="height: 1px; background-color: #f3f4f6; margin: 32px 0;"></div>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          <a href="${settingsLink}" style="color: #6366f1; text-decoration: none;">Manage notification preferences</a>
        </p>
      </div>
      <div style="margin-top: 40px; text-align: center;">
        <div style="font-size: 12px; color: #d1d5db;">&copy; ${new Date().getFullYear()} Beespo. All rights reserved.</div>
      </div>
    </div>
  </body>
</html>`;
}
