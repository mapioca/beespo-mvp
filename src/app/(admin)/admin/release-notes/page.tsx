import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReleaseNotesDataTable } from "@/components/admin/release-notes/release-notes-data-table";
import { Megaphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { ReleaseNote } from "@/types/release-notes";

export default async function AdminReleaseNotesPage() {
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

  const { data: notes } = await adminClient
    .from("release_notes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="h-6 w-6 text-zinc-400" />
            <h1 className="text-2xl font-bold text-zinc-100">
              Release Notes
            </h1>
          </div>
          <p className="text-zinc-400">
            Manage release notes and changelogs for users
          </p>
        </div>
        <Link href="/release-notes/new">
          <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">
            New Release Note
          </Button>
        </Link>
      </div>

      <ReleaseNotesDataTable notes={(notes || []) as unknown as ReleaseNote[]} />
    </div>
  );
}
