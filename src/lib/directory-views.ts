"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DirectoryViewFilters {
  /**
   * Tags — all of these must be present on the person (AND logic)
   * Special value: "untagged" = people with no tags assigned
   */
  tagIds?: string[]

  /**
   * Speaker assignment date filter (all comparisons use meeting.scheduled_date).
   * "after"     → scheduled_date >  speakerDateValue  (strictly after)
   * "not_before"→ scheduled_date >= speakerDateValue  (on or after)
   * "before"    → scheduled_date <  speakerDateValue  (strictly before)
   * "not_after" → scheduled_date <= speakerDateValue  (on or before)
   * "any"       → has at least one speaking assignment (date ignored)
   * "none"      → has NO speaking assignments
   */
  speakerDateOperator?: "after" | "not_before" | "before" | "not_after" | "any" | "none"
  speakerDateValue?: string // ISO date string YYYY-MM-DD

  /**
   * Confirmation status for speaker assignments.
   * Only meaningful when speakerDateOperator is a date-based or "any" operator.
   */
  speakerConfirmed?: "confirmed" | "pending" | "any"

  /**
   * Meeting history filter
   * "has_history" → person has at least one assignment of any type
   * "no_history"  → person has never been assigned
   */
  historyFilter?: "has_history" | "no_history"
}

export interface DirectoryView {
  id: string
  workspace_id: string
  created_by: string | null
  name: string
  view_type: "directory"
  filters: DirectoryViewFilters
  created_at: string
  updated_at: string
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function createDirectoryView(
  name: string,
  filters: DirectoryViewFilters
): Promise<{ data?: DirectoryView; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("workspace_id")
    .eq("id", user.id)
    .single()

  if (!profile?.workspace_id) return { error: "No workspace found" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("agenda_views") as any)
    .insert({
      name: name.trim(),
      filters,
      view_type: "directory",
      workspace_id: profile.workspace_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath("/directory")
  return { data: data as DirectoryView }
}

export async function deleteDirectoryView(
  id: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("agenda_views") as any)
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath("/directory")
  return {}
}
