import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SharingGroupWithMembers } from "@/types/share";

// ── GET /api/sharing-groups — list all groups for user's workspace ─────────────

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: groups, error } = await (supabase.from("sharing_groups") as any)
    .select(
      `
      id,
      workspace_id,
      name,
      description,
      created_by,
      created_at,
      updated_at,
      members:sharing_group_members(id, group_id, email, added_by, created_at)
    `
    )
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch sharing groups:", error);
    return NextResponse.json({ error: "Failed to fetch sharing groups" }, { status: 500 });
  }

  const groupsWithCount: SharingGroupWithMembers[] = (groups || []).map(
    (g: SharingGroupWithMembers & { members: unknown[] }) => ({
      ...g,
      member_count: g.members?.length ?? 0,
    })
  );

  return NextResponse.json({ groups: groupsWithCount });
}

// ── POST /api/sharing-groups — create a group ─────────────────────────────────

const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  memberEmails: z.array(z.string().email()).optional().default([]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return NextResponse.json({ error: "No workspace found" }, { status: 404 });
  }

  if (!["admin", "leader"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Only admins and leaders can create sharing groups" },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, memberEmails } = parsed.data;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: group, error: groupError } = await (supabase.from("sharing_groups") as any)
    .insert({
      workspace_id: profile.workspace_id,
      name,
      description: description ?? null,
      created_by: user.id,
    })
    .select()
    .single();

  if (groupError) {
    console.error("Failed to create sharing group:", groupError);
    return NextResponse.json({ error: "Failed to create sharing group" }, { status: 500 });
  }

  // Add members if provided
  if (memberEmails.length > 0) {
    const memberRows = memberEmails.map((email) => ({
      group_id: group.id,
      email: email.toLowerCase().trim(),
      added_by: user.id,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: membersError } = await (supabase.from("sharing_group_members") as any)
      .insert(memberRows);

    if (membersError) {
      console.error("Failed to add members to sharing group:", membersError);
      // Group created — surface warning but still return 201
    }
  }

  // Fire-and-forget audit log
  try {
    await (supabase.from("share_activity_log") as any)
      .insert({
        workspace_id: profile.workspace_id,
        action: "group_created",
        entity_type: "meeting",
        entity_id: null,
        target_email: null,
        sharing_group_id: group.id,
        performed_by: user.id,
        details: { group_name: name, initial_member_count: memberEmails.length },
      });
  } catch {}

  return NextResponse.json({ group }, { status: 201 });
}
