import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { getProfile } from "@/lib/supabase/cached-queries";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // getProfile() is memoised with React cache() — if a child page also calls
  // getProfile(user.id) during the same request, only one DB query fires.
  const profile = await getProfile(user.id);

  if (!profile?.workspace_id) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen-dynamic">
      {/* Sidebar */}
      <AppSidebar
        workspaceName={profile?.workspaces?.name || "Workspace"}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
        userRoleTitle={profile?.role_title || ""}
      />

      {/* Main Content - flex-1 fills remaining width, overflow-hidden contains internal scrolling */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
