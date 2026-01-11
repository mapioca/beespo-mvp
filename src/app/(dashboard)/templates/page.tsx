import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplatesClient } from "./templates-client";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check organization
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/setup");
  }

  // Get all templates (shared + organization-specific)
  const { data: templates } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("templates") as any)
    .select("id, name, description, calling_type, is_shared, created_at, folder_id")
    .order("is_shared", { ascending: false })
    .order("created_at", { ascending: false });

  // Get template folders for the workspace
  const { data: folders } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("template_folders") as any)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("order_index");

  return (
    <TemplatesClient
      initialTemplates={templates || []}
      initialFolders={folders || []}
      initialSelectedTemplateId={params.selected || null}
      userRole={profile.role}
    />
  );
}
