"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendTaskAssignmentEmail } from "@/lib/email/send-task-email";

// Public Action (No Auth Required) - Validates Token
export async function completeTaskWithToken(token: string) {
    const supabase = await createClient();

    // 1. Find the task by token
    const { data: task, error: fetchError } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .select("id, title, status")
        .eq("access_token", token)
        .single();

    if (fetchError || !task) {
        return { error: "Invalid or expired task link." };
    }

    if (task.status === "completed") {
        return { message: "Task is already completed!", task };
    }

    const { error: updateError } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .update({
            status: "completed",
            completed_at: new Date().toISOString()
        })
        .eq("id", task.id)
        .eq("access_token", token);

    if (updateError) {
        console.error("Task update error:", updateError);
        return { error: "Failed to update task status." };
    }

    revalidatePath("/tasks");
    revalidatePath("/meetings");

    return { success: true, task };
}

// Protected Action: Complete Task (with optional comment)
export async function completeTask(taskId: string, comment?: string) {
    console.log("Starting completeTask", taskId);
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        // 1. Add Comment if present
        if (comment) {
            const { error: commentError } = await (supabase.from("task_comments") as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
                task_id: taskId,
                user_id: user.id,
                content: comment
            });
            if (commentError) console.error("Error adding closing comment:", commentError);

            // Activity for comment
            // Fire and forget activity logging to avoid blocking
            (supabase.from("task_activities") as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
                task_id: taskId,
                user_id: user.id,
                activity_type: 'comment',
                details: { snippet: comment.substring(0, 50) }
            }).then(({ error }: { error: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                if (error) console.error("Error logging comment activity:", error);
            });
        }

        // 2. Update Status
        const { error: updateError } = await (supabase
            .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update({
                status: "completed",
                completed_at: new Date().toISOString()
            })
            .eq("id", taskId);

        if (updateError) {
            console.error("Error updating task status:", updateError);
            return { error: updateError.message };
        }

        // 3. Log Activity
        // Fire and forget
        (supabase.from("task_activities") as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
            task_id: taskId,
            user_id: user.id,
            activity_type: 'status_change',
            details: { from: 'pending', to: 'completed' }
        }).then(({ error }: { error: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (error) console.error("Error logging status activity:", error);
        });

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in completeTask:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Update Task Details
export async function updateTask(taskId: string, data: {
    title?: string;
    description?: string;
    assigned_to?: string | null;
    due_date?: string | null;
    priority?: 'low' | 'medium' | 'high';
    status?: string;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const updateData: Record<string, string | null> = { updated_at: new Date().toISOString() };
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.assigned_to !== undefined) updateData.assigned_to = data.assigned_to;
        if (data.due_date !== undefined) updateData.due_date = data.due_date;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.status !== undefined) updateData.status = data.status;

        const { error } = await (supabase
            .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .update(updateData)
            .eq("id", taskId);

        if (error) {
            console.error("Error updating task:", error);
            return { error: error.message };
        }

        // Log activity if assigned_to changed? Ideally yes, but keeping it simple for now as requested.

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in updateTask:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Add Comment
export async function addTaskComment(taskId: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { error } = await (supabase
            .from("task_comments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                task_id: taskId,
                user_id: user.id,
                content
            });

        if (error) {
            console.error("Error adding comment:", error);
            return { error: error.message };
        }

        // Log Activity - Fire and forget
        (supabase.from("task_activities") as any).insert({ // eslint-disable-line @typescript-eslint/no-explicit-any
            task_id: taskId,
            user_id: user.id,
            activity_type: 'comment',
            details: { snippet: content.substring(0, 50) }
        }).then(({ error }: { error: any }) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            if (error) console.error("Error logging comment activity:", error);
        });

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in addTaskComment:", e);
        return { error: "An unexpected error occurred." };
    }
}

