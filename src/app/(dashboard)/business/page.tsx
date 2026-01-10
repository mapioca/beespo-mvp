import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BusinessClient } from "@/components/business/business-client";

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

  if (!profile) {
    redirect("/setup");
  }

  // Get all business items for the organization
  const { data: businessItems } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_items") as any)
    .select("*")
    .order("created_at", { ascending: false });

  return <BusinessClient items={businessItems || []} />;
}
