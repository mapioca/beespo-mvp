import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getProfile, type CachedProfile } from "@/lib/supabase/cached-queries";

export type DashboardRequestContext = {
  user: User;
  profile: NonNullable<CachedProfile> & {
    workspace_id: string;
  };
};

export const getDashboardRequestContext = cache(
  async (): Promise<DashboardRequestContext> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const profile = await getProfile(user.id);

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
  }
);
