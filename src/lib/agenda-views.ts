"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ViewFilters {
  /** Which pool of meetings to show */
  category?: "mine" | "shared" | "all"
  /** MeetingStatus values to include; empty = no filter */
  statuses?: string[]
  /** Template IDs to include; "no-template" = meetings without a template */
  templateIds?: string[]
  /** Only show meetings that have a Zoom meeting linked */
  hasZoom?: boolean
}

export interface AgendaView {
  id: string
  workspace_id: string
  created_by: string | null
  name: string
  filters: ViewFilters
  created_at: string
  updated_at: string
}

// UI-friendly aliases (DB table remains `agenda_views`)
export type FilterCriteria = ViewFilters
export type AgendaFilter = AgendaView

// ── Server actions ────────────────────────────────────────────────────────────

export async function createSavedPlanFilter(
  viewType: string,
  path: string,
  name: string,
  filters: ViewFilters
): Promise<{ data?: AgendaView; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return { error: "No workspace found" }

  const { data, error } = await supabase
    .from("agenda_views")
    .insert({
      name: name.trim(),
      filters,
      view_type: viewType,
      workspace_id: profile.workspace_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(path)
  return { data: data as AgendaView }
}

export async function deleteSavedPlanFilter(
  id: string,
  path: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from("agenda_views")
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath(path)
  return {}
}

/**
 * Create a new saved agenda filter for the current user's workspace.
 * Saved filters are visible to all members of the same workspace.
 */
export async function createAgendaView(
  name: string,
  filters: ViewFilters
): Promise<{ data?: AgendaView; error?: string }> {
  return createSavedPlanFilter("agendas", "/meetings/agendas", name, filters)
}

export async function createAgendaFilter(
  name: string,
  filters: FilterCriteria
): Promise<{ data?: AgendaFilter; error?: string }> {
  return createAgendaView(name, filters)
}

/**
 * Delete a saved agenda filter. Only the creator, leaders, and admins may delete.
 * RLS enforces this on the database side as well.
 */
export async function deleteAgendaView(
  id: string
): Promise<{ error?: string }> {
  return deleteSavedPlanFilter(id, "/meetings/agendas")
}

export async function deleteAgendaFilter(
  id: string
): Promise<{ error?: string }> {
  return deleteAgendaView(id)
}
