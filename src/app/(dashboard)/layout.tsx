import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CommandPalette } from "@/components/command-palette";
import { getProfile } from "@/lib/supabase/cached-queries";
import { checkTrustedDevice, checkWorkspaceMfaRequired } from "@/lib/mfa";
import { getUserNavigationItems } from "@/lib/navigation/user-navigation";

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

  const initialNavigationItems = await getUserNavigationItems();

  return (
    <>
      <DashboardShell
        workspaceName={profile?.workspaces?.name || "Workspace"}
        userName={profile?.full_name || ""}
        userEmail={user?.email || ""}
        userId={user.id}
        userRoleTitle={profile?.role_title || ""}
        initialNavigationItems={initialNavigationItems}
      >
        {children}
      </DashboardShell>
      <CommandPalette />
    </>
  );
}
