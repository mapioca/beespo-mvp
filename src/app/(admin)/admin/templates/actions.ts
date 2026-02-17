"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { TemplateItem } from "@/components/templates/types";

async function requireSysAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("is_sys_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_sys_admin) throw new Error("Forbidden");

  return { supabase, user };
}

export async function createGlobalTemplateAction(data: {
  name: string;
  description?: string;
  tags?: string[];
  items: TemplateItem[];
}) {
  const { user } = await requireSysAdmin();
  const adminClient = createAdminClient();

  // Create template with workspace_id = null and is_shared = true
  const { data: template, error } = await adminClient
    .from("templates")
    .insert({
      workspace_id: null,
      name: data.name,
      description: data.description || null,
      is_shared: true,
      tags: data.tags || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Insert template items
  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      template_id: template.id,
      title: item.title,
      description: item.description,
      order_index: index,
      duration_minutes: item.duration_minutes,
      item_type: item.item_type,
      procedural_item_type_id: item.procedural_item_type_id || null,
      hymn_id: item.hymn_id || null,
    }));

    const { error: itemsError } = await adminClient
      .from("template_items")
      .insert(itemsToInsert);

    if (itemsError) {
      return { success: false, error: itemsError.message };
    }
  }

  revalidatePath("/templates");
  return { success: true, id: template.id };
}

export async function updateGlobalTemplateAction(
  id: string,
  data: {
    name: string;
    description?: string;
    tags?: string[];
    items: TemplateItem[];
  }
) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  // Update template metadata
  const { error } = await adminClient
    .from("templates")
    .update({
      name: data.name,
      description: data.description || null,
      tags: data.tags || [],
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Replace all items: delete existing, insert new
  await adminClient.from("template_items").delete().eq("template_id", id);

  if (data.items.length > 0) {
    const itemsToInsert = data.items.map((item, index) => ({
      template_id: id,
      title: item.title,
      description: item.description,
      order_index: index,
      duration_minutes: item.duration_minutes,
      item_type: item.item_type,
      procedural_item_type_id: item.procedural_item_type_id || null,
      hymn_id: item.hymn_id || null,
    }));

    const { error: itemsError } = await adminClient
      .from("template_items")
      .insert(itemsToInsert);

    if (itemsError) {
      return { success: false, error: itemsError.message };
    }
  }

  revalidatePath("/templates");
  return { success: true };
}

export async function deleteGlobalTemplateAction(id: string) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  // Delete items first (foreign key constraint)
  await adminClient.from("template_items").delete().eq("template_id", id);

  const { error } = await adminClient.from("templates").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/templates");
  return { success: true };
}
