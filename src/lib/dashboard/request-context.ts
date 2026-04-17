import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { CachedProfile } from "@/lib/supabase/cached-queries";
import { measureAsync } from "@/lib/performance/measure";

export type DashboardRequestContext = {
  user: User;
  profile: NonNullable<CachedProfile> & {
    workspace_id: string;
  };
};

export const getDashboardRequestContext = cache(
  async (): Promise<DashboardRequestContext> => {
    return measureAsync("dashboard.request_context", async () => {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        redirect("/login");
      }

      // Query profile on the same Supabase client used for auth in this request
      // to avoid extra client/bootstrap overhead on the request hot path.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase.from("profiles") as any)
        .select("full_name, workspace_id, role, role_title, feature_tier, last_read_release_note_at, workspaces(name, organization_type)")
        .eq("id", user.id)
        .eq("is_deleted", false)
        .single();

      if (!profile?.workspace_id) {
        redirect("/onboarding");
      }

      return {
        user,
        profile: {
          ...profile,
          workspace_id: profile.workspace_id,
        },
      };
    }, { thresholdMs: 25 });
  }
);
