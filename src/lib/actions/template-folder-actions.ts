"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTemplateFolder(name: string) {
  try {
    const supabase = await createClient();

    // Get current user and their workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { error: "Not authorized to create folders" };
    }

    // Get the highest order_index for this workspace
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFolders } = await (supabase as any)
      .from("template_folders")
      .select("order_index")
      .eq("workspace_id", profile.workspace_id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex =
      existingFolders && existingFolders.length > 0
        ? existingFolders[0].order_index + 1
        : 0;

    // Create the folder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("template_folders")
      .insert({
        workspace_id: profile.workspace_id,
        name,
        order_index: nextOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating folder:", error);
      return { error: error.message };
    }

    revalidatePath("/templates");
    return { data, error: null };
  } catch (error) {
    console.error("Error in createTemplateFolder:", error);
    return { error: "Failed to create folder" };
  }
}

export async function renameTemplateFolder(folderId: string, newName: string) {
  try {
    const supabase = await createClient();

    // Get current user and their workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { error: "Not authorized to rename folders" };
    }

    // Update the folder
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("template_folders")
      .update({ name: newName })
      .eq("id", folderId)
      .eq("workspace_id", profile.workspace_id);

    if (error) {
      console.error("Error renaming folder:", error);
      return { error: error.message };
    }

    revalidatePath("/templates");
    return { error: null };
  } catch (error) {
    console.error("Error in renameTemplateFolder:", error);
    return { error: "Failed to rename folder" };
  }
}

export async function deleteTemplateFolder(folderId: string) {
  try {
    const supabase = await createClient();

    // Get current user and their workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { error: "Not authorized to delete folders" };
    }

    // Delete the folder (templates will have their folder_id set to NULL due to ON DELETE SET NULL)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("template_folders")
      .delete()
      .eq("id", folderId)
      .eq("workspace_id", profile.workspace_id);

    if (error) {
      console.error("Error deleting folder:", error);
      return { error: error.message };
    }

    revalidatePath("/templates");
    return { error: null };
  } catch (error) {
    console.error("Error in deleteTemplateFolder:", error);
    return { error: "Failed to delete folder" };
  }
}

export async function moveTemplateToFolder(
  templateId: string,
  folderId: string | null
) {
  try {
    const supabase = await createClient();

    // Get current user and their workspace
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "Not authenticated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("workspace_id, role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "leader" && profile.role !== "admin")) {
      return { error: "Not authorized to move templates" };
    }

    // Update the template's folder_id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("templates")
      .update({ folder_id: folderId })
      .eq("id", templateId)
      .eq("workspace_id", profile.workspace_id);

    if (error) {
      console.error("Error moving template:", error);
      return { error: error.message };
    }

    revalidatePath("/templates");
    return { error: null };
  } catch (error) {
    console.error("Error in moveTemplateToFolder:", error);
    return { error: "Failed to move template" };
  }
}
