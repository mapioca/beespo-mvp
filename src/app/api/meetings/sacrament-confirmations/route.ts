import { NextRequest, NextResponse } from "next/server"

import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import {
  applyConfirmationAction,
  type ConfirmationAction,
} from "@/lib/sacrament-confirmations"
import { createClient } from "@/lib/supabase/server"

type SacramentPlannerEntryRow = {
  meeting_state: unknown
}

async function getRequestContext() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.workspace_id) {
    return { error: NextResponse.json({ error: "No workspace found" }, { status: 404 }) }
  }

  const organizationType = await getWorkspaceOrganizationType(supabase, profile.workspace_id)
  if (!isBishopricOrganization(organizationType)) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) }
  }

  return { supabase, user, workspaceId: profile.workspace_id as string }
}

function parseAction(value: unknown): ConfirmationAction | null {
  if (typeof value !== "object" || value === null) return null
  const record = value as Record<string, unknown>
  switch (record.type) {
    case "confirm":
    case "reset":
    case "unassign":
      return { type: record.type }
    case "decline":
      return {
        type: "decline",
        note: typeof record.note === "string" && record.note.trim().length > 0 ? record.note : null,
      }
    default:
      return null
  }
}

export async function POST(request: NextRequest) {
  const context = await getRequestContext()
  if ("error" in context) return context.error

  const body = (await request.json()) as {
    meetingDate?: string
    entryId?: string
    action?: unknown
  }

  if (!body.meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.meetingDate)) {
    return NextResponse.json({ error: "Invalid meetingDate" }, { status: 400 })
  }
  if (!body.entryId) {
    return NextResponse.json({ error: "Missing entryId" }, { status: 400 })
  }
  const action = parseAction(body.action)
  if (!action) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  const { data, error: fetchError } = await (context.supabase.from("sacrament_planner_entries") as ReturnType<typeof context.supabase.from>)
    .select("meeting_state")
    .eq("workspace_id", context.workspaceId)
    .eq("meeting_date", body.meetingDate)
    .maybeSingle()

  if (fetchError) {
    return NextResponse.json(
      { error: "Failed to load planner entry", details: fetchError.message },
      { status: 500 }
    )
  }
  if (!data) {
    return NextResponse.json({ error: "No planner entry for that meeting date" }, { status: 404 })
  }

  const row = data as SacramentPlannerEntryRow
  const nextMeetingState = applyConfirmationAction(row.meeting_state, body.entryId, action)

  const { error: updateError } = await (context.supabase.from("sacrament_planner_entries") as ReturnType<typeof context.supabase.from>)
    .update({ meeting_state: nextMeetingState, updated_by: context.user.id })
    .eq("workspace_id", context.workspaceId)
    .eq("meeting_date", body.meetingDate)

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to save confirmation change", details: updateError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ saved: true })
}
