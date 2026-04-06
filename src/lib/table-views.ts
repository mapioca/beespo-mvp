"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// ── Shared base type ──────────────────────────────────────────────────────────

export interface TableView {
  id: string
  workspace_id: string
  created_by: string | null
  name: string
  view_type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Record<string, any>
  created_at: string
  updated_at: string
}

// ── Per-table filter shapes ───────────────────────────────────────────────────

export interface TaskViewFilters {
  statuses?: string[]
  priorities?: string[]
}

export interface AnnouncementViewFilters {
  statuses?: string[]
  priorities?: string[]
}

export interface BusinessViewFilters {
  statuses?: string[]
  categories?: string[]
}

export interface DiscussionViewFilters {
  statuses?: string[]
  priorities?: string[]
  categories?: string[]
}

export interface FormViewFilters {
  statuses?: string[]
}

export interface AssignmentViewFilters {
  assignmentTypes?: string[]
  statuses?: string[]
}

// ── Typed view aliases ────────────────────────────────────────────────────────

export type TaskView = Omit<TableView, "filters"> & { view_type: "tasks"; filters: TaskViewFilters }
export type AnnouncementView = Omit<TableView, "filters"> & { view_type: "announcements"; filters: AnnouncementViewFilters }
export type BusinessView = Omit<TableView, "filters"> & { view_type: "business"; filters: BusinessViewFilters }
export type DiscussionView = Omit<TableView, "filters"> & { view_type: "discussions"; filters: DiscussionViewFilters }
export type FormView = Omit<TableView, "filters"> & { view_type: "forms"; filters: FormViewFilters }
export type AssignmentView = Omit<TableView, "filters"> & { view_type: "assignments"; filters: AssignmentViewFilters }

// ── Internal helpers ──────────────────────────────────────────────────────────

async function _createView(
  viewType: string,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filters: Record<string, any>,
  path: string
): Promise<{ data?: TableView; error?: string }> {
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
      view_type: viewType,
      workspace_id: profile.workspace_id,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(path)
  return { data: data as TableView }
}

async function _deleteView(id: string, path: string): Promise<{ error?: string }> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("agenda_views") as any)
    .delete()
    .eq("id", id)

  if (error) return { error: error.message }

  revalidatePath(path)
  return {}
}

// ── Task view actions ─────────────────────────────────────────────────────────

export async function createTaskView(
  name: string,
  filters: TaskViewFilters
): Promise<{ data?: TaskView; error?: string }> {
  const r = await _createView("tasks", name, filters, "/tasks")
  return r as { data?: TaskView; error?: string }
}

export async function deleteTaskView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/tasks")
}

// ── Announcement view actions ─────────────────────────────────────────────────

export async function createAnnouncementView(
  name: string,
  filters: AnnouncementViewFilters
): Promise<{ data?: AnnouncementView; error?: string }> {
  const r = await _createView("announcements", name, filters, "/meetings/announcements")
  return r as { data?: AnnouncementView; error?: string }
}

export async function deleteAnnouncementView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/meetings/announcements")
}

// ── Business view actions ─────────────────────────────────────────────────────

export async function createBusinessView(
  name: string,
  filters: BusinessViewFilters
): Promise<{ data?: BusinessView; error?: string }> {
  const r = await _createView("business", name, filters, "/meetings/business")
  return r as { data?: BusinessView; error?: string }
}

export async function deleteBusinessView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/meetings/business")
}

// ── Discussion view actions ───────────────────────────────────────────────────

export async function createDiscussionView(
  name: string,
  filters: DiscussionViewFilters
): Promise<{ data?: DiscussionView; error?: string }> {
  const r = await _createView("discussions", name, filters, "/meetings/discussions")
  return r as { data?: DiscussionView; error?: string }
}

export async function deleteDiscussionView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/meetings/discussions")
}

// ── Form view actions ─────────────────────────────────────────────────────────

export async function createFormView(
  name: string,
  filters: FormViewFilters
): Promise<{ data?: FormView; error?: string }> {
  const r = await _createView("forms", name, filters, "/forms")
  return r as { data?: FormView; error?: string }
}

export async function deleteFormView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/forms")
}

// ── Assignment view actions ───────────────────────────────────────────────────

export async function createAssignmentView(
  name: string,
  filters: AssignmentViewFilters
): Promise<{ data?: AssignmentView; error?: string }> {
  const r = await _createView("assignments", name, filters, "/meetings/assignments")
  return r as { data?: AssignmentView; error?: string }
}

export async function deleteAssignmentView(id: string): Promise<{ error?: string }> {
  return _deleteView(id, "/meetings/assignments")
}
