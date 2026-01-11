import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiscussionsClient } from "@/components/discussions/discussions-client";

// Disable caching to ensure new discussions appear immediately
export const revalidate = 0;

export default async function DiscussionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user profile to check role
  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspace_id) {
    redirect("/setup");
  }

  // Pagination settings
  const ITEMS_PER_PAGE = 50;

  // Get discussions with specific columns only
  const { data: discussions, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("discussions") as any)
    .select("id, title, description, category, status, priority, due_date, created_at, updated_at, workspace_id, workspace_discussion_id, created_by")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })
    .limit(ITEMS_PER_PAGE);

  // Log for debugging
  console.log("Discussions query error:", error);
  console.log("Discussions count:", discussions?.length || 0);
  console.log("Workspace ID:", profile.workspace_id);

  return <DiscussionsClient discussions={discussions || []} />;
}
