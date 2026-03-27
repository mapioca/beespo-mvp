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
    <div className="flex h-screen-dynamic bg-canvas">
      {/* Sidebar — transparent, sits on the canvas base layer */}
      <AppSidebar
        workspaceName={profile?.workspaces?.name || "Workspace"}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
        userId={user.id}
        userRoleTitle={profile?.role_title || ""}
      />

      {/* Inset wrapper — canvas peeks through on top, bottom, and right */}
      <div className="flex-1 min-w-0 py-2 pr-2">
        {/* Main content — elevated surface card on top of the canvas */}
        <main className="h-full overflow-hidden bg-card rounded-xl ring-1 ring-border">{children}</main>
      </div>
    </div>
  );
}
