import { NextRequest, NextResponse } from "next/server"

import { getWorkspaceOrganizationType, isBishopricOrganization } from "@/lib/meetings/access"
import { createClient } from "@/lib/supabase/server"

type SacramentPlannerEntryPayload = {
  meetingDate: string
  meetingState: unknown
  notesState: unknown
  meetingTypeOverridden: boolean
}

type SacramentPlannerEntryRow = {
  meeting_date: string
  meeting_state: unknown
  notes_state: unknown
  meeting_type_overridden: boolean
  updated_at: string | null
}

function parseDateList(value: string | null) {
  if (!value) return []

  return value
    .split(",")
    .map((date) => date.trim())
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
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

export async function GET(request: NextRequest) {
  const context = await getRequestContext()
  if ("error" in context) return context.error

  const dates = parseDateList(request.nextUrl.searchParams.get("dates"))
  if (dates.length === 0) {
    return NextResponse.json({ entries: [] })
  }

  const { data, error } = await (context.supabase.from("sacrament_planner_entries") as ReturnType<typeof context.supabase.from>)
    .select("meeting_date, meeting_state, notes_state, meeting_type_overridden, updated_at")
    .eq("workspace_id", context.workspaceId)
    .in("meeting_date", dates)

  if (error) {
    return NextResponse.json(
      { error: "Failed to load sacrament planner entries", details: error.message, code: error.code },
      { status: 500 }
    )
  }

  const rows = (data ?? []) as SacramentPlannerEntryRow[]

  return NextResponse.json({
    entries: rows.map((entry) => ({
      meetingDate: entry.meeting_date,
      meetingState: entry.meeting_state,
      notesState: entry.notes_state,
      meetingTypeOverridden: entry.meeting_type_overridden,
      updatedAt: entry.updated_at,
    })),
  })
}

export async function POST(request: NextRequest) {
  const context = await getRequestContext()
  if ("error" in context) return context.error

  const body = (await request.json()) as {
    dates?: string[]
    entries?: SacramentPlannerEntryPayload[]
  }

  const dates = (body.dates ?? []).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
  const entries = (body.entries ?? []).filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.meetingDate))

  if (dates.length === 0) {
    return NextResponse.json({ entries: [] })
  }

  const rows = entries.map((entry) => ({
    workspace_id: context.workspaceId,
    meeting_date: entry.meetingDate,
    meeting_state: entry.meetingState,
    notes_state: entry.notesState ?? {},
    meeting_type_overridden: entry.meetingTypeOverridden,
    updated_by: context.user.id,
    created_by: context.user.id,
  }))

  if (rows.length > 0) {
    const { error: upsertError } = await (context.supabase.from("sacrament_planner_entries") as ReturnType<typeof context.supabase.from>)
      .upsert(rows, { onConflict: "workspace_id,meeting_date" })

    if (upsertError) {
      return NextResponse.json(
        { error: "Failed to save sacrament planner entries", details: upsertError.message, code: upsertError.code },
        { status: 500 }
      )
    }
  }

  const datesWithEntries = new Set(entries.map((entry) => entry.meetingDate))
  const datesToDelete = dates.filter((date) => !datesWithEntries.has(date))

  if (datesToDelete.length > 0) {
    const { error: deleteError } = await (context.supabase.from("sacrament_planner_entries") as ReturnType<typeof context.supabase.from>)
      .delete()
      .eq("workspace_id", context.workspaceId)
      .in("meeting_date", datesToDelete)

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to clear sacrament planner entries", details: deleteError.message, code: deleteError.code },
        { status: 500 }
      )
    }
  }

  return NextResponse.json({ saved: true })
}
