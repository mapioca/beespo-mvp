"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { FormSchema, Form } from "@/types/form-types";

/**
 * Create a new form
 */
export async function createForm(data: {
    title: string;
    description?: string;
    schema: FormSchema;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        return { error: "No workspace found" };
    }

    // Create the form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .insert({
            workspace_id: profile.workspace_id,
            title: data.title,
            description: data.description || null,
            schema: {
                ...data.schema,
                id: crypto.randomUUID(),
                title: data.title,
            },
            created_by: user.id,
        })
        .select()
        .single();

    if (error) {
        console.error("Error creating form:", error);
        return { error: "Failed to create form" };
    }

    revalidatePath("/forms");
    return { data: form as Form };
}

/**
 * Update an existing form
 */
export async function updateForm(
    formId: string,
    data: {
        title?: string;
        description?: string;
        schema?: FormSchema;
        is_published?: boolean;
    }
) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) {
        updateData.title = data.title;
    }
    if (data.description !== undefined) {
        updateData.description = data.description;
    }
    if (data.schema !== undefined) {
        updateData.schema = data.schema;
    }
    if (data.is_published !== undefined) {
        updateData.is_published = data.is_published;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .update(updateData)
        .eq("id", formId)
        .select()
        .single();

    if (error) {
        console.error("Error updating form:", error);
        return { error: "Failed to update form" };
    }

    revalidatePath("/forms");
    revalidatePath(`/forms/${formId}`);
    return { data: form as Form };
}

/**
 * Delete a form
 */
export async function deleteForm(formId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("forms") as any)
        .delete()
        .eq("id", formId);

    if (error) {
        console.error("Error deleting form:", error);
        return { error: "Failed to delete form" };
    }

    revalidatePath("/forms");
    return { success: true };
}

/**
 * Get a form by ID
 */
export async function getForm(formId: string) {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .select("*")
        .eq("id", formId)
        .single();

    if (error) {
        console.error("Error fetching form:", error);
        return { error: "Form not found" };
    }

    return { data: form as Form };
}

/**
 * Get a published form by slug (for public access)
 */
export async function getPublishedFormBySlug(slug: string) {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form, error } = await (supabase.from("forms") as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

    if (error) {
        console.error("Error fetching published form:", error);
        return { error: "Form not found" };
    }

    return { data: form as Form };
}

/**
 * Get all forms in workspace
 */
export async function getWorkspaceForms() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized", data: [] };
    }

    // Get user's workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase.from("profiles") as any)
        .select("workspace_id")
        .eq("id", user.id)
        .single();

    if (!profile?.workspace_id) {
        return { error: "No workspace found", data: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: forms, error } = await (supabase.from("forms") as any)
        .select("*")
        .eq("workspace_id", profile.workspace_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching forms:", error);
        return { error: "Failed to fetch forms", data: [] };
    }

    return { data: forms as Form[] };
}

/**
 * Submit a response to a published form
 */
export async function submitFormResponse(
    formId: string,
    data: Record<string, unknown>
) {
    const supabase = await createClient();

    // Verify form is published
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form } = await (supabase.from("forms") as any)
        .select("id, is_published")
        .eq("id", formId)
        .single();

    if (!form?.is_published) {
        return { error: "Form is not accepting responses" };
    }

    // Insert submission
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("form_submissions") as any).insert({
        form_id: formId,
        data,
    });

    if (error) {
        console.error("Error submitting form response:", error);
        return { error: "Failed to submit response" };
    }

    return { success: true };
}

/**
 * Increment form view count
 */
export async function incrementFormView(formId: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Upsert view analytics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: analyticsError } = await (supabase.from("form_view_analytics") as any)
        .upsert(
            {
                form_id: formId,
                view_date: today,
                view_count: 1,
            },
            {
                onConflict: "form_id,view_date",
                ignoreDuplicates: false,
            }
        );

    if (analyticsError) {
        // Try incrementing existing record
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)("increment_form_view", {
            p_form_id: formId,
            p_date: today,
        });
    }

    // Also increment total views on form
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("forms") as any)
        .update({ views_count: supabase.rpc("increment_views_count") })
        .eq("id", formId);
}

/**
 * Get form submissions
 */
export async function getFormSubmissions(formId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized", data: [] };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: submissions, error } = await (supabase.from("form_submissions") as any)
        .select("*")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: false });

    if (error) {
        console.error("Error fetching submissions:", error);
        return { error: "Failed to fetch submissions", data: [] };
    }

    return { data: submissions };
}

/**
 * Get form analytics
 */
export async function getFormAnalytics(formId: string) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Get form with view count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: form } = await (supabase.from("forms") as any)
        .select("views_count")
        .eq("id", formId)
        .single();

    // Get submission count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: submissionCount } = await (supabase.from("form_submissions") as any)
        .select("*", { count: "exact", head: true })
        .eq("form_id", formId);

    // Get daily views for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dailyViews } = await (supabase.from("form_view_analytics") as any)
        .select("view_date, view_count")
        .eq("form_id", formId)
        .gte("view_date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("view_date", { ascending: true });

    return {
        data: {
            totalViews: form?.views_count || 0,
            totalSubmissions: submissionCount || 0,
            completionRate:
                form?.views_count > 0
                    ? ((submissionCount || 0) / form.views_count) * 100
                    : 0,
            dailyViews: dailyViews || [],
        },
    };
}
