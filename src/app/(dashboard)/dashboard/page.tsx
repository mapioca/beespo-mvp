import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/lib/dashboard/data-fetchers";
import { getDefaultLayout } from "@/lib/dashboard/widget-registry";
import { MissionControl } from "@/components/dashboard/mission-control";
import type { DashboardConfig } from "@/types/dashboard";
import type { ReleaseNote } from "@/types/release-notes";

const OLD_WIDGET_TYPES = ["sunday_morning", "organizational_pulse", "action_inbox", "kpi_task_completion", "weekly_momentum"];

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Get user profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("full_name, role, workspace_id, feature_tier, last_read_release_note_at")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) redirect("/onboarding");

  // Load user settings, dashboard data, and latest release note in parallel
  const [settingsResult, dashboardData, releaseNoteResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("user_settings") as any)
      .select("dashboard_layout")
      .eq("user_id", user.id)
      .single(),
    fetchDashboardData(supabase, profile.workspace_id, user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from("release_notes") as any)
      .select("*")
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then((res: { data: unknown }) => res, () => ({ data: null })),
  ]);

  // Use saved layout or generate default from feature tier
  let config: DashboardConfig = getDefaultLayout(profile.feature_tier);

  if (settingsResult.data?.dashboard_layout?.version === 1) {
    const saved = settingsResult.data.dashboard_layout as DashboardConfig;
    // Migration guard: reset if layout contains old widget types
    const hasOldWidgets = saved.widgets.some((w) =>
      OLD_WIDGET_TYPES.includes(w.type)
    );
    if (!hasOldWidgets) {
      config = saved;
    }
  }

  const latestReleaseNote = releaseNoteResult?.data
    ? (releaseNoteResult.data as unknown as ReleaseNote)
    : null;

  return (
    <MissionControl
      config={config}
      data={dashboardData}
      featureTier={profile.feature_tier}
      profileName={profile.full_name}
      latestReleaseNote={latestReleaseNote}
      lastReadReleaseNoteAt={profile.last_read_release_note_at ?? null}
    />
  );
}
