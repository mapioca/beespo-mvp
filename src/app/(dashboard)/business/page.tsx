import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BusinessClient } from "@/components/business/business-client";

// Enable caching with revalidation every 60 seconds
export const revalidate = 60;

export default async function BusinessPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Pagination settings
  const ITEMS_PER_PAGE = 50;

  // Parallelize profile and business items queries
  const [
    { data: profile },
    { data: businessItems }
  ] = await Promise.all([
    // Get user profile to check role
    (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("profiles") as any)
      .select("workspace_id, role")
      .eq("id", user.id)
      .single(),
    // Get business items with specific columns only
    (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("business_items") as any)
      .select("id, title, description, status, created_at, updated_at, workspace_id, workspace_entity_id, created_by")
      .order("created_at", { ascending: false })
      .limit(ITEMS_PER_PAGE)
  ]);

  if (!profile) {
    redirect("/setup");
  }

  return <BusinessClient items={businessItems || []} />;
}
