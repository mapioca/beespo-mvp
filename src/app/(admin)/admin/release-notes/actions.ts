"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { ReleaseNoteItem } from "@/types/release-notes";

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

export async function createReleaseNoteAction(data: {
  title: string;
  version?: string;
  content: ReleaseNoteItem[];
  status: "draft" | "published";
  published_at?: string;
}) {
  const { user } = await requireSysAdmin();
  const adminClient = createAdminClient();

  const publishedAt =
    data.status === "published"
      ? data.published_at || new Date().toISOString()
      : null;

  const { data: note, error } = await adminClient
    .from("release_notes")
    .insert({
      title: data.title,
      version: data.version || null,
      content: data.content,
      status: data.status,
      published_at: publishedAt,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/release-notes");
  return { success: true, id: note.id };
}

export async function updateReleaseNoteAction(
  id: string,
  data: {
    title: string;
    version?: string;
    content: ReleaseNoteItem[];
    status: "draft" | "published";
    published_at?: string;
  }
) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  const publishedAt =
    data.status === "published"
      ? data.published_at || new Date().toISOString()
      : null;

  const { error } = await adminClient
    .from("release_notes")
    .update({
      title: data.title,
      version: data.version || null,
      content: data.content,
      status: data.status,
      published_at: publishedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/release-notes");
  return { success: true };
}

export async function deleteReleaseNoteAction(id: string) {
  await requireSysAdmin();
  const adminClient = createAdminClient();

  // Only allow deleting drafts
  const { data: note } = await adminClient
    .from("release_notes")
    .select("status")
    .eq("id", id)
    .single();

  if (!note || note.status !== "draft") {
    return { success: false, error: "Only draft notes can be deleted" };
  }

  const { error } = await adminClient
    .from("release_notes")
    .delete()
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/release-notes");
  return { success: true };
}
