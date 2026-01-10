import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AnnouncementsClient } from "@/components/announcements/announcements-client";

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

  if (!profile) {
    redirect("/setup");
  }

  // Get all announcements for the organization
  const { data: announcements } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("announcements") as any)
    .select("*")
    .order("created_at", { ascending: false });

  return <AnnouncementsClient announcements={announcements || []} />;
}
