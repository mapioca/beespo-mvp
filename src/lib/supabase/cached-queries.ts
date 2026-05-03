import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { FeatureTier } from "@/types/database";

export type CachedProfile = {
  full_name: string;
  workspace_id: string | null;
  role: string;
  role_title: string;
  feature_tier: FeatureTier | null;
  last_read_release_note_at: string | null;
  workspaces: { name: string; organization_type: string | null } | null;
} | null;

/**
 * Fetches the current user's profile from the database.
 *
 * Wrapped in React's cache() so that multiple Server Components calling
 * getProfile(userId) within the same request only fire one DB query.
 * Layout and page components both need profile data — this eliminates the
 * duplicate query.
 */
export const getProfile = cache(async (userId: string): Promise<CachedProfile> => {
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("profiles") as any)
    .select("full_name, workspace_id, role, role_title, feature_tier, last_read_release_note_at, workspaces(name, organization_type)")
    .eq("id", userId)
    .eq("is_deleted", false)
    .single();
  return data as CachedProfile;
});
