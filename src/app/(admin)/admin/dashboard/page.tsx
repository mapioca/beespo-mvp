import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Users, FileText, Ticket, Shield, UserPlus } from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Verify MFA
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === "verified");
    redirect(hasVerifiedTOTP ? "/mfa/verify" : "/mfa/setup");
  }

  const adminClient = createAdminClient();

  // Fetch stats
  const [profilesResult, templatesResult, invitationsResult, waitlistResult] =
    await Promise.all([
      adminClient.from("profiles").select("id", { count: "exact", head: true }),
      adminClient
        .from("templates")
        .select("id", { count: "exact", head: true })
        .is("workspace_id", null),
      adminClient
        .from("platform_invitations")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      adminClient
        .from("waitlist_signups")
        .select("id", { count: "exact", head: true })
        .is("invited_at", null),
    ]);

  const stats = [
    {
      label: "Total Users",
      value: profilesResult.count ?? 0,
      icon: Users,
      description: "Registered platform users",
    },
    {
      label: "Waitlist (Pending)",
      value: waitlistResult.count ?? 0,
      icon: UserPlus,
      description: "Awaiting beta invitation",
    },
    {
      label: "Global Templates",
      value: templatesResult.count ?? 0,
      icon: FileText,
      description: "Shared across all workspaces",
    },
    {
      label: "Active Invitations",
      value: invitationsResult.count ?? 0,
      icon: Ticket,
      description: "Platform invite codes",
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-zinc-400" />
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        </div>
        <p className="text-zinc-400">Platform overview and statistics</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-md bg-zinc-800 p-2">
                <stat.icon className="h-5 w-5 text-zinc-400" />
              </div>
              <span className="text-sm font-medium text-zinc-400">
                {stat.label}
              </span>
            </div>
            <p className="text-3xl font-bold text-zinc-100">{stat.value}</p>
            <p className="text-sm text-zinc-500 mt-1">{stat.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
