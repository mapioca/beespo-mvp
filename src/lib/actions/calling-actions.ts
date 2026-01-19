"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
    CallingCandidateStatus,
    CallingProcessStage,
    CallingProcessStatus,
    CallingHistoryAction
} from "@/types/database";
import { getAllStages } from "@/lib/calling-utils";

// =====================================================
// CANDIDATE NAMES (Autocomplete Pool)
// =====================================================

export async function searchCandidateNames(query: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(10);

    if (error) {
        console.error("Search candidate names error:", error);
        return { error: error.message };
    }

    return { success: true, candidates: data || [] };
}

export async function createCandidateName(name: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (!['admin', 'leader'].includes(profile.role)) return { error: "Insufficient permissions" };

    // Check for existing name first
    const { data: existing } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, name")
        .eq("workspace_id", profile.workspace_id)
        .ilike("name", name)
        .single();

    if (existing) {
        return { success: true, candidate: existing, existed: true };
    }

    const { data, error } = await (supabase
        .from("candidate_names") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            name: name.trim(),
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Create candidate name error:", error);
        return { error: error.message };
    }

    return { success: true, candidate: data, existed: false };
}

export async function getOrCreateCandidateName(name: string) {
    return createCandidateName(name);
}

// =====================================================
// CALLINGS (The Roles)
// =====================================================

export async function getCallings() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            filled_by_name:candidate_names!callings_filled_by_fkey(id, name),
            candidates:calling_candidates(
                id,
                status,
                notes,
                candidate:candidate_names(id, name)
            ),
            processes:calling_processes(
                id,
                current_stage,
                status,
                candidate:candidate_names(id, name)
            )
        `)
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Get callings error:", error);
        return { error: error.message };
    }

    return { success: true, callings: data || [] };
}

export async function getCalling(callingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            filled_by_name:candidate_names!callings_filled_by_fkey(id, name),
            candidates:calling_candidates(
                id,
                status,
                notes,
                created_at,
                candidate:candidate_names(id, name)
            ),
            processes:calling_processes(
                id,
                current_stage,
                status,
                dropped_reason,
                created_at,
                candidate:candidate_names(id, name)
            )
        `)
        .eq("id", callingId)
        .single();

    if (error) {
        console.error("Get calling error:", error);
        return { error: error.message };
    }

    return { success: true, calling: data };
}

