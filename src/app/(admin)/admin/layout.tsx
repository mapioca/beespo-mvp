import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { IdleTimerProvider } from "@/components/admin/idle-timer-provider";

export const metadata = {
  title: "Beespo Admin Console",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not authenticated — middleware handles redirect, but guard here too
  if (!user) {
    return <>{children}</>;
  }

  // Check if user is a sys_admin
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase.from("profiles") as any)
    .select("is_sys_admin, full_name, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_sys_admin) {
    // Non-admin users see the login page (they'll be rejected at login)
    return <>{children}</>;
  }

  // Check MFA enrollment
  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactors = factorsData?.totp || [];
  const hasEnrolledTOTP = totpFactors.length > 0 && totpFactors.some(f => f.status === "verified");

  if (!hasEnrolledTOTP) {
    // Allow access to MFA setup page, redirect everything else
    return <>{children}</>;
  }

  // Check AAL level (is MFA verified for this session?)
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aalData?.currentLevel !== "aal2") {
    // Allow access to MFA verify page, redirect everything else
    return <>{children}</>;
  }

  // Fully authenticated admin with MFA — render full admin layout
  return (
    <IdleTimerProvider>
      <div className="flex h-screen bg-zinc-950">
        <AdminSidebar
          userName={profile.full_name || ""}
          userEmail={profile.email || user.email || ""}
        />
        <main className="flex-1 min-w-0 overflow-auto bg-zinc-950 text-zinc-100">
          {children}
        </main>
      </div>
    </IdleTimerProvider>
  );
}
