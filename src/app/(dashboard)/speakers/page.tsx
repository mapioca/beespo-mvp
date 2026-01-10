import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SpeakersClient } from "@/components/speakers/speakers-client";

export default async function SpeakersPage() {
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

  // Get all speakers for the organization with meeting info
  const { data: speakers } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("speakers") as any)
    .select(`
      *,
      agenda_items(
        meeting:meetings(
          id,
          title,
          scheduled_date
        )
      )
    `)
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false });

  return <SpeakersClient speakers={speakers || []} />;
}
