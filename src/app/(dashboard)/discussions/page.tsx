import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiscussionsClient } from "@/components/discussions/discussions-client";

export default async function DiscussionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    redirect("/setup");
  }

  // Fetch discussions
  const { data: discussions } = await (supabase
    .from("discussions") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  // Calculate counts
  const statusCounts: Record<string, number> = {};
  const priorityCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  (discussions || []).forEach((d: unknown) => {
    const disc = d as Record<string, string>;
    statusCounts[disc.status] = (statusCounts[disc.status] || 0) + 1;
    priorityCounts[disc.priority] = (priorityCounts[disc.priority] || 0) + 1;
    categoryCounts[disc.category] = (categoryCounts[disc.category] || 0) + 1;
  });

  return (
    <DiscussionsClient
      discussions={discussions || []}
      totalCount={discussions?.length || 0}
      statusCounts={statusCounts}
      priorityCounts={priorityCounts}
      categoryCounts={categoryCounts}
      currentFilters={{ search: "", status: [] }}
    />
  );
}