export async function getTaskActivity(taskId: string) {
    const supabase = await createClient();

    // Fetch comments
    const { data: comments } = await supabase
        .from('task_comments')
        .select(`
            *,
            user:profiles!task_comments_user_id_fkey(full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

    // Fetch activities
    const { data: activities } = await supabase
        .from('task_activities')
        .select(`
            *,
            user:profiles!task_activities_user_id_fkey(full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

    return {
        comments: comments || [],
        activities: activities || []
    };
}

// Protected Action: Create Task
export async function createTask(data: {
    title: string;
    description?: string;
    assigned_to?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
    meeting_id?: string;
    agenda_item_id?: string;
    discussion_id?: string;
    business_item_id?: string;
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

    const { data: task, error } = await (supabase
        .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
        .insert({
            title: data.title,
            description: data.description,
            assigned_to: data.assigned_to,
            due_date: data.due_date,
            priority: data.priority || 'medium',
            meeting_id: data.meeting_id,
            agenda_item_id: data.agenda_item_id,
            discussion_id: data.discussion_id,
            business_item_id: data.business_item_id,
            workspace_id: profile.workspace_id,
            created_by: user.id,
            status: 'pending'
        })
        .select(`
            *,
            assignee:profiles!tasks_assigned_to_fkey(email, full_name)
        `)
        .single();

    if (error) {
        console.error("Create task error:", error);
        return { error: error.message };
    }

    if (data.assigned_to && task.assignee) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const magicLink = `${baseUrl}/tasks/action?t=${task.access_token}&a=complete`;

        sendTaskAssignmentEmail(
            task.assignee.email,
            task.title,
            magicLink
        ).catch(err => console.error("Email sending failed", err));
    }

    revalidatePath("/tasks");
    return { success: true, data: task };
}

// Protected Action: Copy Task
export async function copyTask(taskId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        // Get the original task
        const { data: originalTask, error: fetchError } = await (supabase
            .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("*")
            .eq("id", taskId)
            .single();

        if (fetchError || !originalTask) {
            return { error: "Task not found" };
        }

        // Create a copy with a new workspace_task_id (auto-generated by trigger)
        const { data: newTask, error: createError } = await (supabase
            .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                title: originalTask.title + " (Copy)",
                description: originalTask.description,
                assigned_to: originalTask.assigned_to,
                due_date: originalTask.due_date,
                priority: originalTask.priority,
                meeting_id: originalTask.meeting_id,
                agenda_item_id: originalTask.agenda_item_id,
                discussion_id: originalTask.discussion_id,
                business_item_id: originalTask.business_item_id,
                workspace_id: originalTask.workspace_id,
                created_by: user.id,
                status: 'pending'
            })
            .select("workspace_task_id")
            .single();

        if (createError) {
            console.error("Error copying task:", createError);
            return { error: createError.message };
        }

        // Copy labels
        const { data: labelAssignments } = await supabase
            .from("task_label_assignments")
            .select("label_id")
            .eq("task_id", taskId);

        if (labelAssignments && labelAssignments.length > 0) {
            const newAssignments = labelAssignments.map((la: { label_id: string }) => ({
                task_id: newTask.id,
                label_id: la.label_id
            }));

            await (supabase.from("task_label_assignments") as any).insert(newAssignments); // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        revalidatePath("/tasks");
        return { success: true, newWorkspaceTaskId: newTask.workspace_task_id };
    } catch (e) {
        console.error("Unexpected error in copyTask:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Delete Task
export async function deleteTask(taskId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { error } = await (supabase
            .from("tasks") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .delete()
            .eq("id", taskId);

        if (error) {
            console.error("Error deleting task:", error);
            return { error: error.message };
        }

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in deleteTask:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Get Workspace Labels
export async function getWorkspaceLabels() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { data: profile } = await (supabase
            .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) return { error: "Profile not found" };

        const { data: labels, error } = await (supabase
            .from("task_labels") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("*")
            .eq("workspace_id", profile.workspace_id)
            .order("name");

        if (error) {
            console.error("Error fetching labels:", error);
            return { error: error.message };
        }

        return { success: true, labels };
    } catch (e) {
        console.error("Unexpected error in getWorkspaceLabels:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Get Task Labels
export async function getTaskLabels(taskId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { data: assignments, error } = await (supabase
            .from("task_label_assignments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select(`
                label_id,
                label:task_labels(id, name, color)
            `)
            .eq("task_id", taskId);

        if (error) {
            console.error("Error fetching task labels:", error);
            return { error: error.message };
        }

        const labels = assignments?.map((a: { label: { id: string, name: string, color: string } | null }) => a.label).filter(Boolean) as { id: string, name: string, color: string }[] || [];
        return { success: true, labels };
    } catch (e) {
        console.error("Unexpected error in getTaskLabels:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Assign Labels to Task
export async function assignLabels(taskId: string, labelIds: string[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        // Delete existing assignments
        await (supabase
            .from("task_label_assignments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .delete()
            .eq("task_id", taskId);

        // Insert new assignments
        if (labelIds.length > 0) {
            const assignments = labelIds.map(labelId => ({
                task_id: taskId,
                label_id: labelId
            }));

            const { error } = await (supabase
                .from("task_label_assignments") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
                .insert(assignments);

            if (error) {
                console.error("Error assigning labels:", error);
                return { error: error.message };
            }
        }

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in assignLabels:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Create Label
export async function createLabel(name: string, color: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { data: profile } = await (supabase
            .from("profiles") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .select("workspace_id")
            .eq("id", user.id)
            .single();

        if (!profile?.workspace_id) return { error: "Profile not found" };

        const { data: label, error } = await (supabase
            .from("task_labels") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .insert({
                workspace_id: profile.workspace_id,
                name,
                color
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating label:", error);
            return { error: error.message };
        }

        revalidatePath("/tasks");
        return { success: true, label };
    } catch (e) {
        console.error("Unexpected error in createLabel:", e);
        return { error: "An unexpected error occurred." };
    }
}

// Protected Action: Delete Label
export async function deleteLabel(labelId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized" };

    try {
        const { error } = await (supabase
            .from("task_labels") as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .delete()
            .eq("id", labelId);

        if (error) {
            console.error("Error deleting label:", error);
            return { error: error.message };
        }

        revalidatePath("/tasks");
        return { success: true };
    } catch (e) {
        console.error("Unexpected error in deleteLabel:", e);
        return { error: "An unexpected error occurred." };
    }
}
