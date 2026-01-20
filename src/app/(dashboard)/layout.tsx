import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

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

  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("full_name, workspace_id, role, workspaces(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    redirect("/setup");
  }

  return (
    <div className="flex h-screen-dynamic">
      {/* Sidebar */}
      <AppSidebar
        workspaceName={profile?.workspaces?.name || "Workspace"}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
      />

      {/* Main Content - flex-1 fills remaining width, overflow-hidden contains internal scrolling */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
