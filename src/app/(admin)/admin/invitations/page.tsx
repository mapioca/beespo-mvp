import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { InvitationsDataTable } from "@/components/admin/invitations/invitations-data-table";
import { CreateInvitationDialog } from "@/components/admin/invitations/create-invitation-dialog";
import { Ticket } from "lucide-react";

export default async function AdminInvitationsPage() {
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

  const { data: invitations } = await adminClient
    .from("platform_invitations")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Ticket className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">
              Platform Invitations
            </h1>
          </div>
          <p className="text-zinc-400">
            Manage invite codes for platform access
          </p>
        </div>
        <CreateInvitationDialog />
      </div>

      <InvitationsDataTable invitations={invitations || []} />
    </div>
  );
}
