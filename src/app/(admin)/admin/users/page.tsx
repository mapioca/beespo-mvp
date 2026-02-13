import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UsersDataTable } from "@/components/admin/users/users-data-table";
import { InviteUserDialog } from "@/components/admin/users/invite-user-dialog";
import { Users } from "lucide-react";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Verify MFA
  const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aalData?.currentLevel !== "aal2") {
    const { data: factorsData } = await supabase.auth.mfa.listFactors();
    const hasVerifiedTOTP = factorsData?.totp?.some(f => f.status === "verified");
    redirect(hasVerifiedTOTP ? "/mfa/verify" : "/mfa/setup");
  }

  const adminClient = createAdminClient();

  const { data: profiles } = await adminClient
    .from("profiles")
    .select("id, email, full_name, role, is_sys_admin, workspace_id, created_at, workspaces(name)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">Users</h1>
          </div>
          <p className="text-zinc-400">
            Manage platform users and administrator access
          </p>
        </div>
        <InviteUserDialog />
      </div>

      <UsersDataTable profiles={profiles || []} />
    </div>
  );
}
