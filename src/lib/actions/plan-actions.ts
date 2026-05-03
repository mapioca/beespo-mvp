"use server";

import { createClient } from "@/lib/supabase/server";
import {
  createAgendaPlanSchema,
  createProgramPlanSchema,
  linkTaskToDiscussionSchema,
  planAssignmentSchema,
  updateAgendaPlanSchema,
  updateProgramPlanSchema,
  type CreateAgendaPlanInput,
  type CreateProgramPlanInput,
  type LinkTaskToDiscussionInput,
  type PlanAssignmentInput,
  type UpdateAgendaPlanInput,
  type UpdateProgramPlanInput,
} from "@/lib/validations/plans";

type RpcResult<T> = Promise<{ data: T | null; error: { message: string } | null }>;

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const supabase = await createClient();
  return (supabase.rpc as unknown as (rpcName: string, rpcArgs: Record<string, unknown>) => RpcResult<T>)(name, args);
}

export async function createAgendaPlan(input: CreateAgendaPlanInput) {
  const parsed = createAgendaPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { data, error } = await rpc<string>("create_agenda_plan", {
    p_meeting_id: parsed.data.meeting_id,
    p_title: parsed.data.title,
    p_description: parsed.data.description ?? null,
    p_objectives: parsed.data.objectives,
    p_discussion_items: parsed.data.discussion_items,
  });
  if (error) return { error: error.message };
  return { data };
}

export async function updateAgendaPlan(input: UpdateAgendaPlanInput) {
  const parsed = updateAgendaPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { data, error } = await rpc<string>("update_agenda_plan", {
    p_agenda_document_id: parsed.data.agenda_document_id,
    p_title: parsed.data.title ?? null,
    p_description: parsed.data.description ?? null,
    p_status: parsed.data.status ?? null,
    p_objectives: parsed.data.objectives ?? null,
    p_discussion_items: parsed.data.discussion_items ?? null,
  });
  if (error) return { error: error.message };
  return { data };
}

