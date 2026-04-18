"use server";

import { createClient } from "@/lib/supabase/server";
import { discussionLibrarySchema, segmentLibrarySchema, type DiscussionLibraryInput, type SegmentLibraryInput } from "@/lib/validations/libraries";

async function getWorkspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Unauthorized" as const };

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) return { supabase, error: "No workspace found" as const };
  return { supabase, user, profile };
}

export async function createDiscussionLibraryItem(input: DiscussionLibraryInput) {
  const parsed = discussionLibrarySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase, profile, user } = context;
  const { data, error } = await (supabase.from("discussion_item_library") as ReturnType<typeof supabase.from>)
    .insert({ ...parsed.data, workspace_id: profile.workspace_id, created_by: user.id })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateDiscussionLibraryItem(id: string, input: Partial<DiscussionLibraryInput>) {
  const parsed = discussionLibrarySchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase } = context;
  const { data, error } = await (supabase.from("discussion_item_library") as ReturnType<typeof supabase.from>)
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteDiscussionLibraryItem(id: string) {
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase } = context;
  const { error } = await (supabase.from("discussion_item_library") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function listDiscussionLibraryItems() {
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase, profile } = context;
  const { data, error } = await (supabase.from("discussion_item_library") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("topic");
  if (error) return { error: error.message };
  return { data };
}

export async function createSegmentLibraryItem(input: SegmentLibraryInput) {
  const parsed = segmentLibrarySchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase, profile, user } = context;
  const { data, error } = await (supabase.from("segment_library") as ReturnType<typeof supabase.from>)
    .insert({ ...parsed.data, workspace_id: profile.workspace_id, created_by: user.id })
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function updateSegmentLibraryItem(id: string, input: Partial<SegmentLibraryInput>) {
  const parsed = segmentLibrarySchema.partial().safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase } = context;
  const { data, error } = await (supabase.from("segment_library") as ReturnType<typeof supabase.from>)
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { data };
}

export async function deleteSegmentLibraryItem(id: string) {
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase } = context;
  const { error } = await (supabase.from("segment_library") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  return { success: true };
}

export async function listSegmentLibraryItems() {
  const context = await getWorkspaceContext();
  if ("error" in context) return context;
  const { supabase, profile } = context;
  const { data, error } = await (supabase.from("segment_library") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("title");
  if (error) return { error: error.message };
  return { data };
}

export async function instantiateTemplate(templateId: string, meetingId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.rpc as unknown as (name: string, args: Record<string, unknown>) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "instantiate_template_as_plan",
    { p_template_id: templateId, p_meeting_id: meetingId }
  );
  if (error) return { error: error.message };
  return { data };
}
