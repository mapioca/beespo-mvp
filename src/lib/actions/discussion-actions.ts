"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type DiscussionPriority = "low" | "medium" | "high" | "urgent";
type DiscussionState = "draft" | "active" | "closed";

// Map UI state to DB status
function stateToStatus(state: DiscussionState): string {
  switch (state) {
    case "draft": return "new";
    case "active": return "active";
    case "closed": return "resolved";
  }
}

// Map DB status to UI state
function statusToState(status: string): DiscussionState {
  switch (status) {
    case "new": return "draft";
    case "active": 
    case "decision_required": 
    case "monitoring": return "active";
    case "resolved": 
    case "deferred": return "closed";
    default: return "active";
  }
}

async function getWorkspaceContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" as const };

  const { data: profile } = await (supabase
    .from('profiles') as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) return { error: "No workspace found" as const };
  return { supabase, user, workspaceId: profile.workspace_id };
}

export async function createDiscussion(input: {
  title: string;
  description?: string;
  priority?: DiscussionPriority;
  tags?: string[];
  state?: DiscussionState;
  dueAt?: string;
}) {
  const context = await getWorkspaceContext();
  if ("error" in context) return { error: context.error };

  const { supabase, user, workspaceId } = context;
  
  const { data, error } = await (supabase.from("discussions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      workspace_id: workspaceId,
      title: input.title,
      description: input.description || null,
      priority: input.priority === "urgent" ? "high" : (input.priority || "medium"),
      status: stateToStatus(input.state || "active"),
      category: "other",
      due_date: input.dueAt || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  
  revalidatePath("/discussions");
  return { data: { ...data, state: statusToState(data.status) } };
}

export async function listDiscussions() {
  const context = await getWorkspaceContext();
  if ("error" in context) return { error: context.error };

  const { supabase, workspaceId } = context;
  
  const { data, error } = await (supabase.from("discussions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .select(`
      *,
      created_by_profile:profiles!discussions_created_by_fkey(id, full_name),
      notes:discussion_notes(count)
    `)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  
  return { 
    data: data.map((d: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
      ...d,
      state: statusToState(d.status),
      noteCount: d.notes?.[0]?.count || 0
    }))
  };
}

export async function updateDiscussion(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    priority: DiscussionPriority;
    state: DiscussionState;
    dueAt: string;
  }>
) {
  const context = await getWorkspaceContext();
  if ("error" in context) return { error: context.error };

  const { supabase } = context;
  
  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description;
  if (input.priority !== undefined) update.priority = input.priority === "urgent" ? "high" : input.priority;
  if (input.state !== undefined) update.status = stateToStatus(input.state);
  if (input.dueAt !== undefined) update.due_date = input.dueAt;
  
  const { data, error } = await (supabase.from("discussions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  
  revalidatePath("/discussions");
  return { data: { ...data, state: statusToState(data.status) } };
}

export async function deleteDiscussion(id: string) {
  const context = await getWorkspaceContext();
  if ("error" in context) return { error: context.error };

  const { supabase } = context;
  
  const { error } = await (supabase.from("discussions") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };
  
  revalidatePath("/discussions");
  return { success: true };
}

export async function logDiscussionActivity(
  discussionId: string,
  activityType: string,
  details?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await (supabase.from("discussion_activities") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
    .insert({
      discussion_id: discussionId,
      user_id: user.id,
      activity_type: activityType,
      details: details ?? null,
    });
}
