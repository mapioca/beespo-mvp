import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { getProfile } from "@/lib/supabase/cached-queries";
import { checkTrustedDevice, checkWorkspaceMfaRequired } from "@/lib/mfa";

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

  // Workspace MFA enforcement
  const workspaceRequiresMfa = await checkWorkspaceMfaRequired(profile.workspace_id);
  if (workspaceRequiresMfa) {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedFactor = factorsData?.totp?.some(f => f.status === "verified");

    if (!hasVerifiedFactor) {
      // User hasn't set up MFA yet — redirect to setup
      redirect("/mfa/setup?required=true");
    }

    // User has MFA enrolled, check if verified this session
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel !== "aal2") {
      // Check trusted device before requiring MFA
      const isTrusted = await checkTrustedDevice(user.id);
      if (!isTrusted) {
        redirect("/mfa/verify");
      }
    }
  }

  return (
    <div className="flex h-screen-dynamic overflow-hidden bg-panel">
      {/* Sidebar — transparent, sits on the canvas base layer */}
      <AppSidebar
        workspaceName={profile?.workspaces?.name || "Workspace"}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
        userId={user.id}
        userRoleTitle={profile?.role_title || ""}
      />

      {/* Main content area (Linear-style island inset) */}
      <div className="flex-1 min-w-0 bg-[#f0f1f3] p-4">
        <main className="h-full overflow-hidden rounded-[16px] border border-[#e2e3e6] bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.06)]">
          {children}
        </main>
      </div>
    </div>
  );
}
