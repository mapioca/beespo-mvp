import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { DiscussionDetailView } from "@/components/discussions/discussion-detail-view";

export const dynamic = "force-dynamic";

interface DiscussionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function DiscussionDetailPage({ params }: DiscussionDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.workspace_id) redirect("/onboarding");

  const { data: discussion, error } = await (supabase
    .from("discussions") as ReturnType<typeof supabase.from>)
    .select("*")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !discussion) notFound();

  // Fetch creator name
  const { data: creator } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("full_name")
    .eq("id", discussion.created_by)
    .single();

  // Fetch discussion notes — ascending (oldest first)
  const { data: notes } = await (supabase
    .from("discussion_notes") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      creator:profiles!discussion_notes_created_by_fkey(full_name),
      meeting:meetings(title, scheduled_date)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: true });

  // Fetch related tasks
  const { data: tasks } = await (supabase
    .from("tasks") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(full_name)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // Fetch activity log — ascending (oldest first)
  const { data: activities } = await (supabase
    .from("discussion_activities") as ReturnType<typeof supabase.from>)
    .select(`
      *,
      user:profiles!discussion_activities_user_id_fkey(full_name)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: true });

  return (
    <DiscussionDetailView
      discussion={discussion}
      creatorName={creator?.full_name ?? null}
      initialNotes={notes || []}
      initialTasks={tasks || []}
      initialActivities={activities || []}
      currentUserId={user.id}
    />
  );
}
