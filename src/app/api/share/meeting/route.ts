import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendShareNotificationEmail } from "@/lib/email/send-share-notification-email";
import { createNotification } from "@/lib/actions/notification-actions";

const recipientSchema = z.object({
  type: z.enum(["group", "individual"]),
  group_id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  permission: z.enum(["viewer", "editor"]),
});

const shareBodySchema = z.object({
  meeting_id: z.string().uuid(),
  recipients: z.array(recipientSchema).min(1),
});

interface ProfileRow {
  workspace_id: string | null;
  role: string;
  full_name: string | null;
  email: string | null;
}

interface MeetingRow {
  id: string;
  workspace_id: string;
  title: string;
  workspaces: { name: string; slug: string } | null;
}

interface GroupMemberRow {
  email: string;
}

// POST /api/share/meeting — batch share a meeting with groups and/or individuals
export async function POST(request: NextRequest) {
  try {
    return await handlePost(request);
  } catch (err) {
    console.error("Unhandled error in POST /api/share/meeting:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handlePost(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role, full_name, email")
    .eq("id", user.id)
    .single();

  const p = profile as ProfileRow | null;
  if (!p?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }
  if (!["admin", "leader"].includes(p.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = shareBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { meeting_id, recipients } = parsed.data;

  // Verify meeting belongs to user's workspace
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, workspace_id, title, workspaces (name, slug)")
    .eq("id", meeting_id)
    .single();

  const m = meeting as unknown as MeetingRow | null;
  if (!m || m.workspace_id !== p.workspace_id) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const workspaceName = m.workspaces?.name ?? "Beespo";
  const sharerName = p.full_name || "Someone";

  // Expand all recipients to individual email entries
  const emailsToShare: Array<{ email: string; permission: "viewer" | "editor"; groupId?: string }> = [];

  for (const recipient of recipients) {
    if (recipient.type === "individual" && recipient.email) {
      emailsToShare.push({ email: recipient.email.toLowerCase(), permission: recipient.permission });
    } else if (recipient.type === "group" && recipient.group_id) {
      // Fetch group members
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: groupMembers } = await (supabase as any)
        .from("sharing_group_members")
        .select("email")
        .eq("group_id", recipient.group_id);

      for (const member of (groupMembers as GroupMemberRow[] ?? [])) {
        emailsToShare.push({
          email: member.email.toLowerCase(),
          permission: recipient.permission,
          groupId: recipient.group_id,
        });
      }
    }
  }

  // Deduplicate by email — first occurrence wins
  const seen = new Set<string>();
  const uniqueEmails = emailsToShare.filter(({ email }) => {
    if (seen.has(email)) return false;
    seen.add(email);
    return true;
  });

  let sharedCount = 0;
  const errors: string[] = [];

  for (const { email, permission, groupId } of uniqueEmails) {
    // Check if user with this email exists in Beespo
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("email", email)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipientUserId = (recipientProfile as any)?.id ?? null;
    const isBeespoUser = Boolean(recipientUserId);

    // Check for any existing share record (active OR revoked) to avoid
    // UNIQUE (meeting_id, recipient_email) constraint violations.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("meeting_shares")
      .select("id, status, token")
      .eq("meeting_id", meeting_id)
      .eq("recipient_email", email)
      .maybeSingle();

    let shareRecord: { id: string; token: string } | null = null;

    if (existing?.status === "active") {
      // Already shared and active — skip without counting
      continue;
    } else if (existing?.status === "revoked") {
      // Reactivate the revoked share rather than inserting a new one
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: updated, error: updateError } = await (supabase as any)
        .from("meeting_shares")
        .update({
          status: "active",
          permission,
          recipient_user_id: recipientUserId,
          shared_by: user.id,
          sharing_group_id: groupId ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id, token")
        .single();

      if (updateError) {
        errors.push(`Failed to share with ${email}`);
        continue;
      }
      shareRecord = updated;
    } else {
      // No existing record — insert fresh
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: inserted, error: insertError } = await (supabase as any)
        .from("meeting_shares")
        .insert({
          meeting_id,
          recipient_email: email,
          recipient_user_id: recipientUserId,
          permission,
          shared_by: user.id,
          sharing_group_id: groupId ?? null,
          status: "active",
        })
        .select("id, token")
        .single();

      if (insertError) {
        errors.push(`Failed to share with ${email}`);
        continue;
      }
      shareRecord = inserted;
    }

    if (!shareRecord) {
      errors.push(`Failed to share with ${email}`);
      continue;
    }

    sharedCount++;

    // Send email notification
    const viewLink = isBeespoUser
      ? `${appUrl}/meetings/${meeting_id}`
      : `${appUrl}/shared/${shareRecord.token}`;

    await sendShareNotificationEmail({
      toEmail: email,
      sharerName,
      meetingTitle: m.title,
      workspaceName,
      permission,
      isBeespoUser,
      viewLink,
    }).catch((err) => {
      console.error(`[share] Email notification failed for ${email}:`, err);
    });

    // In-app notification for existing Beespo users (non-blocking)
    if (recipientUserId) {
      createNotification({
        recipientUserId,
        type: "meeting_shared",
        title: `${sharerName} shared "${m.title}" with you`,
        body: `From ${workspaceName} · ${permission} access`,
        metadata: { meeting_id, shared_by: user.id, permission },
      }).catch((err) => {
        console.error(`[share] In-app notification failed for ${email}:`, err);
      });
    }

    // Log activity (non-blocking)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("share_activity_log")
        .insert({
          workspace_id: p.workspace_id,
          action: "shared",
          entity_type: "meeting",
          entity_id: meeting_id,
          target_email: email,
          sharing_group_id: groupId ?? null,
          performed_by: user.id,
          details: { permission, meeting_title: m.title },
        });
    } catch {}
  }

  return NextResponse.json(
    { shared_count: sharedCount, errors },
    { status: 201 }
  );
}

// GET /api/share/meeting?meeting_id=... — list active shares for a meeting
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meetingId = request.nextUrl.searchParams.get("meeting_id");
  if (!meetingId) {
    return NextResponse.json({ error: "meeting_id is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const workspaceId = (profile as any)?.workspace_id;
  if (!workspaceId) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }

  // Verify meeting belongs to workspace
  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, workspace_id")
    .eq("id", meetingId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!meeting || (meeting as any).workspace_id !== workspaceId) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shares } = await (supabase as any)
    .from("meeting_shares")
    .select("id, recipient_email, recipient_user_id, permission, status, sharing_group_id, token, created_at, updated_at")
    .eq("meeting_id", meetingId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return NextResponse.json({ shares: shares ?? [] });
}

// DELETE /api/share/meeting?id=... — revoke a specific share
export async function DELETE(request: NextRequest) {
  try {
    return await handleDelete(request);
  } catch (err) {
    console.error("Unhandled error in DELETE /api/share/meeting:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleDelete(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shareId = request.nextUrl.searchParams.get("id");
  if (!shareId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  const p = profile as ProfileRow | null;
  if (!p?.workspace_id) {
    return NextResponse.json({ error: "No workspace" }, { status: 404 });
  }
  if (!["admin", "leader"].includes(p.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Verify share belongs to workspace's meeting
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: share } = await (supabase as any)
    .from("meeting_shares")
    .select("id, meeting_id, recipient_email, meetings!meeting_id (workspace_id)")
    .eq("id", shareId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!share || (share as any)?.meetings?.workspace_id !== p.workspace_id) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from("meeting_shares")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", shareId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to revoke share" }, { status: 500 });
  }

  // Log activity (non-blocking)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("share_activity_log")
      .insert({
        workspace_id: p.workspace_id,
        action: "revoked",
        entity_type: "meeting",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        entity_id: (share as any).meeting_id,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        target_email: (share as any).recipient_email,
        performed_by: user.id,
        details: {},
      });
  } catch {}

  return NextResponse.json({ success: true });
}