export async function createCalling(data: {
    title: string;
    organization?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id, role")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };
    if (!['admin', 'leader'].includes(profile.role)) return { error: "Insufficient permissions" };

    const { data: calling, error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            title: data.title,
            organization: data.organization || null,
            created_by: user.id
        })
        .select()
        .single();

    if (error) {
        console.error("Create calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true, calling };
}

export async function updateCalling(callingId: string, data: {
    title?: string;
    organization?: string | null;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.organization !== undefined) updateData.organization = data.organization;

    const { error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", callingId);

    if (error) {
        console.error("Update calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function deleteCalling(callingId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", callingId);

    if (error) {
        console.error("Delete calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// CALLING CANDIDATES (Brainstorming Layer)
// =====================================================

export async function addCandidateToCalling(callingId: string, candidateNameId: string, notes?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_id: callingId,
            candidate_name_id: candidateNameId,
            status: 'proposed' as CallingCandidateStatus,
            notes: notes || null,
            created_by: user.id
        })
        .select(`
            *,
            candidate:candidate_names(id, name)
        `)
        .single();

    if (error) {
        console.error("Add candidate to calling error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true, callingCandidate: data };
}

export async function updateCallingCandidate(callingCandidateId: string, data: {
    status?: CallingCandidateStatus;
    notes?: string | null;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const { error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", callingCandidateId);

    if (error) {
        console.error("Update calling candidate error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function removeCallingCandidate(callingCandidateId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", callingCandidateId);

    if (error) {
        console.error("Remove calling candidate error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// CALLING PROCESSES (The Lifecycle Tracker)
// =====================================================

export async function startCallingProcess(callingId: string, candidateNameId: string, callingCandidateId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Start transaction-like operation
    // 1. Create the process
    const { data: process, error: processError } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_id: callingId,
            candidate_name_id: candidateNameId,
            calling_candidate_id: callingCandidateId || null,
            current_stage: 'defined' as CallingProcessStage,
            status: 'active' as CallingProcessStatus,
            created_by: user.id
        })
        .select(`
            *,
            candidate:candidate_names(id, name)
        `)
        .single();

    if (processError) {
        console.error("Start calling process error:", processError);
        return { error: processError.message };
    }

    // 2. Update candidate status to 'selected' if linked
    if (callingCandidateId) {
        await (supabase
            .from("calling_candidates") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({ status: 'selected' as CallingCandidateStatus })
            .eq("id", callingCandidateId);
    }

    revalidatePath("/callings");
    return { success: true, process };
}

export async function advanceProcessStage(processId: string, newStage: CallingProcessStage) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Get current process to validate stage transition
    const { data: currentProcess } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("current_stage, status, calling_id, candidate_name_id")
        .eq("id", processId)
        .single();

    if (!currentProcess) return { error: "Process not found" };
    if (currentProcess.status !== 'active') return { error: "Process is not active" };

    // Stage order validation
    const stageOrder = getAllStages();
    const currentIndex = stageOrder.indexOf(currentProcess.current_stage);
    const newIndex = stageOrder.indexOf(newStage);

    if (newIndex <= currentIndex) {
        return { error: "Can only advance to a later stage" };
    }

    // Update the process (trigger will log history)
    const updateData: Record<string, string> = {
        current_stage: newStage,
        updated_at: new Date().toISOString()
    };

    // If reaching final stage, mark as completed and update calling
    if (newStage === 'recorded_lcr') {
        updateData.status = 'completed' as CallingProcessStatus;

        // Mark the calling as filled
        await (supabase
            .from("callings") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                is_filled: true,
                filled_by: currentProcess.candidate_name_id,
                filled_at: new Date().toISOString()
            })
            .eq("id", currentProcess.calling_id);
    }

    const { error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update(updateData)
        .eq("id", processId);

    if (error) {
        console.error("Advance process stage error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function dropProcess(processId: string, reason?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            status: 'dropped' as CallingProcessStatus,
            dropped_reason: reason || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", processId);

    if (error) {
        console.error("Drop process error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function getProcessDetails(processId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: process, error } = await (supabase
        .from("calling_processes") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            candidate:candidate_names(id, name),
            calling:callings(id, title, organization)
        `)
        .eq("id", processId)
        .single();

    if (error) {
        console.error("Get process details error:", error);
        return { error: error.message };
    }

    return { success: true, process };
}

// =====================================================
// HISTORY & TIMELINE
// =====================================================

export async function getProcessTimeline(processId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    // Get history log entries
    const { data: history, error: historyError } = await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            created_by_user:profiles!calling_history_log_created_by_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (historyError) {
        console.error("Get process history error:", historyError);
        return { error: historyError.message };
    }

    // Get comments
    const { data: comments, error: commentsError } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            *,
            created_by_user:profiles!calling_comments_created_by_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (commentsError) {
        console.error("Get process comments error:", commentsError);
        return { error: commentsError.message };
    }

    // Get associated tasks
    const { data: tasks, error: tasksError } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select(`
            id,
            title,
            status,
            due_date,
            workspace_task_id,
            assignee:profiles!tasks_assigned_to_fkey(full_name)
        `)
        .eq("calling_process_id", processId)
        .order("created_at", { ascending: true });

    if (tasksError) {
        console.error("Get process tasks error:", tasksError);
    }

    // Merge and sort all timeline items
    const timeline = [
        ...(history || []).map((h: any) => ({ ...h, type: 'history' as const })), // eslint-disable-line @typescript-eslint/no-explicit-any
        ...(comments || []).map((c: any) => ({ ...c, type: 'comment' as const })), // eslint-disable-line @typescript-eslint/no-explicit-any
        ...(tasks || []).map((t: any) => ({ ...t, type: 'task' as const, created_at: t.created_at || new Date().toISOString() })) // eslint-disable-line @typescript-eslint/no-explicit-any
    ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
        success: true,
        timeline,
        history: history || [],
        comments: comments || [],
        tasks: tasks || []
    };
}

// =====================================================
// COMMENTS
// =====================================================

export async function addCallingComment(processId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data, error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            content,
            created_by: user.id
        })
        .select(`
            *,
            created_by_user:profiles!calling_comments_created_by_fkey(full_name)
        `)
        .single();

    if (error) {
        console.error("Add calling comment error:", error);
        return { error: error.message };
    }

    // Log to history
    await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            action: 'comment_added' as CallingHistoryAction,
            notes: content.substring(0, 100),
            created_by: user.id
        });

    revalidatePath("/callings");
    return { success: true, comment: data };
}

export async function updateCallingComment(commentId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            content,
            updated_at: new Date().toISOString()
        })
        .eq("id", commentId)
        .eq("created_by", user.id); // Only creator can update

    if (error) {
        console.error("Update calling comment error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

export async function deleteCallingComment(commentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { error } = await (supabase
        .from("calling_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .delete()
        .eq("id", commentId);

    if (error) {
        console.error("Delete calling comment error:", error);
        return { error: error.message };
    }

    revalidatePath("/callings");
    return { success: true };
}

// =====================================================
// TASK INTEGRATION
// =====================================================

export async function createCallingTask(processId: string, data: {
    title: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    const { data: profile } = await (supabase
        .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) return { error: "Profile not found" };

    const { data: task, error } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            workspace_id: profile.workspace_id,
            calling_process_id: processId,
            title: data.title,
            description: data.description || null,
            assigned_to: data.assigned_to || null,
            due_date: data.due_date || null,
            priority: data.priority || 'medium',
            status: 'pending',
            created_by: user.id
        })
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(full_name, email)
        `)
        .single();

    if (error) {
        console.error("Create calling task error:", error);
        return { error: error.message };
    }

    // Log to history
    await (supabase
        .from("calling_history_log") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            calling_process_id: processId,
            action: 'task_created' as CallingHistoryAction,
            notes: data.title,
            created_by: user.id
        });

    revalidatePath("/callings");
    revalidatePath("/tasks");
    return { success: true, task };
}


