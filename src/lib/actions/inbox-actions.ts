"use server";

import { createClient } from "@/lib/supabase/server";

export async function getInboxData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await (supabase
    .from("profiles") as ReturnType<typeof supabase.from>)
    .select("workspace_id")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) return { error: "Profile not found" };

  // Fetch tasks
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false });

  // Fetch calling processes
  const { data: callingProcesses } = await supabase
    .from("calling_processes")
    .select("*")
    .eq("status", "active")
    .order("updated_at", { ascending: false });

  // Fetch vacancies
  const { data: vacancies } = await supabase
    .from("calling_vacancies")
    .select("*")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  // Fetch callings
  const { data: callings } = await supabase
    .from("callings")
    .select("id, title, organization")
    .eq("workspace_id", profile.workspace_id);

  // Fetch candidate names
  const { data: candidateNames } = await supabase
    .from("candidate_names")
    .select("id, name")
    .eq("workspace_id", profile.workspace_id);

  return {
    tasks: tasks ?? [],
    callingProcesses: callingProcesses ?? [],
    vacancies: vacancies ?? [],
    callings: callings ?? [],
    candidateNames: candidateNames ?? [],
    currentUserId: user.id,
  };
}
