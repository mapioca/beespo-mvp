import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ReleaseNoteEditor } from "@/components/admin/release-notes/release-note-editor";

export default async function NewReleaseNotePage() {
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

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-zinc-100 mb-6">New Release Note</h1>
      <ReleaseNoteEditor />
    </div>
  );
}
