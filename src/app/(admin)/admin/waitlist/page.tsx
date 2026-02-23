import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WaitlistDataTable } from "@/components/admin/waitlist/waitlist-data-table";
import { UserPlus } from "lucide-react";

export default async function AdminWaitlistPage() {
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

  const { data: signups } = await adminClient
    .from("waitlist_signups")
    .select("id, email, created_at, invited_at")
    .order("created_at", { ascending: false });

  const total = signups?.length ?? 0;
  const pending = signups?.filter((s) => !s.invited_at).length ?? 0;
  const invited = signups?.filter((s) => s.invited_at).length ?? 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">Waitlist</h1>
          </div>
          <p className="text-zinc-400">
            Manage beta access requests from the landing page
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="text-2xl font-bold text-zinc-100">{total}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{pending}</p>
            <p className="text-xs text-zinc-500">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">{invited}</p>
            <p className="text-xs text-zinc-500">Invited</p>
          </div>
        </div>
      </div>

      <WaitlistDataTable signups={signups ?? []} />
    </div>
  );
}
