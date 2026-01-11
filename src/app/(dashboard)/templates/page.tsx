import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplatesLayout } from "@/components/templates/templates-layout";

export const revalidate = 0;

export default async function TemplatesPage() {
  const supabase = await createClient();

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

  // Get all templates with their items
  const { data: templates } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("templates") as any)
    .select("*, items:template_items(*)")
    .order("is_shared", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <TemplatesLayout
      templates={templates || []}
      currentUserId={user.id}
      userRole={profile.role}
    />
  );
}
