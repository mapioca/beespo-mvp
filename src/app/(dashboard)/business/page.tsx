import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BusinessClient } from "@/components/business/business-client";

// Disable caching to ensure new business items appear immediately
export const revalidate = 0;

export default async function BusinessPage() {
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

  if (!profile || !profile.workspace_id) {
    redirect("/setup");
  }

  // Pagination settings
  const ITEMS_PER_PAGE = 50;

  // Get business items with specific columns only
  const { data: businessItems, error } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_items") as any)
    .select("id, person_name, position_calling, category, status, action_date, notes, created_at, updated_at, workspace_id, workspace_business_id, created_by")
    .eq("workspace_id", profile.workspace_id)
    .order("created_at", { ascending: false })
    .limit(ITEMS_PER_PAGE);

  // Log for debugging
  console.log("Business items query error:", error);
  console.log("Business items count:", businessItems?.length || 0);
  console.log("Workspace ID:", profile.workspace_id);

  return <BusinessClient items={businessItems || []} />;
}
