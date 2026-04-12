"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cloneTemplateAction(
  templateId: string,
  overrides?: {
    name?: string;
    description?: string | null;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  const { data: profile } = await (supabase.from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    return { success: false, error: "Workspace not found." };
  }

  // Fetch the source template and its items
  const { data: source, error: fetchError } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .select("*, items:template_items(*)")
    .eq("id", templateId)
    .single();

  if (fetchError || !source) {
    return { success: false, error: "Template not found." };
  }

  // Insert the cloned template into the user's workspace
  const { data: newTemplate, error: insertError } = await (
    supabase.from("templates") as ReturnType<typeof supabase.from>
  )
    .insert({
      workspace_id: profile.workspace_id,
      name: overrides?.name?.trim() || source.name,
      description: overrides?.description !== undefined
        ? (overrides.description?.trim() || null)
        : (source.description ?? null),
      calling_type: source.calling_type ?? null,
      tags: source.tags ?? [],
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertError || !newTemplate) {
    return { success: false, error: "Failed to clone template." };
  }

  // Copy template items
  const items = source.items ?? [];
  if (items.length > 0) {
    const itemsToInsert = items.map(
      (item: {
        title: string;
        description: string | null;
        order_index: number;
        duration_minutes: number | null;
        item_type: string;
        procedural_item_type_id: string | null;
        hymn_id: string | null;
      }) => ({
        template_id: newTemplate.id,
        title: item.title,
        description: item.description ?? null,
        order_index: item.order_index,
        duration_minutes: item.duration_minutes ?? null,
        item_type: item.item_type,
        procedural_item_type_id: item.procedural_item_type_id ?? null,
        hymn_id: item.hymn_id ?? null,
      })
    );

    const { error: itemsError } = await (
      supabase.from("template_items") as ReturnType<typeof supabase.from>
    ).insert(itemsToInsert);

    if (itemsError) {
      // Clean up the template if items failed
      await (supabase.from("templates") as ReturnType<typeof supabase.from>)
        .delete()
        .eq("id", newTemplate.id);
      return { success: false, error: "Failed to copy template items." };
    }
  }

  revalidatePath("/library");

  return { success: true, id: newTemplate.id };
}
