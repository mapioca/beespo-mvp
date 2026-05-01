import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { DiscussionDetailSimple } from "@/components/discussions/discussion-detail-simple";

export default async function DiscussionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: discussion, error } = await (supabase.from("discussions") as any)
    .select("*")
    .eq("id", id)
    .eq("workspace_id", profile.workspace_id)
    .single();

  if (error || !discussion) {
    notFound();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notes = [] } = await (supabase.from("discussion_notes") as any)
    .select(`
      *,
      creator:profiles!discussion_notes_created_by_fkey(full_name),
      meeting:meetings(title, scheduled_date)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks = [] } = await (supabase.from("tasks") as any)
    .select(`
      *,
      assignee:profiles!tasks_assigned_to_fkey(full_name)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: activities = [] } = await (supabase.from("discussion_activities") as any)
    .select(`
      *,
      user:profiles!discussion_activities_user_id_fkey(full_name)
    `)
    .eq("discussion_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: impressions = [] } = await (supabase.from("spiritual_impressions") as any)
    .select("*")
    .eq("discussion_id", id)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DiscussionDetailSimple
      discussion={discussion}
      notes={notes}
      tasks={tasks}
      activities={activities}
      impressions={impressions}
      currentUserId={user.id}
    />
  );
}
