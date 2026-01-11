import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";

// Disable caching to ensure new announcements appear immediately
export const revalidate = 0;

export default async function AnnouncementsPage() {
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

  // Get announcements with specific columns only
  const { data: announcements, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("announcements") as any)
    .select("id, title, content, priority, status, deadline, created_at, updated_at, workspace_id, workspace_announcement_id, created_by")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })
    .limit(ITEMS_PER_PAGE);

  // Log for debugging
  console.log("Announcements query error:", error);
  console.log("Announcements count:", announcements?.length || 0);

  return <AnnouncementsClient announcements={announcements || []} />;
}
