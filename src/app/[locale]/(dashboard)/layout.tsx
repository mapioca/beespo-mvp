import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { getTranslations } from "next-intl/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const t = await getTranslations("Dashboard.Layout");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await (supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("profiles") as any)
    .select("full_name, workspace_id, role, role_title, workspaces(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.workspace_id) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen-dynamic">
      {/* Sidebar */}
      <AppSidebar
        workspaceName={profile?.workspaces?.name || t("defaultWorkspaceName")}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
        userRoleTitle={profile?.role_title || ""}
      />

      {/* Main Content - flex-1 fills remaining width, overflow-hidden contains internal scrolling */}
      <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}