export async function getAgendaPlan(meetingId: string) {
  const supabase = await createClient();
  const { data: document, error } = await (supabase.from("agenda_documents") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("meeting_id", meetingId)
    .single();
  if (error) return { error: error.message };

  const [{ data: objectives }, { data: discussionItems }] = await Promise.all([
    (supabase.from("agenda_objectives") as ReturnType<typeof supabase.from>)
      .select("*")
      .eq("agenda_document_id", document.id)
      .order("order_index"),
    (supabase.from("agenda_discussion_items") as ReturnType<typeof supabase.from>)
      .select("*")
      .eq("agenda_document_id", document.id)
      .order("order_index"),
  ]);

  const enrichedItems = await Promise.all(
    (discussionItems ?? []).map(async (item: { id: string }) => {
      const [{ data: links }, { data: assignments }] = await Promise.all([
        (supabase.from("agenda_discussion_tasks") as ReturnType<typeof supabase.from>)
          .select("task_id, task:tasks(id, title, status, priority, due_date)")
          .eq("agenda_discussion_item_id", item.id),
        (supabase.from("plan_assignments") as ReturnType<typeof supabase.from>)
          .select("*")
          .eq("assignable_type", "agenda_discussion_item")
          .eq("assignable_id", item.id),
      ]);

      return {
        ...item,
        tasks: links ?? [],
        assignments: assignments ?? [],
      };
    })
  );

  return {
    data: {
      ...document,
      objectives: objectives ?? [],
      discussion_items: enrichedItems,
    },
  };
}

export async function deleteAgendaPlan(agendaDocId: string) {
  const supabase = await createClient();
  const { data: document } = await (supabase.from("agenda_documents") as ReturnType<typeof supabase.from>)
    .select("meeting_id")
    .eq("id", agendaDocId)
    .single();
  const { error } = await (supabase.from("agenda_documents") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("id", agendaDocId);
  if (error) return { error: error.message };

  if (document?.meeting_id) {
    await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
      .update({ plan_type: null })
      .eq("id", document.meeting_id);
  }

  return { success: true };
}

export async function createProgramPlan(input: CreateProgramPlanInput) {
  const parsed = createProgramPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { data, error } = await rpc<string>("create_program_plan", {
    p_meeting_id: parsed.data.meeting_id,
    p_title: parsed.data.title,
    p_description: parsed.data.description ?? null,
    p_style_config: parsed.data.style_config ?? {},
    p_segments: parsed.data.segments,
  });
  if (error) return { error: error.message };
  return { data };
}

export async function updateProgramPlan(input: UpdateProgramPlanInput) {
  const parsed = updateProgramPlanSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { data, error } = await rpc<string>("update_program_plan", {
    p_program_document_id: parsed.data.program_document_id,
    p_title: parsed.data.title ?? null,
    p_description: parsed.data.description ?? null,
    p_style_config: parsed.data.style_config ?? null,
    p_status: parsed.data.status ?? null,
    p_segments: parsed.data.segments ?? null,
  });
  if (error) return { error: error.message };
  return { data };
}

export async function getProgramPlan(meetingId: string) {
  const supabase = await createClient();
  const { data: document, error } = await (supabase.from("program_documents") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("meeting_id", meetingId)
    .single();
  if (error) return { error: error.message };

  const { data: segments } = await (supabase.from("program_segments") as ReturnType<typeof supabase.from>)
    .select("*, hymn:hymns(id, title, hymn_number)")
    .eq("program_document_id", document.id)
    .order("order_index");

  const enrichedSegments = await Promise.all(
    (segments ?? []).map(async (segment: { id: string }) => {
      const { data: assignments } = await (supabase.from("plan_assignments") as ReturnType<typeof supabase.from>)
        .select("*")
        .eq("assignable_type", "program_segment")
        .eq("assignable_id", segment.id);
      return {
        ...segment,
        assignments: assignments ?? [],
      };
    })
  );

  return {
    data: {
      ...document,
      segments: enrichedSegments,
    },
  };
}

export async function deleteProgramPlan(programDocId: string) {
  const supabase = await createClient();
  const { data: document } = await (supabase.from("program_documents") as ReturnType<typeof supabase.from>)
    .select("meeting_id")
    .eq("id", programDocId)
    .single();
  const { error } = await (supabase.from("program_documents") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("id", programDocId);
  if (error) return { error: error.message };

  if (document?.meeting_id) {
    await (supabase.from("meetings") as ReturnType<typeof supabase.from>)
      .update({ plan_type: null })
      .eq("id", document.meeting_id);
  }

  return { success: true };
}

export async function assignParticipant(input: PlanAssignmentInput) {
  const parsed = planAssignmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { data, error } = await rpc<string>("assign_plan_participant", {
    p_assignable_type: parsed.data.assignable_type,
    p_assignable_id: parsed.data.assignable_id,
    p_assignee_type: parsed.data.assignee_type,
    p_assignee_id: parsed.data.assignee_id ?? null,
    p_assignee_name: parsed.data.assignee_name ?? null,
    p_role: parsed.data.role ?? null,
  });
  if (error) return { error: error.message };
  return { data };
}

export async function removeAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { error } = await (supabase.from("plan_assignments") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("id", assignmentId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getAssignmentsForPlanItem(assignableType: string, assignableId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("plan_assignments") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("assignable_type", assignableType)
    .eq("assignable_id", assignableId);
  if (error) return { error: error.message };
  return { data };
}

export async function linkTaskToDiscussionItem(input: LinkTaskToDiscussionInput) {
  const parsed = linkTaskToDiscussionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.flatten() };
  const { error } = await rpc<null>("link_task_to_discussion_item", {
    p_discussion_item_id: parsed.data.agenda_discussion_item_id,
    p_task_id: parsed.data.task_id,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function unlinkTaskFromDiscussionItem(discussionItemId: string, taskId: string) {
  const supabase = await createClient();
  const { error } = await (supabase.from("agenda_discussion_tasks") as ReturnType<typeof supabase.from>)
    .delete()
    .eq("agenda_discussion_item_id", discussionItemId)
    .eq("task_id", taskId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function getTasksForDiscussionItem(discussionItemId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase.from("agenda_discussion_tasks") as ReturnType<typeof supabase.from>)
    .select("task_id, task:tasks(id, title, status, priority, due_date)")
    .eq("agenda_discussion_item_id", discussionItemId);
  if (error) return { error: error.message };
  return { data };
}
